import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import api from './AxiosInterface';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Building2, MessageSquare, ArrowUpDown, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { Toolbar } from './toolbar';

interface Message {
  id: string;
  sender: 'applicant' | 'department';
  senderName: string;
  content: string;
  timestamp: string;
}

interface ComplaintDetail {
  id: string;
  title: string;
  category: string;
  content: string;
  status: 'RECEIVED' | 'RECOMMENDED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELED';
  submittedDate: string;
  lastUpdate?: string;
  department?: string;
  assignedTo?: string;
  messages: Message[];
}

interface LocationState {
  searchKeyword: string;
  startDate: string;
  endDate: string;
  sortBy: string;
  selectedStatus: string;
  currentPage: number;
}

const STATUS_LABELS = {
  RECEIVED: '접수됨',
  RECOMMENDED: '이관 대기중',
  IN_PROGRESS: '처리중',
  RESOLVED: '답변완료',
  CLOSED: '종결',
  CANCELED: '취소',
};

const STATUS_COLORS = {
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',
  RECOMMENDED: 'bg-purple-100 text-purple-700 border-purple-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-300',
  CANCELED: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function ComplaintDetail() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const savedState = location.state as LocationState;
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  const onGoBack = () => navigate('/applicant/complaints', { state: savedState });

  const fetchDetail = async () => {
    try {
      setIsLoading(true);

      const response = await api.get(`applicant/complaints/${id}`);
      const data = response.data;
      const allMessages: Message[] = [];

      // 원본 민원 내용 추가
      allMessages.push({
        id: 'orig-q-' + data.id,
        sender: 'applicant',
        senderName: '민원인(본인)',
        content: data.body,
        timestamp: new Date(data.createdAt).toLocaleString(),
      });

      // 원본 민원 답변 추가 (있을 경우)
      if (data.answer) {
        allMessages.push({
          id: 'orig-a-' + data.id,
          sender: 'department',
          senderName: data.departmentName || '담당부서',
          content: data.answer,
          timestamp: new Date(data.updatedAt).toLocaleString(),
        });
      }

      // 추가 문의 순회하며 추가
      if (data.children && data.children.length > 0) {
        data.children.forEach((child: any) => {
          // 추가 질문
          allMessages.push({
            id: 'child-q-' + child.id,
            sender: 'applicant',
            senderName: '민원인(본인)',
            content: child.body,
            timestamp: new Date(child.createdAt).toLocaleString(),
          });

          // 추가 질문에 대한 답변
          if (child.answer) {
            allMessages.push({
              id: 'child-a-' + child.id,
              sender: 'department',
              senderName: data.departmentName || '담당부서',
              content: child.answer,
              timestamp: new Date(child.updatedAt).toLocaleString(),
            });
          }
        });
      }

      setComplaint({
        id: data.id.toString(),
        title: data.title,
        category: data.category || '일반민원',
        content: data.body,
        status: data.status,
        submittedDate: new Date(data.createdAt).toLocaleDateString(),
        lastUpdate: data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : undefined,
        department: data.departmentName,
        assignedTo: data.officerName,
        messages: allMessages
      });
    } catch (error) {
      console.error("상세 정보 로드 실패:", error);
      Swal.fire('오류', '데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const handleCommentSubmit = async () => {

    const isPending = complaint?.status !== 'RESOLVED' && complaint?.status !== 'CLOSED';

    if (isPending) {
      Swal.fire({
        title: '답변 대기 중',
        text: '현재 진행 중인 문의에 대한 답변이 완료된 후 추가 문의를 하실 수 있습니다. 조금만 기다려주세요!',
        icon: 'warning',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: '확인'
      });
      return;
    }

    if (!newComment.trim()) return;

    try {
      await api.post(`applicant/complaints/${id}/comments`, {
        parentComplaintId: complaint?.id,
        title: `${complaint?.title}`,
        body: newComment
      });
      setNewComment('');
      Swal.fire('전송 완료', '추가 문의가 등록되었습니다.', 'success');
      fetchDetail();
    } catch (error) {
      Swal.fire('전송 실패', '의견 전송 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleCloseComplaint = async () => {
    const result = await Swal.fire({
      title: '민원을 종결하시겠습니까?',
      text: '종결 처리 후에는 추가 문의를 등록하실 수 없습니다.',
      icon: 'question',
      showCancelButton: true,
      cancelButtonColor: '#64748b',
      confirmButtonColor: '#e11d48',
      cancelButtonText: '취소',
      confirmButtonText: '종결하기',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        await api.patch(`applicant/complaints/${id}/close`);
        Swal.fire('종결 완료', '민원이 종결 처리되었습니다.', 'success');
        fetchDetail();
      } catch (error) {
        Swal.fire('오류', '종결 처리 중 에러가 발생했습니다.', 'error');
      }
    }
  };

  if (isLoading) return <div className="p-20 text-center">정보를 불러오는 중입니다...</div>;
  if (!complaint) return <div className="p-20 text-center">정보를 찾을 수 없습니다.</div>;

  const isClosed = complaint.status === 'CLOSED' || complaint.status === 'CANCELED';

  const deptMessages = complaint.messages.filter(m => m.sender === 'department');

  const formattedAnswerDate = deptMessages.length > 0
    ? (() => {
      const rawDate = deptMessages[0].timestamp;
      const dateParts = rawDate.match(/\d+/g);

      if (dateParts && dateParts.length >= 3) {
        const dateObj = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2])
        );

        return dateObj.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
      }
      return null;
    })()
    : null;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-y-auto font-sans">
      <Toolbar subTitle="민원 상세 내역 조회" />
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-10 py-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {complaint.title}
                </h2>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white text-gray-700 border border-gray-300 text-xs px-2.5 py-1 font-medium">
                    {complaint.category}
                  </Badge>
                  <Badge className={`border text-xs px-2.5 py-1 font-bold ${STATUS_COLORS[complaint.status]}`}>
                    {STATUS_LABELS[complaint.status]}
                  </Badge>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b ${isClosed ? 'bg-slate-200/50 border-slate-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">제출일</p>
                  <p className="text-sm font-semibold text-gray-900">{complaint.submittedDate}</p>
                </div>
              </div>


              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-blue-500 uppercase font-bold">답변일</p>
                  {formattedAnswerDate && (
                    <p className="text-sm font-semibold text-gray-900">{formattedAnswerDate}</p>
                  )}
                </div>
              </div>


              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">담당 부서</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {complaint.department || '부서 배정 중'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ArrowUpDown className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">최종 업데이트</p>
                  <p className="text-sm font-semibold text-gray-900">{complaint.lastUpdate || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Section Header */}
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">민원 내용 및 답변</h3>
                </div>

                {complaint.status !== 'CLOSED' && complaint.status !== 'CANCELED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloseComplaint}
                    className="flex items-center gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    민원 종결
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-gray-50 min-h-[400px]">
            {complaint.messages.map((message) => {
              const isMe = message.sender === 'applicant';

              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-sm font-semibold text-gray-700">
                        {message.senderName}
                      </span>
                      <span className="text-[10px] text-gray-400">{message.timestamp}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2 shadow-sm ${isMe
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                        }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {isClosed && (
              <div className="text-center py-12">
                <div className="inline-block bg-slate-100 border-2 border-slate-200 rounded-xl px-10 py-6">
                  <CheckCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-700 font-bold text-lg">종결된 민원입니다</p>
                  <p className="text-slate-500 text-sm mt-2">
                    해당 민원은 처리가 완료되어 더 이상 추가 문의를 하실 수 없습니다.<br />
                    새로운 문의가 있으시면 신규 민원을 등록해 주세요.
                  </p>
                </div>
              </div>
            )}

            {complaint.messages.filter(m => m.sender === 'department').length === 0 && (
              <div className="text-center py-8">
                <div className="inline-block bg-yellow-50 border-2 border-yellow-200 rounded-lg px-6 py-4">
                  <p className="text-yellow-800 font-medium">
                    아직 답변이 등록되지 않았습니다.
                  </p>
                  <p className="text-yellow-600 text-sm mt-1">
                    담당자가 확인 후 답변을 등록할 예정입니다.
                  </p>
                </div>
              </div>
            )}
          </div>
          {!isClosed ? (
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="추가 문의사항이나 의견이 있으시면 입력해주세요."
                  className="flex-1 min-h-[80px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
                <Button
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                  className="px-6 bg-blue-600 hover:bg-blue-700 h-[80px] shrink-0"
                >
                  전송
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                * 추가 문의 시 담당 부서 확인 후 순차적으로 답변드립니다.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-200 border-t border-slate-300 text-center">
              <p className="text-slate-600 text-sm font-medium">종결된 민원에는 답변을 추가할 수 없습니다.</p>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={onGoBack}
            variant="outline"
            className="h-12 px-8 text-base"
          >
            목록으로 돌아가기
          </Button>
        </div>
      </main >
    </div >
  );
}