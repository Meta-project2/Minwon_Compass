import { useState, useEffect } from 'react';
import { Search, X, CheckCircle, XCircle, AlertCircle, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import { AgentComplaintApi, ComplaintRerouteResponse } from '../../api/AgentComplaintApi';
import { springApi } from '../../lib/springApi';

// Props 정의
interface RerouteRequestsPageProps {
  userRole?: 'agent' | 'admin' | null;
}

// 상태별 뱃지 스타일
const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  APPROVED: { label: '승인', color: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-800 border-red-200' },
  CANCELED: { label: '취소', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

// 날짜 포맷 (YYYY-MM-DD HH:mm)
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function RerouteRequestsPage({ userRole }: RerouteRequestsPageProps) {
  // --- States ---
  const [requests, setRequests] = useState<ComplaintRerouteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedOriginDept, setSelectedOriginDept] = useState<string>('all');
  const [selectedTargetDept, setSelectedTargetDept] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Detail View
  const [selectedRequest, setSelectedRequest] = useState<ComplaintRerouteResponse | null>(null);

  // Dialog Actions
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  // --- API 호출 ---
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        page: page,
        size: pageSize,
        status: selectedStatus === 'all' ? null : selectedStatus,
        keyword: searchQuery || null,
        originDeptId: selectedOriginDept === 'all' ? null : Number(selectedOriginDept),
        targetDeptId: selectedTargetDept === 'all' ? null : Number(selectedTargetDept),
      };

      const response = await AgentComplaintApi.getReroutes(params);

      if (response && response.content) {
        setRequests(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      } else {
        setRequests([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (error) {
      console.error("Failed to fetch reroutes:", error);
      setRequests([]);
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 필터 변경 시 페이지 1로 초기화
  useEffect(() => {
    setPage(1);
  }, [selectedStatus, selectedOriginDept, selectedTargetDept]);

  // 페이지나 필터 값이 바뀔 때 데이터 조회
  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedStatus, selectedOriginDept, selectedTargetDept]);

  const handleSearch = () => {
    setPage(1);
    fetchRequests();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedOriginDept('all');
    setSelectedTargetDept('all');
    setPage(1);
  };

  // --- 승인/반려 핸들러 ---
  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await springApi.post(`/api/admin/complaints/reroutes/${selectedRequest.rerouteId}/approve`);
      toast.success('이관이 승인되었습니다.');
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      toast.error('승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      toast.error('반려 사유를 입력해주세요');
      return;
    }
    try {
      await springApi.post(`/api/admin/complaints/reroutes/${selectedRequest.rerouteId}/reject`);
      toast.success('반려 처리되었습니다');
      setShowRejectionDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      toast.error('반려 처리에 실패했습니다.');
    }
  };

  // AI 추천 데이터 파싱
  const getAiRecommendations = (request: ComplaintRerouteResponse) => {
    try {
      if (!request.aiRoutingRank) return [];
      const data = typeof request.aiRoutingRank === 'string'
        ? JSON.parse(request.aiRoutingRank)
        : request.aiRoutingRank;
      return data.recommendations || [];
    } catch (e) {
      return [];
    }
  };

  // --- 페이지네이션 계산 로직 ---
  const pageGroupSize = 10;
  const currentGroup = Math.ceil(page / pageGroupSize);
  const startPage = (currentGroup - 1) * pageGroupSize + 1;
  const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);
  
  const hasPrevGroup = startPage > 1;
  const hasNextGroup = endPage < totalPages;

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  // ★ 2. 토글 로직 구현: 같은 행 클릭 시 닫기
  const handleRowClick = (request: ComplaintRerouteResponse) => {
    if (selectedRequest?.rerouteId === request.rerouteId) {
      setSelectedRequest(null);
    } else {
      setSelectedRequest(request);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-100/50">
      {/* 1. Main Content */}
      <div className="flex-1 flex flex-col h-full">

        {/* Header Area */}
        <div className="h-16 border-b border-border bg-card px-6 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">재이관 요청함</h1>
            <p className="text-sm text-slate-400 font-medium pt-1">부서 간 민원 이관 승인/반려 관리</p>
          </div>
        </div>

        {/* Filter Area */}
        <div className="px-6 pt-0 pb-0 py-4 flex-col bg-slate-100/50 shrink-0">
          <div className="py-3 flex items-center gap-4 justify-left">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제목, 요청자, 민원번호 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 bg-input-background pr-8 w-105"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleSearch} variant="outline" className="border-2">
                검색
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32 bg-input-background"><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="PENDING">대기</SelectItem>
                  <SelectItem value="APPROVED">승인</SelectItem>
                  <SelectItem value="REJECTED">반려</SelectItem>
                </SelectContent>
              </Select>

              {/* 현재 부서 필터 */}
              <Select value={selectedOriginDept} onValueChange={setSelectedOriginDept}>
                <SelectTrigger className="w-36 bg-input-background"><SelectValue placeholder="현재 부서" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  <SelectItem value="3">교통행정과</SelectItem>
                  <SelectItem value="4">교통안전과</SelectItem>
                </SelectContent>
              </Select>

              {/* 희망 부서 필터 */}
              <Select value={selectedTargetDept} onValueChange={setSelectedTargetDept}>
                <SelectTrigger className="w-36 bg-input-background"><SelectValue placeholder="희망 부서" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  <SelectItem value="3">교통행정과</SelectItem>
                  <SelectItem value="4">교통안전과</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> 필터 초기화
              </Button>
            </div>
            
            <div className="flex items-center h-10 ml-2"> 
                <div className="h-4 w-px bg-slate-300 mr-4"></div>
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap pt-0.5"> 
                  총 <span className="text-blue-600 font-bold">{totalElements.toLocaleString()}</span>건
                </span>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col">
          <Card className="flex-1 flex flex-col border-none shadow-md bg-white rounded-md overflow-hidden mb-4">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-300 border-b-2 z-10">
                  <TableRow>
                    <TableHead className="w-[150px] text-center font-bold text-slate-900 border-r border-slate-400">요청일시</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">민원 번호</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 border-r border-slate-400">제목</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">현재부서</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">희망부서</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900 border-r border-slate-400">요청자</TableHead>
                    <TableHead className="w-[90px] text-center font-bold text-slate-900 border-r border-slate-400">상태</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">데이터를 불러오는 중입니다...</TableCell></TableRow>
                  ) : (!requests || requests.length === 0) ? (
                    <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">요청 내역이 없습니다.</TableCell></TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow
                        key={request.rerouteId}
                        className={`cursor-pointer hover:bg-slate-100 border-b border-slate-200 transition-colors ${
                          selectedRequest?.rerouteId === request.rerouteId ? 'bg-blue-50/80' : ''
                        }`}
                        onClick={() => handleRowClick(request)}
                      >
                        <TableCell className="text-sm text-slate-500 text-center font-mono">
                          {formatDate(request.requestedAt)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700 text-center font-mono">
                          {request.complaintId}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-slate-800 line-clamp-1">{request.complaintTitle}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-white font-normal text-slate-600 border-slate-200">{request.currentDeptName}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-white font-normal text-slate-600 border-slate-200">{request.targetDeptName}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-center text-slate-600">
                          {request.requesterName}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge variant="outline" className={`font-medium ${statusMap[request.status]?.color}`}>
                              {statusMap[request.status]?.label || request.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {/* ★ 1. 관리 버튼: 테두리 추가 및 '검토' 텍스트로 변경 */}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-xs px-3 border border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all"
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1.5" /> 검토
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex flex-col items-center justify-center gap-2 pb-0 shrink-0">
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
                    variant={page === pageNum ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${page === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}`}
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
            </div>
          )}

        </div>
      </div>

      {/* Right Fixed Panel (Review Detail) */}
      {selectedRequest && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
          <div className="px-5 h-16 border-b border-border flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
            <h3 className="text-base font-bold text-slate-800">재이관 검토</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={() => setSelectedRequest(null)}>
              <X className="h-4 w-4 text-slate-500" />
            </Button>
          </div>

          <div className="p-5 space-y-4"> 
            
            {/* 민원 정보 카드  */}
            <Card className="shadow-sm border-slate-200 overflow-hidden gap-3">
              <CardHeader className="py-2 px-4 !pb-0 bg-slate-50 border-b border-slate-100"> {/* py-3 -> py-2 */}
                <CardTitle className="text-sm font-bold text-slate-700">민원 정보</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 !pb-3 space-y-1.5 text-sm"> {/* pb-4 -> pb-3, space-y-3 -> space-y-1.5 */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">민원 번호</span>
                  <span className="font-mono font-medium text-slate-800">{selectedRequest.complaintId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">업무군</span>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none px-2 py-0 h-5">{selectedRequest.category || '일반 민원'}</Badge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500 shrink-0">위치</span>
                  <span className="text-right text-slate-700 break-keep">{selectedRequest.address || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* 요청 사유 */}
            <div>
              <div className="text-xs text-slate-500 font-bold mb-1.5 uppercase tracking-wider">요청 사유</div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed">
                {selectedRequest.requestReason}
              </div>
            </div>

            {/* AI 라우팅 분석 카드 (★ 3. 카드 여백 축소) */}
            <Card className="bg-blue-50/40 border-blue-100 shadow-none gap-3">
              <CardHeader className="py-2 px-4 !pb-0 border-b border-blue-100/50 bg-blue-50/60"> {/* py-3 -> py-2 */}
                <CardTitle className="text-sm flex items-center gap-3 text-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  AI 라우팅 추천 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-2 space-y-3 text-sm"> {/* pb-4 -> pb-3 */}
                {getAiRecommendations(selectedRequest).length > 0 ? (
                  <>
                    <div>
                      <div className="text-xs text-blue-700 font-bold mb-1.5">추천 부서 순위</div>
                      <div className="space-y-1.5"> {/* space-y-2 -> space-y-1.5 */}
                        {getAiRecommendations(selectedRequest).slice(0, 3).map((rec: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-white/80 p-2 rounded border border-blue-100">
                            <div className="flex items-center gap-2">
                              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {idx + 1}
                              </span>
                              <span className={`font-medium ${idx === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                                {rec.recommended_dept}
                              </span>
                            </div>
                            <span className={`text-xs font-bold ${idx === 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                              {Math.round(rec.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {getAiRecommendations(selectedRequest)[0] && (
                      <div>
                        <div className="text-xs text-blue-700 font-bold mb-1.5">추천 근거</div>
                        <p className="text-xs text-slate-600 bg-white/80 p-3 rounded border border-blue-100 leading-relaxed">
                          {getAiRecommendations(selectedRequest)[0].reason}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs">AI 분석 데이터가 존재하지 않습니다.</div>
                )}
              </CardContent>
            </Card>

            {/* 하단 버튼 영역 */}
            {selectedRequest.status === 'PENDING' ? (
              userRole === 'admin' ? (
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300" onClick={() => setShowRejectionDialog(true)}>
                    <XCircle className="h-4 w-4 mr-2" /> 반려
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => setShowApprovalDialog(true)}>
                    <CheckCircle className="h-4 w-4 mr-2" /> 이관 승인
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-lg text-sm text-center text-yellow-700">
                  <span className="font-semibold block mb-1">승인 대기중</span>
                </div>
              )
            ) : (
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-sm text-center text-slate-500 font-medium">
                이미 처리 완료된 요청입니다. <br />
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${statusMap[selectedRequest.status]?.color}`}>
                  {statusMap[selectedRequest.status]?.label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 승인 다이얼로그 */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재이관 승인 확인</DialogTitle>
            <DialogDescription>승인 시 민원이 즉시 <b>{selectedRequest?.targetDeptName}</b>로 이관됩니다.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded border text-sm grid gap-2">
              <div className="flex justify-between"><span className="text-muted-foreground">민원 ID</span> <span className="font-mono font-bold">{selectedRequest?.complaintId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">현재 부서</span> <span className="line-through text-red-400 decoration-red-400">{selectedRequest?.currentDeptName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">이관 부서</span> <span className="text-blue-600 font-bold">{selectedRequest?.targetDeptName}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>취소</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove}>승인 실행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 다이얼로그 */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">재이관 반려</DialogTitle>
            <DialogDescription>반려 사유를 입력하세요. 요청자에게 전달됩니다.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="예: 해당 민원은 우리 부서 소관이 아닙니다."
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>취소</Button>
            <Button variant="destructive" onClick={handleReject}>반려 처리</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}