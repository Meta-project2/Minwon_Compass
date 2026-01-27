import { useState, useMemo, useEffect, } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, RefreshCcw } from 'lucide-react';
import api from './AxiosInterface';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Toolbar } from './toolbar';

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

type SortOption = 'date-desc' | 'date-asc' | 'status' | 'title';

const SORT_LABELS: Record<SortOption, string> = {
  'date-desc': '최신순',
  'date-asc': '오래된순',
  'status': '상태별',
  'title': '제목순',
};

export default function PastComplaintsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const savedState = location.state as LocationState | null;

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
  const [searchKeyword, setSearchKeyword] = useState(savedState?.searchKeyword || '');
  const [startDate, setStartDate] = useState(savedState?.startDate || '');
  const [endDate, setEndDate] = useState(savedState?.endDate || '');
  const [sortBy, setSortBy] = useState<SortOption>(
    (savedState?.sortBy as SortOption) || 'date-desc'
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(savedState?.selectedStatus || 'ALL');
  const [searchTrigger, setSearchTrigger] = useState(0);

  const handleViewDetail = (id: string) => {
    navigate(`/applicant/complaints/${id}`, {
      state: {
        searchKeyword,
        startDate,
        endDate,
        sortBy,
        selectedStatus,
        currentPage
      }
    });
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
      cancelButtonColor: '#3085d6',
      confirmButtonColor: '#d33',
      cancelButtonText: '아니오',
      confirmButtonText: '네, 취하합니다',
      reverseButtons: true,
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
      allowOutsideClick: () => !Swal.isLoading()
    });

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

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filteredAndSortedComplaints = useMemo(() => {
    let filtered = [...complaints];

    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

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
  }, [complaints, searchTrigger, sortBy, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedComplaints.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentComplaints = filteredAndSortedComplaints.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const offset = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - offset && i <= currentPage + offset)
      ) {
        pageNumbers.push(i);
      } else if (
        i === currentPage - offset - 1 ||
        i === currentPage + offset + 1
      ) {
        pageNumbers.push('...');
      }
    }
    return [...new Set(pageNumbers)];
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSearch = () => {
    setSearchTrigger(prev => prev + 1);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">민원 내역을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden font-sans">
      <Toolbar subTitle="과거 민원 내역" />
      <main className="flex-1 max-w-[1700px] mx-auto px-10 py-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
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
              <Button
                onClick={handleSearch}
                className="bg-blue-700 hover:bg-blue-800 text-white h-10 px-6 font-bold text-sm flex items-center gap-2 rounded-lg"
              >
                조회 <Search className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setSearchKeyword(''); setStartDate(''); setEndDate(''); setSortBy('date-desc'); setSearchTrigger(0); }}
                className="h-10 px-3 text-gray-400 hover:text-gray-600"
              >
                <RefreshCcw className="w-4 h-4" />필터초기화
              </Button>
            </div>
          </div>
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
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
            {currentComplaints.length > 0 && (
              <div className="px-6 py-4 bg-gray-100 border-b-2 border-gray-300 flex items-center gap-4 text-sm font-bold text-gray-800 uppercase tracking-tight">
                <div className="w-16 shrink-0 text-center">번호</div>
                <div className="h-4 w-[1.5px] bg-gray-400 shrink-0" />

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
            {currentComplaints.length > 0 ? (
              <div className="divide-y-2 divide-gray-200">
                {currentComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="px-6 py-5 hover:bg-blue-50/30 transition-colors group flex items-center gap-4"
                  >
                    <div className="w-16 shrink-0 text-center text-sm font-mono text-gray-500">
                      {complaint.id}
                    </div>
                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />
                    <div className="flex-1 px-4 min-w-0">
                      <h3
                        className="text-base font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleViewDetail(complaint.id)}
                      >
                        {complaint.title}
                      </h3>
                    </div>
                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />
                    <div className="w-40 shrink-0 text-center text-base text-gray-700 font-medium">
                      {complaint.department || '미지정'}
                    </div>
                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />
                    <div className="w-32 shrink-0 text-center text-sm text-gray-600">
                      {complaint.submittedDate}
                    </div>
                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />
                    <div className="w-32 shrink-0 flex justify-center">
                      <Badge className={`px-3 py-1 text-[11px] font-bold border shadow-none rounded-md ${STATUS_COLORS[complaint.status]}`}>
                        {STATUS_LABELS[complaint.status]}
                      </Badge>
                    </div>
                    <div className="h-10 w-[1.5px] bg-gray-300 shrink-0" />
                    <div className="w-56 shrink-0 flex items-center gap-2 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={complaint.status === 'CLOSED' || complaint.status === 'CANCELED'}
                        className={`flex-1 h-9 font-bold text-xs transition-all ${complaint.status === 'CLOSED' || complaint.status === 'CANCELED'
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                          }`}
                        onClick={() => handleCancel(complaint.id)}
                      >
                        {complaint.status === 'CANCELED' ? '취하됨' : '취하'}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-800 hover:bg-blue-900 text-white h-9 font-bold text-xs shadow-sm active:scale-95 transition-all"
                        onClick={() => handleViewDetail(complaint.id)}
                      >
                        상세보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center">
                <p className="text-gray-500 text-xl font-bold">검색 조건에 맞는 민원이 없습니다.</p>
                <p className="text-gray-400 text-base mt-2">다른 검색어나 날짜 범위를 시도해보세요.</p>
              </div>
            )}
            <div className="bg-gray-50 px-6 py-5 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="h-10 px-4"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
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
