import { useEffect, useState } from 'react';
import { Toolbar } from './toolbar';
import { RecentComplaints } from './recent-complaints';
import { ResponseTimeStats } from './response-time-stats';
import { KeywordCloud } from './keyword-cloud';
import { useNavigate } from 'react-router-dom';
import api from './AxiosInterface';
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
  const [recentComplaints, setRecentComplaints] = useState<ComplaintDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('accessToken'));

  // 공통 인증 체크 로직
  const checkAuth = (action: () => void) => {
    if (!isLoggedIn) {
      Swal.fire({
        title: '로그인 필요',
        text: '이 기능을 이용하려면 로그인이 필요합니다.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '로그인 하러 가기',
        cancelButtonText: '나중에 하기'
      }).then((result) => {
        if (result.isConfirmed) navigate('/applicant/login');
      });
    } else {
      action();
    }
  };

  // 메인 화면에서 이동할 경우 auth 확인
  const handleViewComplaints = () => checkAuth(() => navigate('/applicant/complaints'));
  const handleNewComplaint = () => checkAuth(() => navigate('/applicant/complaints/form'));

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
        setIsLoggedIn(false); // 상태 업데이트
        setRecentComplaints([]); // 데이터 초기화
        Swal.fire(
          '로그아웃 완료',
          '성공적으로 로그아웃되었습니다.',
          'success'
        )
      }
    });
  };

  useEffect(() => {

    const fetchRecentComplaints = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        // 백엔드 API 호출 - 최근 3개의 민원 불러오기
        // 백엔드에서 만든 최신 3개 전용 API 호출
        const response = await api.get('/applicant/complaints/top3');
        setRecentComplaints(response.data);
      } catch (error) {
        console.error("최신 민원 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }

    };
    fetchRecentComplaints();
    // 빈 배열: 한 번만 실행, accessToken: 변경 시 재실행
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen bg-[#F4F7FB] overflow-hidden font-sans text-slate-900">
      <Toolbar
        isLoggedIn={isLoggedIn} // 로그인 상태 전달
        onViewComplaints={handleViewComplaints}
        onNewComplaint={handleNewComplaint}
        onLogout={handleLogout}
      />

      <main className="max-w-[1700px] mx-auto px-10 h-[calc(100vh-100px)] flex flex-col justify-center py-4">
        {/* 황금비 레이아웃: 좌(3) : 우(2) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full max-h-[850px]">

          {/* [좌측 섹션] 민원 TOP3 + 키워드 맵 (60%) */}
          <div className="lg:col-span-2 flex flex-col gap-8 h-full overflow-hidden">
            {/* 최근 민원 현황 */}
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 flex flex-col shrink-0 h-[340px]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <h3 className="text-lg font-bold text-gray-800">최근 민원 현황</h3>
                </div>
                <button
                  onClick={handleViewComplaints}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-full transition-colors shadow-sm flex items-center gap-1"
                >
                  민원 더 보기 +
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {isLoading ? (
                  <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : Array.isArray(recentComplaints) && recentComplaints.length > 0 ? (
                  /* 1. 민원이 1건이라도 있는 경우: 리스트 + 부족한 칸 채우기 */
                  <>
                    {/* 실제 민원 데이터 표시 (최대 3개) */}
                    {recentComplaints.slice(0, 3).map((complaint) => (
                      <div
                        key={complaint.id}
                        className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white transition-all cursor-pointer h-[64px] shrink-0"
                        onClick={() => checkAuth(() => navigate(`/applicant/complaints/${complaint.id}`))}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <span className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold text-white ${complaint.complaintStatus === 'ANSWERED' ? 'bg-green-500' :
                            complaint.complaintStatus === 'ASSIGNED' ? 'bg-blue-500' : 'bg-orange-500'
                            }`}>
                            {complaint.complaintStatus}
                          </span>
                          <h4 className="text-sm font-bold text-gray-800 group-hover:text-blue-600 truncate">
                            {complaint.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-gray-400">
                          <span className="text-[11px] font-medium">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    ))}

                    {/* 3건 미만일 때만 부족한 칸을 Placeholder로 채움 (1~2건일 때 작동) */}
                    {recentComplaints.length < 3 && [...Array(3 - recentComplaints.length)].map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        onClick={handleNewComplaint}
                        className="h-[64px] border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-xs hover:bg-gray-50 hover:border-blue-100 cursor-pointer transition-colors shrink-0"
                      >
                        <span className="opacity-60">+ 새 민원 추가</span>
                      </div>
                    ))}
                  </>
                ) : (
                  /* 2. 민원이 아예 없는 경우 (0건): 큰 안내 상자만 표시 */
                  <div
                    onClick={handleNewComplaint}
                    className="flex-1 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl">➕</span>
                    </div>
                    <p className="text-sm font-bold text-gray-500">첫 번째 민원을 작성해보세요</p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. 실시간 민원 키워드: flex-1을 사용하여 남는 아래쪽 모든 공간 차지 */}
            <section className="flex-1 bg-white/60 backdrop-blur-sm rounded-[40px] border border-blue-100/50 shadow-lg p-8 flex flex-col overflow-hidden min-h-0">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <span className="text-lg">🔍</span>
                <h3 className="text-lg font-bold text-gray-800">실시간 민원 키워드</h3>
              </div>
              <div className="flex-1 min-h-0 bg-gray-50 rounded-[24px] overflow-hidden">
                <KeywordCloud keywords={mockKeywords} />
              </div>
            </section>
          </div>

          {/* [우측 섹션] 통계 분석 (40%) */}
          <section className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-10 flex flex-col h-full">
              <div className="flex flex-col gap-1 mb-10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h3 className="text-lg font-bold text-gray-800 tracking-tight">지역 민원 처리 현황</h3>
                </div>
                <p className="text-xs text-gray-400 font-medium">분야별 행정 효율성 및 데이터 분석</p>
              </div>

              {/* 수정된 ResponseTimeStats 모듈 호출 */}
              <div className="flex-1 min-h-0">
                <ResponseTimeStats
                  data={mockResponseTimeData}
                  overallStats={mockOverallStats}
                />
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default ApplicantMainPage;