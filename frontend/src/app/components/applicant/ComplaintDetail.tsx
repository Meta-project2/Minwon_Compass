import { useState, useEffect } from 'react'; // useEffect 추가
import { useParams, useNavigate } from 'react-router-dom'; // 훅 추가
import api from './AxiosInterface'; // api 인스턴스 가져오기
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, Building2, User, MessageSquare, ArrowUpDown, Home, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

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
  status: 'RECEIVED' | 'NORMALIZED' | 'RECOMMENDED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELED';
  submittedDate: string;
  lastUpdate?: string;
  department?: string;
  assignedTo?: string;
  messages: Message[];
}

const STATUS_LABELS = {
  RECEIVED: '접수됨',
  NORMALIZED: '분류완료',
  RECOMMENDED: '부서추천',
  IN_PROGRESS: '처리중',
  RESOLVED: '답변완료',
  CLOSED: '종결',
  CANCELED: '취소/반려',
};

const STATUS_COLORS = {
  RECEIVED: 'bg-blue-50 text-blue-700 border-blue-200',      // 신규 접수: 청량한 블루
  NORMALIZED: 'bg-cyan-50 text-cyan-700 border-cyan-200',    // 분석 완료: 깨끗한 시안
  RECOMMENDED: 'bg-purple-50 text-purple-700 border-purple-200', // 부서 추천: 신비로운 퍼플
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',  // 처리중: 주의가 필요한 오렌지/앰버
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200', // 답변 완료: 신뢰의 그린
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-300',     // 종결: 차분한 그레이
  CANCELED: 'bg-rose-50 text-rose-700 border-rose-200',      // 취소/반려: 경고의 레드/로즈
};

export default function ComplaintDetail() {

  const { id } = useParams<{ id: string }>(); // URL에서 ID 추출
  const navigate = useNavigate();

  // 1. 상태 관리 추가
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  const onGoBack = () => navigate('/applicant/complaints');

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      // 백엔드 상세 조회 API 호출
      const response = await api.get(`applicant/complaints/${id}`);
      const data = response.data;

      // 0. 메시지 타임라인 구성
      const allMessages: Message[] = [];

      // 1. 원본 민원 내용 추가
      allMessages.push({
        id: 'orig-q-' + data.id,
        sender: 'applicant',
        senderName: '민원인(본인)',
        content: data.body,
        timestamp: new Date(data.createdAt).toLocaleString(),
      });

      // 2 원본 민원 답변 추가 (있을 경우)
      if (data.answer) {
        allMessages.push({
          id: 'orig-a-' + data.id,
          sender: 'department',
          senderName: data.departmentName || '담당부서',
          content: data.answer,
          timestamp: new Date(data.updatedAt).toLocaleString(),
        });
      }

      // 3. 추가 문의(children) 순회하며 추가
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

          // 추가 질문에 대한 답변 (있을 경우)
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
        assignedTo: data.officerName, // 담당자 이름 매핑
        messages: allMessages
      });
    } catch (error) {
      console.error("상세 정보 로드 실패:", error);
      Swal.fire('오류', '데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 데이터 Fetch 로직
  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  // 새로운 문의 사항을 입력하기 
  const handleCommentSubmit = async () => {
    // 메시지가 입력되지 않은 경우 return

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
      setNewComment(''); // 입력창 초기화
      Swal.fire('전송 완료', '추가 문의가 등록되었습니다.', 'success');
      // 이후 데이터 재호출(fetchDetail)을 통해 리스트 갱신
      fetchDetail();
    } catch (error) {
      Swal.fire('전송 실패', '의견 전송 중 오류가 발생했습니다.', 'error');
    }
  };

  // 3. 로딩 및 에러 처리
  if (isLoading) return <div className="p-20 text-center">정보를 불러오는 중입니다...</div>;
  if (!complaint) return <div className="p-20 text-center">정보를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 py-4 shrink-0 shadow-sm">
        <div className="max-w-[1700px] mx-auto px-10">
          <div className="flex items-center justify-between">
            {/* 좌측: 타이틀 (본문 시작 라인과 일치) */}
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">민원 상세 내역</h1>

            {/* 우측: 버튼 그룹 (본문 끝 라인과 일치) */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/applicant/main")}
                className="flex items-center gap-2 h-10 border-gray-200 text-gray-600"
              >
                <Home className="w-4 h-4" />
                홈으로
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/applicant/complaints')}
                className="flex items-center gap-2 h-10 border-gray-200 text-gray-600"
              >
                <FileText className="w-4 h-4" />
                과거 민원 보기
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Complaint Header Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-4"> {/* py-6에서 py-4로 축소 */}
              <div className="flex items-center justify-between">
                {/* 좌측: 제목 */}
                <h2 className="text-2xl font-bold text-gray-900">
                  {complaint.title}
                </h2>

                {/* 우측: 카테고리 및 상태 배지 (ID 제거) */}
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

            {/* Meta Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">제출일</p>
                  <p className="text-sm font-semibold text-gray-900">{complaint.submittedDate}</p>
                </div>
              </div>

              {/* 답변일 (추가됨) */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                <div>
                  <p className="text-xs text-blue-500 uppercase font-bold">답변일</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {complaint.lastUpdate || '대기 중'}
                  </p>
                </div>
              </div>

              {/* 담당 부서 (추가됨) */}
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">담당 부서</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {complaint.department || '부서 배정 중'}
                  </p>
                </div>
              </div>

              {/* 최종 업데이트 */}
              <div className="flex items-start gap-3">
                <ArrowUpDown className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">최종 업데이트</p>
                  <p className="text-sm font-semibold text-gray-900">{complaint.lastUpdate || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat-Style Messages Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Section Header */}
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2 text-gray-900">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-lg font-semibold">민원 내용 및 답변</h3>
              </div>
            </div>

            {/* 챗창 구현 */}
            <div className="p-6 space-y-6 bg-gray-50 min-h-[400px]">
              {complaint.messages.map((message) => {
                const isMe = message.sender === 'applicant'; // 내가 보낸 메시지인지 확인

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`} // 민원인 오른쪽(end)
                  >
                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>

                      {/* 이름과 시간 표시 */}
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-sm font-semibold text-gray-700">
                          {message.senderName}
                        </span>
                        <span className="text-[10px] text-gray-400">{message.timestamp}</span>
                      </div>

                      {/* 메시지 말풍선 */}
                      <div
                        className={`rounded-2xl px-4 py-2 shadow-sm ${isMe
                          ? 'bg-blue-600 text-white rounded-tr-none' // 내 말풍선: 파란색, 우측 상단 각짐
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none' // 상대방: 흰색, 좌측 상단 각짐
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

              {/* 아직 답변이 없을 경우 */}
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
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="추가 문의사항이나 의견이 있으시면 입력해주세요."
                  className="flex-1 min-h-[80px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
                <Button
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                  className="self-end h-full px-6 bg-blue-600 hover:bg-blue-700"
                >
                  전송
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                * 추가 문의 시 담당 부서 확인 후 순차적으로 답변드립니다.
              </p>
            </div>
          </div>

          {/* Back Button at Bottom */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={onGoBack}
              variant="outline"
              className="h-12 px-8 text-base"
            >
              목록으로 돌아가기
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}