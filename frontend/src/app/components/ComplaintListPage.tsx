import { useState, useEffect } from 'react';
import { 
  Search, X, User, UserCheck, Eye, Loader2, Sparkles, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Checkbox } from './ui/checkbox';
import { AgentComplaintApi, ComplaintDto } from '../../api/AgentComplaintApi';
import { toast } from 'sonner';
import { Card } from './ui/card';

interface ComplaintListPageProps {
  onViewDetail: (id: string) => void;
}

const statusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  NORMALIZED: { label: '정규화', color: 'bg-purple-100 text-purple-800' },
  RECOMMENDED: { label: '추천완료', color: 'bg-cyan-100 text-cyan-800' },
  IN_PROGRESS: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '처리완료', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-green-100 text-green-800' },
};

const tagMap: Record<string, string> = {
  악성: 'bg-red-100 text-red-700 border-red-300',
  반복: 'bg-orange-100 text-orange-700 border-orange-300',
  지역급증: 'bg-purple-100 text-purple-700 border-purple-300',
  키워드급증: 'bg-blue-100 text-blue-700 border-blue-300',
};

export function ComplaintListPage({ onViewDetail }: ComplaintListPageProps) {
  // 데이터 상태
  const [complaints, setComplaints] = useState<ComplaintDto[]>([]);
  const [loading, setLoading] = useState(true);

  // [신규] 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0); // [추가] 전체 개수 저장
  const pageSize = 10; 

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [includeIncidents, setIncludeIncidents] = useState(false);
  const [tagsOnly, setTagsOnly] = useState(false);

  // 선택된 민원 (우측 미리보기용)
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, includeIncidents, tagsOnly]);

  useEffect(() => {
    fetchData(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchData = async (page: number) => {
    try {
      setLoading(true);

      const params: any = {
        page: page,      
        size: pageSize,
      };

      if (searchQuery) params.keyword = searchQuery;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (includeIncidents) params.hasIncident = true;
      if (tagsOnly) params.hasTags = true;

      const data: any = await AgentComplaintApi.getAll(params);
      
      if (data && Array.isArray(data.content)) {
          setComplaints(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements); // [추가] 전체 개수 설정
      } else {
          setComplaints(Array.isArray(data) ? data : []);
          setTotalPages(1);
          setTotalElements(Array.isArray(data) ? data.length : 0);
      }
    } catch (error) {
      console.error("민원 목록 로딩 실패:", error);
      toast.error("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setCurrentPage(1); 
      fetchData(1);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setIncludeIncidents(false);
    setTagsOnly(false);
    setCurrentPage(1);
    fetchData(1);
  };

  const handleAssign = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await AgentComplaintApi.assign(id);
      toast.success("담당자로 배정되었습니다.");
      fetchData(currentPage); 
    } catch (error) {
      toast.error("배정 실패");
    }
  };

  const selectedComplaintData = complaints.find((c) => c.id === selectedComplaintId);

  // --- 페이징 UI 계산 로직 ---
  const pageGroupSize = 10;
  const currentGroup = Math.ceil(currentPage / pageGroupSize);
  const startPage = (currentGroup - 1) * pageGroupSize + 1;
  const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);
  
  const hasPrevGroup = startPage > 1;
  const hasNextGroup = endPage < totalPages;

  // [추가] "총 N건 중 n-m 표시" 계산 로직
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalElements);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${selectedComplaintId ? '' : ''}`}>
        
        {/* 상단 헤더 */}
        <div className="h-16 border-b border-border bg-card px-6 shadow-sm flex items-center gap-3 shrink-0">
          <h1 className="text-2.5xl font-bold text-slate-900">민원함</h1>
          <p className="text-sm text-slate-400 font-medium pt-1">내 부서 배정 민원</p>
        </div>

        {/* 테이블 및 필터 영역 */}
        {/* [수정 포인트] 간격 줄이기: p-6 -> px-6 pt-2 pb-6 (위쪽 패딩을 2로 줄임) */}
        <div className="flex-1 overflow-auto px-6 pt-0 pb-6 bg-slate-100/50 flex flex-col">
          
          {/* 필터 바 */}
          <div className="py-3 flex items-center gap-4 justify-left shrink-0">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제목, 내용 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 bg-input-background pr-8 w-64"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); fetchData(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button className='border-2' variant="outline" onClick={() => { setCurrentPage(1); fetchData(1); }}>검색</Button>

            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32 bg-input-background">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="RECEIVED">접수</SelectItem>
                  <SelectItem value="NORMALIZED">정규화</SelectItem>
                  <SelectItem value="IN_PROGRESS">처리중</SelectItem>
                  <SelectItem value="CLOSED">종결</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2 px-3 py-2 border rounded bg-input-background">
                <Checkbox
                  id="incidents"
                  checked={includeIncidents}
                  onCheckedChange={(checked) => setIncludeIncidents(checked as boolean)}
                />
                <label htmlFor="incidents" className="text-sm cursor-pointer select-none">
                  사건 포함
                </label>
              </div>

              <div className="flex items-center space-x-2 px-3 py-2 border rounded bg-input-background">
                <Checkbox
                  id="tags"
                  checked={tagsOnly}
                  onCheckedChange={(checked) => setTagsOnly(checked as boolean)}
                />
                <label htmlFor="tags" className="text-sm cursor-pointer select-none">
                  특이 태그만
                </label>
              </div>

              <Button variant="ghost" size="sm" className="ml-auto" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                필터 초기화
              </Button>
            </div>
                          {/* 전체 건수 표시 */}
              <div className="flex items-center h-10 ml-2"> 
                  <div className="h-4 w-px bg-slate-300 mr-4"></div> {/* 구분선 */}
                  <span className="text-sm font-medium text-slate-600 whitespace-nowrap pt-0.5"> 
                    총 <span className="text-blue-600 font-bold">{totalElements}</span>건
                  </span>
              </div>
          </div>

          {/* 테이블 카드 */}
          <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md bg-white rounded-md mb-4">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-300 border-b-2 z-10">
                  <TableRow>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">민원번호</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 border-r border-slate-400">제목</TableHead>
                    <TableHead className="w-[160px] text-center font-bold text-slate-900 border-r border-slate-400">접수일시</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900 border-r border-slate-400">상태</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">사건</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 border-r border-slate-400">특이태그</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 border-r border-slate-400">담당자</TableHead>
                    <TableHead className="text-center font-bold text-slate-900">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        접수된 민원이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    complaints.map((c) => (
                      <TableRow
                        key={c.id}
                        className={`cursor-pointer hover:bg-slate-100 ${selectedComplaintId === c.id ? 'bg-blue-50/80' : 'border-b border-slate-200'}`}
                        onClick={() => setSelectedComplaintId(c.id)}
                      >
                        <TableCell className="text-sm text-muted-foreground text-center font-mono">
                          {c.id}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[300px]">{c.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-center">
                          {c.receivedAt || '-'}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge className={statusMap[c.status]?.color || 'bg-gray-100'}>
                              {statusMap[c.status]?.label || c.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {c.incidentId ? (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {c.incidentId}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            {c.tags && c.tags.length > 0 ? (
                              c.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className={tagMap[tag] || 'bg-gray-100'}>
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {c.managerName ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border">
                                <User className="h-3 w-3 text-slate-500" />
                              </div>
                              <span className="text-sm font-medium text-slate-700">{c.managerName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">미지정</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!c.managerName && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 h-8 text-xs px-3"
                                onClick={(e) => handleAssign(e, c.id)}
                              >
                                <UserCheck className="h-3 w-3 mr-1.5" /> 담당하기
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs px-3 border border-slate-200"
                              onClick={(e) => { e.stopPropagation(); onViewDetail(String(c.id)); }}
                            >
                              <Eye className="h-3 w-3 mr-1.5" /> 열기
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* [신규] 하단 페이지네이션 및 정보 영역 */}
          {/* flex-col로 변경하여 버튼 아래에 텍스트가 오도록 배치 */}
          {totalPages > 0 && (
            <div className="flex flex-col items-center justify-center gap-2 pb-0 shrink-0">
              
              {/* 버튼 그룹 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!hasPrevGroup}
                  onClick={() => handlePageChange(startPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!hasNextGroup}
                  onClick={() => handlePageChange(endPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* [추가] 통계 텍스트 */}
              {/* <span className="text-xs text-slate-500 font-medium">
                총 {totalElements}건 중 {startRow}-{endRow} 표시
              </span> */}

            </div>
          )}

        </div>
      </div>

      {/* 우측 미리보기 패널 (기존과 동일) */}
      {selectedComplaintId && selectedComplaintData && (
        <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto">
          <div className="px-4 h-16 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">미리보기</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedComplaintId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">민원 ID</div>
              <div className="text-sm font-mono">{selectedComplaintData.id}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">사건 연결</div>
              {selectedComplaintData.incidentId ? (
                <Badge variant="secondary">{selectedComplaintData.incidentId}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">미연결</span>
              )}
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">제목</div>
              <div className="text-sm font-medium">{selectedComplaintData.title}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center"><Sparkles className="w-3 h-3 mr-1"/>AI 요약</div>
              <div className="text-sm p-3 bg-muted rounded border min-h-[80px]">
                {selectedComplaintData.neutralSummary ? (
                  <p className="leading-relaxed">{selectedComplaintData.neutralSummary}</p>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                    요약 내용 없음
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">위치</div>
                <div className="text-sm">{selectedComplaintData.addressText || '-'}</div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button className="w-full" onClick={() => onViewDetail(String(selectedComplaintData.id))}>
                <Eye className="w-4 h-4 mr-2" /> 상세 열기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}