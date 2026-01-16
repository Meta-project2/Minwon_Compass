import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, X, Eye, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface IncidentListPageProps {
  onViewDetail: (id: string) => void;
}

interface IncidentResponse {
  id: string;
  originalId: number;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  complaintCount: number;
  openedAt: string;
  lastOccurred?: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '발생', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '해결', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

// [수정] 대괄호 제거 및 간결한 제목 변환
const cleanTitle = (rawTitle: string) => {
  if (!rawTitle) return "";
  return rawTitle.replace(/^\[.*?\]\s*/, '').split('(')[0].trim();
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return dateString.substring(0, 10);
};

export function IncidentListPage({ onViewDetail }: IncidentListPageProps) {
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const fetchIncidents = useCallback(async (pageParam: number) => {
    setLoading(true);
    try {
      const params: any = {
        page: pageParam - 1, 
        size: 10, 
      };
      if (searchQuery.trim()) params.search = searchQuery;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const response = await axios.get('/api/agent/incidents', { params });
      
      if (response.data && Array.isArray(response.data.content)) {
        setIncidents(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
      } else {
        setIncidents([]);
      }
    } catch (error) {
      console.error('데이터 호출 에러:', error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStatus]); 

  useEffect(() => {
    fetchIncidents(page);
  }, [page, fetchIncidents]);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) startPage = Math.max(1, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    return pageNumbers;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* 헤더 영역 */}
      <div className="border-b border-border bg-card px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">민원 중복</h1>
        <p className="text-sm text-slate-400 font-medium">연관된 민원들을 하나의 그룹으로 자동으로 묶어 관리합니다.</p>
      </div>

      {/* [수정] 간소화된 검색 및 필터 바 */}
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="민원 그룹 검색..."
              className="pl-9 h-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            />
          </div>
          <select 
            className="h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm outline-none"
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
          >
            <option value="all">전체 상태</option>
            <option value="OPEN">발생</option>
            <option value="IN_PROGRESS">대응중</option>
            <option value="RESOLVED">해결</option>
            <option value="CLOSED">종결</option>
          </select>
          <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => {setSearchQuery(''); setSelectedStatus('all'); setPage(1);}}>
            <X className="h-4 w-4 mr-1" /> 필터 초기화
          </Button>
        </div>
        <span className="text-xs font-medium text-slate-400 italic">총 {totalElements}건의 사건</span>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md bg-white">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-[120px]  text-center">사건 ID</TableHead>
                  <TableHead className=' text-center'>제목</TableHead>
                  <TableHead className="text-center w-[100px]">민원수</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                  <TableHead className="w-[120px]">최초 발생일</TableHead>
                  <TableHead className="w-[120px]">최근 발생일</TableHead>
                  <TableHead className="text-right w-[80px] text-center">상세보기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400">데이터 로드 중...</TableCell></TableRow>
                ) : incidents.length > 0 ? (
                  incidents.map((incident) => (
                    <TableRow 
                      key={incident.id} 
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors" 
                      onClick={() => onViewDetail(incident.id)}
                    >
                      <TableCell className="font-mono text-[11px] font-semibold text-slate-400">{incident.id}</TableCell>
                      <TableCell className="font-medium text-slate-800">{cleanTitle(incident.title)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-none">{incident.complaintCount}건</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusMap[incident.status]?.color} border-none`}>
                          {statusMap[incident.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(incident.openedAt)}</TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(incident.lastOccurred)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); onViewDetail(incident.id); }}>
                          <Eye className="h-4 w-4  text-center" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <AlertCircle className="h-8 w-8" />
                        <span className="text-sm font-medium">검색 결과가 없습니다.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* [수정] 중앙 정렬된 페이지네이션 */}
          {totalElements > 0 && (
            <div className="border-t p-4 bg-white">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">이전</Button>
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map(pageNum => (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "ghost"}
                        size="sm"
                        className={`h-8 w-8 p-0 ${pageNum === page ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8">다음</Button>
                </div>
                <span className="text-[10px] text-slate-300 font-medium italic">
                  총 {totalElements}건 중 {(page - 1) * 10 + 1}-{Math.min(page * 10, totalElements)} 표시
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}