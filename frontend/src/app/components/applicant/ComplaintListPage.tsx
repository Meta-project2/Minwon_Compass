import { useState, useMemo, useEffect, } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Eye, Search, Calendar, ArrowUpDown, RefreshCcw } from 'lucide-react';
import api from './AxiosInterface';
import { useNavigate } from 'react-router-dom';

interface Complaint {
  id: string;
  title: string;
  category: string;
  content: string;
  status: 'received' | 'categorizing' | 'assigned' | 'answered' | 'closed';
  submittedDate: string;
  lastUpdate?: string;
  department?: string;
  assignedTo?: string;
}

interface PastComplaintsPageProps {
  complaints: Complaint[];
  onGoHome: () => void;
  onViewDetail: (complaintId: string) => void;
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

  const handleViewDetail = (id: string) => {
    navigate(`/applicant/complaints/${id}`);
  };

  // 2. API 호출 로직
  // 조회 버튼 클릭 시 필터를 적용하기 위한 '트리거' 상태 (실제 필터링 로직에 반영)
  const [searchTrigger, setSearchTrigger] = useState(0);

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('http://localhost:8080/api/applicant/complaints');
        const formattedData = response.data.map((item: any) => ({
          id: item.id.toString(),
          title: item.title,
          category: item.category || '미분류',
          content: item.body,
          status: item.status.toLowerCase(),
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
    fetchComplaints();
  }, []);

  // 필터 및 정렬 로직 (조회 버튼 클릭 시의 흐름을 위해 useMemo의 의존성 관리)
  const filteredAndSortedComplaints = useMemo(() => {
    let filtered = [...complaints];

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
  }, [complaints, searchTrigger, sortBy]); // searchTrigger가 변할 때만(조회 버튼 클릭) 필터링

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedComplaints.length / itemsPerPage));

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

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentComplaints = filteredAndSortedComplaints.slice(startIndex, endIndex);

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
                className="bg-gray-700 hover:bg-gray-800 text-white h-10 px-6 font-bold text-sm flex items-center gap-2 rounded-lg"
              >
                조회 <Search className="w-4 h-4" />
              </Button>

              {/* 초기화 버튼 */}
              <Button
                variant="ghost"
                onClick={() => { setSearchKeyword(''); setStartDate(''); setEndDate(''); setSortBy('date-desc'); setSearchTrigger(0); }}
                className="h-10 px-3 text-gray-400 hover:text-gray-600"
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-gray-700 text-base">
                  총 <span className="font-bold text-lg">{filteredAndSortedComplaints.length}</span>건의 민원
                  {filteredAndSortedComplaints.length !== complaints.length && (
                    <span className="text-gray-500 text-sm ml-2">
                      (전체 {complaints.length}건 중)
                    </span>
                  )}
                </p>
                {totalPages > 0 && (
                  <p className="text-gray-600 text-sm">
                    {currentPage} / {totalPages} 페이지
                  </p>
                )}
              </div>
            </div>

            {/* Complaints List */}
            {currentComplaints.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {currentComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="px-6 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-6">
                      {/* 좌측: ID + 제목 & 내용 (한 줄 압축) */}
                      <div className="flex-1 flex items-center gap-4 min-w-0">
                        <span className="text-xs font-mono text-gray-400 shrink-0 w-16">
                          {complaint.id}
                        </span>

                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <h3
                            className="text-sm font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 shrink-0 max-w-[40%]"
                            onClick={() => handleViewDetail(complaint.id)}
                          >
                            {complaint.title}
                          </h3>
                          <span className="text-gray-300 shrink-0">|</span>
                          <p className="text-sm text-gray-500 truncate flex-1">
                            {complaint.content}
                          </p>
                          {complaint.lastUpdate && (
                            <span className="shrink-0 text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">
                              NEW
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 중앙/우측: 메타 정보 (날짜, 부서) */}
                      <div className="hidden md:flex items-center gap-8 shrink-0 text-xs text-gray-400">
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-gray-500">{complaint.department || '미지정'}</span>
                          <span>{complaint.submittedDate}</span>
                        </div>
                      </div>

                      {/* 우측 끝: 상태 배지 + 상세보기 버튼 (수직 배치) */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[100px]">
                        <Button
                          onClick={() => handleViewDetail(complaint.id)}
                          size="sm"
                          className="bg-gray-900 hover:bg-gray-800 text-white h-8 w-full text-xs flex items-center justify-center gap-1"
                        >
                          상세보기
                        </Button>
                        <Badge className={`w-full justify-center border shadow-none text-[10px] py-0 px-2 h-5 ${STATUS_COLORS[complaint.status]}`}>
                          {STATUS_LABELS[complaint.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="p-12 text-center">
                <p className="text-gray-500 text-lg">검색 조건에 맞는 민원이 없습니다.</p>
                <p className="text-gray-400 text-sm mt-2">다른 검색어나 날짜 범위를 시도해보세요.</p>
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
