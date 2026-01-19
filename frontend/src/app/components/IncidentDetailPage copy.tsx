import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, Calendar, Users, Clock, Eye, AlertCircle, 
  Search, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';

interface IncidentDetailPageProps {
  incidentId: string;
  onBack: () => void;
  onViewComplaint: (id: string) => void;
}

interface IncidentDetailResponse {
  id: string;
  title: string;
  status: string;
  district: string;
  firstOccurred: string;
  lastOccurred: string;
  complaintCount: number;
  avgProcessTime: string;
  complaints: any[];
  keywords?: string[]; // [추가] 군집화 시 사용된 핵심 키워드들
}

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '발생', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '해결', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

const urgencyMap: Record<string, { label: string; color: string }> = {
  HIGH: { label: '높음', color: 'bg-red-100 text-red-700' },
  MEDIUM: { label: '보통', color: 'bg-orange-100 text-orange-700' },
  LOW: { label: '낮음', color: 'bg-slate-100 text-slate-700' },
};

const complaintStatusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  NORMALIZED: { label: '정규화', color: 'bg-purple-100 text-purple-800' },
  RECOMMENDED: { label: '추천완료', color: 'bg-cyan-100 text-cyan-800' },
  IN_PROGRESS: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  CLOSED: { label: '종결', color: 'bg-green-100 text-green-800' },
};

const ITEMS_PER_PAGE = 10;

// [수정] 대괄호 및 부서명 정보를 제거하여 순수 제목만 추출
const cleanTitle = (title: string) => title.replace(/\[.*?\]/g, '').trim();

export function IncidentDetailPage({ incidentId, onBack, onViewComplaint }: IncidentDetailPageProps) {
  const [incidentData, setIncidentData] = useState<IncidentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaintPage, setComplaintPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/agent/incidents/${incidentId}`);
        setIncidentData(response.data);
      } catch (error) {
        console.error("사건 상세 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    if (incidentId) fetchDetail();
  }, [incidentId]);

  const filteredComplaints = useMemo(() => {
    if (!incidentData) return [];
    return incidentData.complaints.filter(c => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [incidentData, searchQuery, statusFilter]);

  if (loading) return <div className="h-full flex items-center justify-center">로딩 중...</div>;
  if (!incidentData) return <div className="h-full flex items-center justify-center">데이터를 찾을 수 없습니다.</div>;

  const totalFiltered = filteredComplaints.length;
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
  const startIndex = (complaintPage - 1) * ITEMS_PER_PAGE;
  const visibleComplaints = filteredComplaints.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, complaintPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) startPage = Math.max(1, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    return pageNumbers;
  };

  return (
    <div className="h-full flex flex-col bg-slate-100/50">
      {/* 상단 헤더 영역 */}
      <div className="border-b border-border bg-card px-6 py-6 shadow-sm">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1">
            {/* [변경] 제목 영역: truncate를 제거하여 긴 제목도 모두 표시 */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                {cleanTitle(incidentData.title)}
              </h1>
              <Badge className={`${statusMap[incidentData.status]?.color} whitespace-nowrap mt-1`}>
                {statusMap[incidentData.status]?.label || incidentData.status}
              </Badge>
            </div>

            {/* [변경] 제목 아래 사건 번호(ID) 및 해시태그 키워드 배치 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shadow-sm">
              {incidentData.id}
             </span>
              <div className="flex gap-2">
                 {incidentData.keywords && incidentData.keywords.length > 0 ? (
                 // DB에서 온 진짜 키워드 (예: "방역") 출력
                  incidentData.keywords.map((kw, idx) => (
                    <span key={idx} className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                       # {kw}
                     </span>
                  ))
                 ) : (
                  // 키워드가 없을 경우
                  <span className="text-xs text-slate-400 italic"># 키워드 없음</span>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* 요약 카드 그리드 */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-5 w-5 text-blue-600" /><div><div className="text-[10px] uppercase font-bold text-slate-400">최초 발생</div><div className="text-sm font-semibold">{incidentData.firstOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-orange-600" /><div><div className="text-[10px] uppercase font-bold text-slate-400">최근 발생</div><div className="text-sm font-semibold">{incidentData.lastOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-purple-600" /><div><div className="text-[10px] uppercase font-bold text-slate-400">구성민원수</div><div className="text-sm font-semibold">{incidentData.complaintCount}건</div></div></CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-green-600" /><div><div className="text-[10px] uppercase font-bold text-slate-400">평균 처리시간</div><div className="text-sm font-semibold">{incidentData.avgProcessTime}</div></div></CardContent></Card>
        </div>
      </div>

      {/* 하단 리스트 영역 */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="ID 또는 제목 검색..." 
                className="pl-9 h-9" 
                value={searchQuery}
                onChange={(e) => {setSearchQuery(e.target.value); setComplaintPage(1);}}
              />
            </div>
            <select 
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none"
              value={statusFilter}
              onChange={(e) => {setStatusFilter(e.target.value); setComplaintPage(1);}}
            >
              <option value="ALL">전체 상태</option>
              <option value="RECEIVED">접수</option>
              <option value="IN_PROGRESS">처리중</option>
              <option value="CLOSED">종결</option>
            </select>
          </div>
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Filtered: {totalFiltered} Complaints
          </span>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-[120px]">민원 ID</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[180px]">접수일시</TableHead>
                  <TableHead className="w-[100px]">긴급도</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                  <TableHead className="text-right w-[100px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {visibleComplaints.length > 0 ? (
                  visibleComplaints.map((complaint) => (
                    <TableRow key={complaint.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs font-mono font-semibold text-slate-400">{complaint.id}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">{complaint.title}</TableCell>
                      <TableCell className="text-xs text-slate-400">{complaint.receivedAt}</TableCell>
                      <TableCell><Badge className={`${urgencyMap[complaint.urgency]?.color} border-none`}>{urgencyMap[complaint.urgency]?.label}</Badge></TableCell>
                      <TableCell><Badge className={`${complaintStatusMap[complaint.status]?.color} border-none`}>{complaintStatusMap[complaint.status]?.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onViewComplaint(complaint.originalId)}>
                          <Eye className="h-4 w-4 mr-1" /> 열기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400">일치하는 구성 민원이 없습니다.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* 하단 중앙 정렬 페이지네이션 영역 */}
          {totalFiltered > 0 && (
            <div className="border-t p-4 bg-white">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setComplaintPage(p => Math.max(1, p - 1))} 
                    disabled={complaintPage === 1} 
                    className="h-8 px-3"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> 이전
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map(pageNum => (
                      <Button 
                        key={pageNum} 
                        variant={pageNum === complaintPage ? "default" : "ghost"} 
                        size="sm" 
                        className={`h-8 w-8 p-0 ${pageNum === complaintPage ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                        onClick={() => setComplaintPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setComplaintPage(p => Math.min(totalPages, p + 1))} 
                    disabled={complaintPage === totalPages} 
                    className="h-8 px-3"
                  >
                    다음 <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, totalFiltered)} of {totalFiltered}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}