import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, X, Eye, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface IncidentListPageProps {
  onViewDetail: (id: string) => void;
  savedPage?: number;
  onSavePage?: (page: number) => void;
}

interface IncidentResponse {
  id: string;
  originalId: number;
  title: string;
  status: 'OPEN' | 'CLOSED';
  complaintCount: number;
  openedAt: string;
  lastOccurred?: string;
}

const ITEMS_PER_PAGE = 10; 

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '대응중', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-600 border-slate-300' },
};

const cleanTitle = (rawTitle: string) => {
  if (!rawTitle) return "";
  return rawTitle.replace(/^\[.*?\]\s*/, '').split('(')[0].trim();
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return dateString.substring(0, 10);
};

export function IncidentListPage({ onViewDetail, savedPage = 1, onSavePage }: IncidentListPageProps) {
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const [page, setPage] = useState(savedPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (onSavePage) onSavePage(newPage);
  };

  const fetchIncidents = useCallback(async (pageParam: number) => {
    setLoading(true);
    try {
      const params: any = { page: pageParam - 1, size: ITEMS_PER_PAGE };
      if (searchQuery.trim()) params.search = searchQuery;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const response = await axios.get('/api/agent/incidents', { params });

      if (response.data && Array.isArray(response.data.content)) {
        setIncidents(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
      } else {
        setIncidents([]);
        setTotalElements(0);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageChange(1);
      fetchIncidents(1);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    handlePageChange(1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 10;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-border bg-card px-6 shadow-sm flex items-center gap-3 shrink-0">
          <h1 className="text-2.5xl font-bold text-slate-900">중복 민원</h1>
          <p className="text-sm text-slate-400 font-medium pt-1">연관된 민원들을 하나의 그룹으로 자동 관리합니다.</p>
        </div>

        <div className="flex-1 overflow-auto px-6 pt-0 pb-6 bg-slate-100/50 flex flex-col">
          <div className="py-3 flex items-center gap-4 justify-left shrink-0">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ID와 제목입력 .."
                  className="pl-9 bg-input-background pr-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); handlePageChange(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                )}
              </div>
              <Button className='border-2' variant="outline" onClick={() => { handlePageChange(1); fetchIncidents(1); }}>검색</Button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val); handlePageChange(1); }}>
                <SelectTrigger className="w-32 bg-input-background"><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="OPEN">대응중</SelectItem>
                  <SelectItem value="CLOSED">종결</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={resetFilters}><X className="h-4 w-4 mr-1" /> 필터 초기화</Button>
            </div>
            <div className="flex items-center h-10 ml-2"> 
              <div className="h-4 w-px bg-slate-300 mr-4"></div> 
              <span className="text-sm font-medium text-slate-600 whitespace-nowrap pt-0.5">총 <span className="text-blue-600 font-bold">{totalElements}</span>건</span>
            </div>
          </div>

          <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md bg-white rounded-md mb-4">
            <div className="flex-1 overflow-auto">
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 bg-slate-300 border-b-2 z-10">
                  <TableRow>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">ID</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 border-r border-slate-400">제목</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900 border-r border-slate-400">민원수</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900 border-r border-slate-400">상태</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">최초 발생일</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">최근 발생일</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400"><div className="flex justify-center items-center"><Loader2 className="animate-spin h-6 w-6 mr-2" /> 데이터 로드 중...</div></TableCell></TableRow>
                  ) : incidents.length > 0 ? (
                    incidents.map((incident) => (
                      <TableRow key={incident.id} className="cursor-pointer hover:bg-slate-100 border-b border-slate-200" onClick={() => onViewDetail(incident.id)}>
                        <TableCell className="text-sm text-muted-foreground text-center font-mono">{incident.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[400px] text-slate-800">{cleanTitle(incident.title)}</span>
                          </div>
                        </TableCell>
                        
                        {/* [수정] 민원수 라벨: '종결' 라벨과 같은 회색(Slate) 톤 적용 */}
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge className="bg-slate-100 text-slate-600 border-slate-300 border px-2.5 py-0.5 font-medium shadow-sm">
                              {incident.complaintCount}건
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge className={`${statusMap[incident.status]?.color} border px-2.5 py-0.5 text-xs font-medium`}>
                              {statusMap[incident.status]?.label}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground text-center">{formatDate(incident.openedAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground text-center">{formatDate(incident.lastOccurred)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Button size="sm" variant="ghost" className="h-8 text-xs px-3 border border-slate-300" onClick={(e) => { e.stopPropagation(); onViewDetail(incident.id); }}>
                              <Eye className="h-3 w-3 mr-1.5" /> 열기
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-20"><div className="flex flex-col items-center gap-2 text-slate-400"><AlertCircle className="h-8 w-8" /><span className="text-sm font-medium">검색 결과가 없습니다.</span></div></TableCell></TableRow>
                  )}
                  {/* 빈 줄 채우기 */}
                  {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - incidents.length) }).map((_, i) => (
                    <TableRow key={`empty-${i}`} className="h-[53px] border-b border-slate-50 hover:bg-transparent"><TableCell colSpan={7} /></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalElements > 0 && (
            <div className="flex flex-col items-center justify-center gap-2 pb-0 shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map(pageNum => (
                    <Button key={pageNum} variant={pageNum === page ? "default" : "ghost"} size="sm" className={`h-8 w-8 p-0 ${pageNum === page ? 'bg-blue-600 hover:bg-blue-700' : 'text-slate-600'}`} onClick={() => handlePageChange(pageNum)}>{pageNum}</Button>
                  ))}
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}