import { useState, useMemo, useEffect, } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Eye, Search, Calendar, ArrowUpDown, RefreshCcw } from 'lucide-react';
import api from './AxiosInterface';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Complaint {
  id: string;
  title: string;
  category: string;
  content: string;
  status: 'RECEIVED' | 'RECOMMENDED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELED';
  submittedDate: string;
  lastUpdate?: string;
  department?: string;
  assignedTo?: string;
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
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',      // 신규 접수: 청량한 블루
  RECOMMENDED: 'bg-purple-100 text-purple-700 border-purple-200', // 부서 추천: 신비로운 퍼플
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',  // 처리중: 주의가 필요한 오렌지/앰버
  RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200', // 답변 완료: 신뢰의 그린
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-300',     // 종결: 차분한 그레이
  CANCELED: 'bg-rose-100 text-rose-700 border-rose-200',      // 취소/반려: 경고의 레드/로즈
};

type SortOption = 'date-desc' | 'date-asc' | 'status' | 'title';

const SORT_LABELS: Record<SortOption, string> = {
  'date-desc': '최신순',
  'date-asc': '오래된순',
  'status': '상태별',
  'title': '제목순',
};

export default function PastComplaintsPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  // 조회 버튼 클릭 시 필터를 적용하기 위한 '트리거' 상태 (실제 필터링 로직에 반영)
  const [searchTrigger, setSearchTrigger] = useState(0);

  const handleViewDetail = (id: string) => {
    navigate(`/applicant/complaints/${id}`);
  };

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/applicant/complaints');
      const formattedData = response.data.map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        category: item.category || '미분류',
        content: item.body,
        status: item.status,
        submittedDate: item.createdAt.split('T')[0],
        department: item.departmentName,
      }));
      setComplaints(formattedData);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    const result = await Swal.fire({
      title: '민원을 취하하시겠습니까?',
      text: '취하된 이후에도 제출하신 민원은 확인하실 수 있습니다.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '네, 취하합니다',
      cancelButtonText: '아니오',
      // 2. 확인 버튼 클릭 시 실행될 비동기 로직 (처리 중 상태 유지)
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await api.put(`/applicant/complaints/${id}`);
          return true;
        } catch (error) {
          Swal.showValidationMessage(`처리 중 오류가 발생했습니다: ${error}`);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading() // 로딩 중 바깥 클릭 방지
    });

    // 3. 처리 완료 후 최종 알림
    if (result.isConfirmed) {
      await Swal.fire({
        title: '취하 완료',
        text: '민원이 성공적으로 취하되었습니다.',
        icon: 'success',
        confirmButtonText: '확인'
      });
      fetchComplaints();
    }
  };

  const itemsPerPage = 10;

  // 2. API 호출 로직
  useEffect(() => {
    fetchComplaints();
  }, []);

  // 필터 및 정렬 로직 (조회 버튼 클릭 시의 흐름을 위해 useMemo의 의존성 관리)
  const filteredAndSortedComplaints = useMemo(() => {
    let filtered = [...complaints];

    // 상태 탭 필터링 추가
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    // 검색어 필터링
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(keyword) ||
        c.id.toLowerCase().includes(keyword)
      );
    }
    if (startDate) filtered = filtered.filter(c => c.submittedDate >= startDate);
    if (endDate) filtered = filtered.filter(c => c.submittedDate <= endDate);

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return b.submittedDate.localeCompare(a.submittedDate);
        case 'date-asc': return a.submittedDate.localeCompare(b.submittedDate);
        case 'status': return a.status.localeCompare(b.status);
        case 'title': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });
    return filtered;
  }, [complaints, searchTrigger, sortBy, selectedStatus]); // searchTrigger가 변할 때만(조회 버튼 클릭) 필터링

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedComplaints.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentComplaints = filteredAndSortedComplaints.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const offset = 2; // 현재 페이지 앞뒤로 보여줄 개수

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // 첫 페이지
        i === totalPages || // 마지막 페이지
        (i >= currentPage - offset && i <= currentPage + offset) // 현재 페이지 주변
      ) {
        pageNumbers.push(i);
      } else if (
        i === currentPage - offset - 1 ||
        i === currentPage + offset + 1
      ) {
        pageNumbers.push('...'); // 생략 기호
      }
    }
    // 중복 제거 (생략 기호가 여러 번 들어가는 것 방지)
    return [...new Set(pageNumbers)];
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSearch = () => {
    setSearchTrigger(prev => prev + 1);
    setCurrentPage(1);
  };

  const onGoHome = () => navigate('/applicant/main');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          {/* 간단한 스피너 애니메이션 */}
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">민원 내역을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 py-4 shrink-0 shadow-sm">
        <div className="max-w-[1700px] mx-auto px-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">과거 민원 내역</h1>
            <Button
              onClick={onGoHome}
              variant="outline"
              className="h-11 px-6 text-base"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1700px] mx-auto px-10 py-8">
        <div className="space-y-6">
          {/* [수정] Filters Section - 한 줄 구성 및 조회 버튼 추가 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">

              {/* 기간 설정 영역 */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-32 text-xs border-gray-200 bg-white"
                />
                <span className="text-gray-300">~</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 w-32 text-xs border-gray-200 bg-white"
                />
              </div>

              {/* 검색어 입력 영역 - 길이 조정 */}
              <div className="flex-1 min-w-[200px] max-w-[400px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="민원 번호 또는 제목 입력"
                  className="pl-9 h-10 text-sm border-gray-200 focus:ring-1 focus:ring-gray-300"
                />
              </div>

              {/* 정렬 드롭다운 */}
              <div className="relative">
                <Button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  variant="outline"
                  className="h-10 px-4 text-sm flex items-center gap-2 border-gray-200 bg-white"
                >
                  {SORT_LABELS[sortBy]} <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </Button>
                {showSortMenu && (
                  <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => { setSortBy(option); setShowSortMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors"
                      >
                        {SORT_LABELS[option]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 조회 버튼 - 이미지 참고 (회색 계열 디자인) */}
              <Button
                onClick={handleSearch}
                className="bg-blue-700 hover:bg-blue-800 text-white h-10 px-6 font-bold text-sm flex items-center gap-2 rounded-lg"
              >
                조회 <Search className="w-4 h-4" />
              </Button>

              {/* 초기화 버튼 */}
              <Button
                variant="ghost"
                onClick={() => { setSearchKeyword(''); setStartDate(''); setEndDate(''); setSortBy('date-desc'); setSearchTrigger(0); }}
                className="h-10 px-3 text-gray-400 hover:text-gray-600"
              >
                <RefreshCcw className="w-4 h-4" />필터초기화
              </Button>
            </div>
          </div>

          {/* 3. 상태 탭 (글자 크게) */}
          <div className="flex border-b-4 border-gray-200 bg-white rounded-t-3xl px-6">
            {['ALL', 'RECEIVED', 'RECOMMENDED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELED'].map((tab) => {
              const isActive = selectedStatus === tab;
              const count = tab === 'ALL' ? complaints.length : complaints.filter(c => c.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => { setSelectedStatus(tab); setCurrentPage(1); }}
                  className={`px-8 py-6 text-xl font-black transition-all relative ${isActive ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {tab === 'ALL' ? '전체' : STATUS_LABELS[tab as keyof typeof STATUS_LABELS]}
                  <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Results Summary */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
            {/* 컬럼 헤더 영역 - 글씨 크기 키움(text-sm/base), 구분선 강화 */}
            {currentComplaints.length > 0 && (
              <div className="px-6 py-4 bg-gray-100 border-b-2 border-gray-300 flex items-center gap-4 text-sm font-bold text-gray-800 uppercase tracking-tight">
                <div className="w-16 shrink-0 text-center">번호</div>
                <div className="h-4 w-[1.5px] bg-gray-400 shrink-0" /> {/* 더 진해진 구분선 */}

                <div className="flex-1 px-4 text-center">민원 제목</div>
                <div className="h-4 w-[1.5px] bg-gray-400 shrink-0" />

                <div className="w-40 shrink-0 text-center">담당부서</div>
                <div className="h-4 w-[1.5px] bg-gray-400 shrink-0" />

                <div className="w-32 shrink-0 text-center">접수일</div>
                <div className="h-4 w-[1.5px] bg-gray-400 shrink-0" />

                <div className="w-32 shrink-0 text-center">진행 상태</div>
                <div className="h-4 w-[1.5px] bg-gray-400 shrink-0" />

                <div className="w-56 shrink-0 text-center">관리</div>
              </div>
            )}

            {/* Complaints List - 본문 글씨 크기 확대(text-base), 행 높이 조절 */}
            {currentComplaints.length > 0 ? (
              <div className="divide-y-2 divide-gray-200"> {/* 행 간 구분선도 강화 */}
                {currentComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="px-6 py-5 hover:bg-blue-50/30 transition-colors group flex items-center gap-4"
                  >
                    {/* 1. 번호 */}
                    <div className="w-16 shrink-0 text-center text-sm font-mono text-gray-500">
                      {complaint.id}
                    </div>

                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" /> {/* 세로 구분선 진하게 */}

                    {/* 2. 민원 제목 - 글씨 크기 확대 */}
                    <div className="flex-1 px-4 min-w-0">
                      <h3
                        className="text-base font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleViewDetail(complaint.id)}
                      >
                        {complaint.title}
                      </h3>
                    </div>

                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />

                    {/* 3. 담당부서 */}
                    <div className="w-40 shrink-0 text-center text-base text-gray-700 font-medium">
                      {complaint.department || '미지정'}
                    </div>

                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />

                    {/* 4. 접수일 */}
                    <div className="w-32 shrink-0 text-center text-sm text-gray-600">
                      {complaint.submittedDate}
                    </div>

                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />

                    {/* 5. 진행 상태 - 라벨을 여기로 이동 */}
                    <div className="w-32 shrink-0 flex justify-center">
                      <Badge className={`px-3 py-1 text-[11px] font-bold border shadow-none rounded-md ${STATUS_COLORS[complaint.status]}`}>
                        {STATUS_LABELS[complaint.status]}
                      </Badge>
                    </div>

                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />

                    {/* 6. 관리 버튼 (취하, 상세보기) */}
                    <div className="w-56 shrink-0 flex items-center gap-2 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9 font-bold text-xs"
                        onClick={() => handleCancel(complaint.id)}
                      >
                        취하
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-800 hover:bg-blue-900 text-white h-9 font-bold text-xs"
                        onClick={() => handleViewDetail(complaint.id)}
                      >
                        상세보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="p-20 text-center">
                <p className="text-gray-500 text-xl font-bold">검색 조건에 맞는 민원이 없습니다.</p>
                <p className="text-gray-400 text-base mt-2">다른 검색어나 날짜 범위를 시도해보세요.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-5 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2">
                {/* 이전 페이지 버튼 */}
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="h-10 px-4"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                {/* [수정] 유동적인 페이지 번호 렌더링 */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }

                    return (
                      <Button
                        key={`page-${pageNum}`}
                        onClick={() => goToPage(pageNum as number)}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        className={`h-10 w-10 ${currentPage === pageNum
                          ? 'bg-gray-900 hover:bg-gray-800 text-white font-bold shadow-md'
                          : 'hover:bg-gray-100 text-gray-600'
                          } transition-all`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                {/* 다음 페이지 버튼 */}
                <Button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="h-10 px-4"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
