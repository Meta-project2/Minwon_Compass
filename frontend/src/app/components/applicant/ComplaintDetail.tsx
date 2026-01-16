import { useState, useEffect } from 'react'; // useEffect 추가
import { useParams, useNavigate } from 'react-router-dom'; // 훅 추가
import api from './AxiosInterface'; // api 인스턴스 가져오기
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, Building2, User, MessageSquare, ArrowUpDown, Home, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

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
  status: 'received' | 'categorizing' | 'assigned' | 'answered' | 'closed';
  submittedDate: string;
  lastUpdate?: string;
  department?: string;
  assignedTo?: string;
  messages: Message[];
}

const STATUS_LABELS = {
  received: '접수됨',
  categorizing: '분류중',
  assigned: '담당자 배정',
  answered: '답변 완료',
  closed: '처리 완료',
};

const STATUS_COLORS = {
  received: 'bg-blue-100 text-blue-700 border-blue-300',
  categorizing: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  assigned: 'bg-purple-100 text-purple-700 border-purple-300',
  answered: 'bg-green-100 text-green-700 border-green-300',
  closed: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function ComplaintDetail() {

  const { id } = useParams<{ id: string }>(); // URL에서 ID 추출
  const navigate = useNavigate();

  // 1. 상태 관리 추가
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  const onGoBack = () => navigate('/applicant/complaints');

  // 2. 데이터 Fetch 로직
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        // 백엔드 상세 조회 API 호출
        const response = await api.get(`http://localhost:8080/api/applicant/complaints/${id}`);
        const data = response.data;

        // API 데이터를 화면 구조에 맞게 변환 (메시지 배열 생성)
        const messages: Message[] = [
          {
            id: 'q-' + data.id,
            sender: 'applicant',
            senderName: '민원인(본인)',
            content: data.body,
            timestamp: data.createdAt?.split('T')[0] || '',
          }
        ];

        // 답변이 있는 경우 답변 메시지 추가
        if (data.answer) {
          messages.push({
            id: 'a-' + data.id,
            sender: 'department',
            senderName: data.departmentName || '담당부서',
            content: data.answer,
            timestamp: data.updatedAt?.split('T')[0] || '',
          });
        }

        setComplaint({
          id: data.id.toString(),
          title: data.title,
          category: data.category || '일반민원',
          content: data.body,
          status: data.status.toLowerCase(),
          submittedDate: data.createdAt?.split('T')[0] || '',
          lastUpdate: data.updatedAt?.split('T')[0],
          department: data.departmentName,
          assignedTo: data.officerName, // 담당자 이름 매핑
          messages: messages
        });
      } catch (error) {
        console.error("상세 정보 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchDetail();
  }, [id]);

  const handleCommentSubmit = async () => {
    try {
      await api.post(`/api/applicant/complaints/${id}/comments`, {
        content: newComment
      });
      setNewComment(''); // 입력창 초기화
      // 이후 데이터 재호출(fetchDetail)을 통해 리스트 갱신
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
            {/* Title Section */}
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex-1">
                    {complaint.title}
                  </h2>
                  <span className="text-gray-500 text-sm font-medium">
                    {complaint.id}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-white text-gray-700 border border-gray-300 text-sm px-3 py-1.5">
                    {complaint.category}
                  </Badge>
                  <Badge className={`border text-sm px-3 py-1.5 ${STATUS_COLORS[complaint.status]}`}>
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

            {/* Messages Container */}
            <div className="p-6 space-y-6 bg-gray-50 min-h-[400px]">
              {complaint.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'applicant' ? 'justify-start' : 'justify-end'
                    }`}
                >
                  <div
                    className={`max-w-[75%] ${message.sender === 'applicant' ? 'items-start' : 'items-end'
                      }`}
                  >
                    {/* Sender Name and Timestamp */}
                    <div
                      className={`flex items-center gap-2 mb-2 ${message.sender === 'applicant' ? 'justify-start' : 'justify-end'
                        }`}
                    >
                      <span
                        className={`text-sm font-semibold ${message.sender === 'applicant'
                          ? 'text-gray-700'
                          : 'text-gray-700'
                          }`}
                      >
                        {message.senderName}
                      </span>
                      <span className="text-xs text-gray-500">{message.timestamp}</span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-5 py-4 shadow-sm ${message.sender === 'applicant'
                        ? 'bg-white border-2 border-gray-200 rounded-tl-sm'
                        : 'bg-gray-900 text-white rounded-tr-sm'
                        }`}
                    >
                      <p
                        className={`text-base leading-relaxed whitespace-pre-wrap ${message.sender === 'applicant' ? 'text-gray-800' : 'text-white'
                          }`}
                      >
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* No replies yet message */}
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