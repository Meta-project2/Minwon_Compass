import { useEffect, useState } from 'react';
import { Toolbar } from './toolbar';
import { RecentComplaints } from './recent-complaints';
import { ResponseTimeStats } from './response-time-stats';
import { KeywordCloud } from './keyword-cloud';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

interface ComplaintDto {
  id: number;
  title: string;
  complaintStatus: string; // status -> complaintStatus
  createdAt: string;       // submittedDate -> createdAt
}

// Mock data for response time statistics
const mockResponseTimeData = [
  { category: '도로/교통', avgDays: 3.2 },
  { category: '환경/위생', avgDays: 5.1 },
  { category: '공원/시설', avgDays: 4.5 },
  { category: '안전/치안', avgDays: 2.8 },
  { category: '기타', avgDays: 6.3 },
];

const mockOverallStats = {
  averageResponseTime: 4.4,
  fastestCategory: '안전/치안',
  improvementRate: 12,
};

// Mock data for keywords
const mockKeywords = [
  { text: '가로등', value: 45 },
  { text: '주정차', value: 38 },
  { text: '포트홀', value: 32 },
  { text: '쓰레기', value: 28 },
  { text: '소음', value: 25 },
  { text: '교통', value: 22 },
  { text: '안전', value: 20 },
  { text: '보수', value: 18 },
  { text: '보도', value: 15 },
  { text: '공원', value: 12 },
  { text: '하수구', value: 10 },
  { text: '가로수', value: 8 },
  { text: '공사', value: 7 },
  { text: '불법', value: 6 },
];

const ApplicantMainPage = () => {

  const navigate = useNavigate();

  const handleViewComplaints = () => {
    console.log('과거 민원 보기');
    navigate('/applicant/complaints');
    // Navigate to complaints list view
  };

  const handleNewComplaint = () => {
    console.log('새 민원 작성');
    navigate('/applicant/complaints/new');
    // Navigate to new complaint form
  };

  const handleLogout = () => {
    Swal.fire({
      title: '로그아웃',
      text: "정말 로그아웃 하시겠습니까?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: '로그아웃',
      cancelButtonText: '취소'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('accessToken');
        Swal.fire(
          '로그아웃 완료',
          '성공적으로 로그아웃되었습니다.',
          'success'
        ).then(() => {
          navigate('/applicant/login');
        });
      }
    });
  };

  const [recentComplaints, setRecentComplaints] = useState<ComplaintDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {

    const token = localStorage.getItem('accessToken');
    if (!token) {
      Swal.fire({
        title: '로그인 필요',
        text: '민원 서비스를 이용하기 위해서는 로그인이 필요합니다!',
        icon: 'warning',
        confirmButtonText: '로그인 하러 가기'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/applicant/login');
        }
      });
      return;
    }

    const fetchRecentComplaints = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        // 백엔드 API 호출 - 최근 3개의 민원 불러오기
        // 백엔드에서 만든 최신 3개 전용 API 호출
        const response = await axios.get('http://localhost:8080/api/applicant/complaints/top3', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setRecentComplaints(response.data);
      } catch (error) {
        console.error("최신 민원 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }

    };
    fetchRecentComplaints();
    // 빈 배열: 한 번만 실행, accessToken: 변경 시 재실행
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      <Toolbar
        onViewComplaints={handleViewComplaints}
        onNewComplaint={handleNewComplaint}
        onLogout={handleLogout}
      />

      <main className="max-w-[1600px] mx-auto px-6 h-[calc(100vh-100px)] flex flex-col justify-center py-4">
        {/* 메인 그리드 컨테이너: 좌(3) : 우(2) 비율로 피드백 반영 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full max-h-[820px]">

          {/* [좌측 섹션] 민원 TOP3 + 키워드 맵 (60% 비중) */}
          <div className="lg:col-span-3 flex flex-col gap-6 h-full">

            {/* 상단: 최근 민원 현황 (가로형 리스트로 압축) */}
            <section className="flex-[1.1] bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <h3 className="text-lg font-bold text-gray-800">최근 민원 현황</h3>
                </div>
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full">TOP 3</span>
              </div>

              <div className="flex-1 flex flex-col gap-2.5 min-h-0">
                {isLoading ? (
                  <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : Array.isArray(recentComplaints) && recentComplaints.length > 0 ? (
                  <>
                    {/* TypeError 방지를 위해 slice 전 Array.isArray 확인 필수 */}
                    {recentComplaints.slice(0, 3).map((complaint) => (
                      <div
                        key={complaint.id}
                        className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white transition-all cursor-pointer shrink-0"
                        onClick={() => navigate(`/applicant/complaints/${complaint.id}`)}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold text-white ${complaint.complaintStatus === 'ANSWERED' ? 'bg-green-500' :
                              complaint.complaintStatus === 'ASSIGNED' ? 'bg-blue-500' : 'bg-orange-500'
                            }`}>
                            {complaint.complaintStatus}
                          </span>
                          <h4 className="text-sm font-bold text-gray-800 group-hover:text-blue-600 truncate">
                            {complaint.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-gray-400">
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-gray-300 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    ))}
                    {/* 3건 미만 시 Placeholder (높이 최소화) */}
                    {recentComplaints.length < 3 && [...Array(3 - recentComplaints.length)].map((_, i) => (
                      <div key={i} onClick={handleNewComplaint} className="flex-1 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-xs hover:bg-gray-50 cursor-pointer">
                        + 새 민원 추가
                      </div>
                    ))}
                  </>
                ) : (
                  <div onClick={handleNewComplaint} className="flex-1 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50">
                    <span className="text-2xl mb-1">➕</span>
                    <p className="text-xs font-bold">첫 번째 민원을 작성해보세요</p>
                  </div>
                )}
              </div>
            </section>

            {/* 하단: 실시간 민원 키워드 (좌측 배치) */}
            <section className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <span className="text-lg">🔍</span>
                <h3 className="text-lg font-bold text-gray-800">실시간 민원 키워드</h3>
              </div>
              <div className="flex-1 min-h-0 bg-gray-50 rounded-2xl flex items-center justify-center p-2">
                <KeywordCloud keywords={mockKeywords} />
              </div>
            </section>
          </div>

          {/* [우측 섹션] 지역 민원 처리 현황 (파이 차트 강조 - 40% 비중) */}
          <section className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-8 flex flex-col h-full">
              <div className="flex flex-col gap-1 mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h3 className="text-lg font-bold text-gray-800">지역 민원 처리 현황</h3>
                </div>
                <p className="text-xs text-gray-400">최근 3개월 기준 분야별 처리 데이터</p>
              </div>

              {/* 차트 영역의 크기를 최대로 확보 */}
              <div className="flex-1 min-h-0 flex flex-col justify-center transform scale-105 lg:scale-110">
                <ResponseTimeStats
                  data={mockResponseTimeData}
                  overallStats={mockOverallStats}
                />
              </div>

              {/* 하단 지표 요약 (우측 영역 하단에 밀착) */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-50 shrink-0">
                <div className="p-4 bg-blue-50/50 rounded-2xl text-center">
                  <p className="text-[10px] text-blue-500 font-bold mb-1">평균 처리 속도</p>
                  <p className="text-lg font-black text-blue-900">4.4일</p>
                </div>
                <div className="p-4 bg-purple-50/50 rounded-2xl text-center">
                  <p className="text-[10px] text-purple-500 font-bold mb-1">최단 처리 분야</p>
                  <p className="text-lg font-black text-purple-900">안전/치안</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default ApplicantMainPage;