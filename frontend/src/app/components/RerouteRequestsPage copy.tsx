import { useState } from 'react';
import { Search, Filter, X, CheckCircle, XCircle, AlertCircle, ArrowRightLeft } from 'lucide-react';
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

// Mock Data (기존 유지)
const mockRequests = [
  {
    id: 'RR-2026-001',
    requestedAt: '2026-01-01 10:30',
    complaintId: 'C2026-0023',
    complaintTitle: '공원 시설물 파손 신고',
    currentDept: '도로관리과',
    requestedDept: '환경관리과',
    requester: '김담당',
    reason: '해당 민원은 공원 내 시설물 관련으로 우리 부서 소관이 아닌 환경관리과 업무로 판단됩니다.',
    status: 'pending',
    category: '환경/시설',
    address: '강남구 역삼동',
    urgency: 'medium',
  },
  {
    id: 'RR-2026-002',
    requestedAt: '2026-01-01 09:15',
    complaintId: 'C2026-0018',
    complaintTitle: '불법 주정차 단속 요청',
    currentDept: '환경관리과',
    requestedDept: '교통행정과',
    requester: '이과장',
    reason: '불법 주정차 단속은 교통행정과 소관 업무입니다.',
    status: 'pending',
    category: '도로/교통',
    address: '서초구 서초동',
    urgency: 'low',
  },
  {
    id: 'RR-2025-345',
    requestedAt: '2025-12-31 16:20',
    complaintId: 'C2025-9987',
    complaintTitle: '도로 보수 요청',
    currentDept: '시설관리과',
    requestedDept: '도로관리과',
    requester: '박대리',
    reason: '도로 보수는 도로관리과 업무로 판단됩니다.',
    status: 'approved',
    category: '도로/교통',
    address: '강남구 삼성동',
    urgency: 'high',
  },
];

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', color: 'bg-green-100 text-green-800' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-800' },
  cancelled: { label: '취소', color: 'bg-slate-100 text-slate-700' },
};

const urgencyMap: Record<string, { label: string; color: string }> = {
  low: { label: '낮음', color: 'bg-slate-100 text-slate-700' },
  medium: { label: '보통', color: 'bg-orange-100 text-orange-700' },
  high: { label: '높음', color: 'bg-red-100 text-red-700' },
};

export function RerouteRequestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [decisionMemo, setDecisionMemo] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const selectedRequestData = mockRequests.find((r) => r.id === selectedRequest);

  const handleApprove = () => {
    setShowApprovalDialog(false);
    setSelectedRequest(null);
    setDecisionMemo('');
    toast('이관이 완료되었습니다');
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast('반려 사유를 입력해주세요');
      return;
    }
    setShowRejectionDialog(false);
    setSelectedRequest(null);
    setDecisionMemo('');
    setRejectionReason('');
    toast('반려 처리되었습니다');
  };

  // 필터 초기화
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col`}>
        {/* 상단 헤더 (ComplaintListPage 스타일 통일) */}
        <div className="h-16 border-b border-border bg-card px-6 shadow-sm flex items-center gap-3">
          <h1 className="text-2.5xl font-bold text-slate-900">재이관 요청함</h1>
          <p className="text-sm text-slate-400 font-medium pt-1">부서 간 민원 이관 승인/반려 관리</p>
        </div>

        {/* 메인 영역 (배경색 및 패딩 통일) */}
        <div className="flex-1 overflow-auto px-6 pt-0 pb-6 bg-slate-100/50">
          
          {/* 필터 영역 (ComplaintListPage 스타일 통일) */}
          <div className="py-3 flex items-center gap-4 justify-left">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="민원ID, 제목, 요청자 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-input-background pr-8"
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
            </div>
            <div>
              <Button className='border-2' variant="outline">검색</Button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32 bg-input-background">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>

              {/* 추가 필터들 */}
              <Select defaultValue="all">
                <SelectTrigger className="w-32 bg-input-background">
                  <SelectValue placeholder="현재부서" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  <SelectItem value="road">도로관리과</SelectItem>
                  <SelectItem value="env">환경관리과</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-32 bg-input-background">
                  <SelectValue placeholder="희망부서" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  <SelectItem value="road">도로관리과</SelectItem>
                  <SelectItem value="env">환경관리과</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" className="ml-auto" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                필터 초기화
              </Button>
            </div>
          </div>

          {/* 테이블 영역 (Card 감싸기 및 스타일 통일) */}
          <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md bg-white rounded-md">
            <div className="flex-1 overflow-auto">
              <Table>
                {/* 헤더 스타일: bg-slate-300, 굵은 글씨, 구분선 */}
                <TableHeader className="sticky top-0 bg-slate-300 border-b-2 z-10">
                  <TableRow>
                    <TableHead className="w-[140px] text-center font-bold text-slate-900 border-r border-slate-300">요청일시</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-300">민원 번호</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 border-r border-slate-300">제목</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-300">현재부서</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-300">희망부서</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900 border-r border-slate-300">요청자</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900 border-r border-slate-300">상태</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-900">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRequests
                    .filter((r) => selectedStatus === 'all' || r.status === selectedStatus)
                    .map((request) => (
                      <TableRow
                        key={request.id}
                        className={`cursor-pointer hover:bg-slate-100 border-b border-slate-200 ${
                          selectedRequest === request.id ? 'bg-blue-50/80' : ''
                        }`}
                        onClick={() => setSelectedRequest(request.id)}
                      >
                        <TableCell className="text-sm text-muted-foreground text-center">
                          {request.requestedAt}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-center font-mono">
                          {request.complaintId}
                        </TableCell>
                        <TableCell className="">
                           <span className="font-medium">{request.complaintTitle}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-slate-50">{request.currentDept}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-slate-50">{request.requestedDept}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-center">
                          {request.requester}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge className={statusMap[request.status]?.color}>
                              {statusMap[request.status]?.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs px-3 border border-slate-200"
                            >
                              <ArrowRightLeft className="h-3 w-3 mr-1.5" /> 검토
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {mockRequests.length === 0 && (
                     <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        요청 내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      {/* Right Review Panel (기존 로직 유지, 디자인 미세 조정) */}
      {selectedRequest && selectedRequestData && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto">
          <div className="px-4 h-16 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 className="text-sm font-bold">재이관 검토</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedRequest(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            {/* Complaint Summary */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800">민원 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">민원 번호</span>
                  <span className="font-mono">{selectedRequestData.complaintId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">업무군</span>
                  <Badge variant="outline">{selectedRequestData.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">위치</span>
                  <span>{selectedRequestData.address}</span>
                </div>
              </CardContent>
            </Card>

            {/* Request Reason */}
            <div>
              <div className="text-xs text-slate-500 font-bold mb-2">요청 사유</div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm leading-relaxed">
                {selectedRequestData.reason}
              </div>
            </div>

            {/* AI Routing Recommendation */}
            <Card className="bg-blue-50/50 border-blue-200 shadow-none">
              <CardHeader className="pb-3 border-b border-blue-100">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  AI 라우팅 추천 요약
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pt-3">
                <div>
                  <div className="text-xs text-blue-700 font-semibold mb-1">Top-3 추천 부서</div>
                  <div className="space-y-1 bg-white/60 p-2 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">1. 환경관리과</span>
                      <span className="text-xs text-blue-600 font-bold">92%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>2. 시설관리과</span>
                      <span className="text-xs">76%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>3. 도로관리과</span>
                      <span className="text-xs">45%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-700 font-semibold mb-1">근거</div>
                  <p className="text-xs text-slate-600 bg-white/60 p-2 rounded">
                    키워드 '공원', '시설물'이 환경관리과 처리 이력과 높은 유사도를 보임
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Decision Memo
            <div className="pt-2">
              <label className="text-sm font-bold text-slate-700">결정 메모</label>
              <Textarea
                placeholder="승인 또는 반려 사유를 입력하세요 (선택)"
                rows={3}
                value={decisionMemo}
                onChange={(e) => setDecisionMemo(e.target.value)}
                className="mt-2 bg-white resize-none"
              />
            </div> */}

            {/* Action Buttons */}
            {selectedRequestData.status === 'pending' ? (
              <div className="pt-2 grid grid-cols-2 gap-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowApprovalDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  이관 승인
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => setShowRejectionDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  반려
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 rounded text-sm text-center text-slate-500 font-medium">
                이미 처리된 요청입니다
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Confirmation Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재이관 승인 확인</DialogTitle>
            <DialogDescription>
              승인 시 민원이 즉시 <b>{selectedRequestData?.requestedDept}</b>로 이관됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-slate-50 border rounded space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">민원 ID</span>
                <span className="font-mono">{selectedRequestData?.complaintId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">현재부서</span>
                <span className="text-red-600 line-through decoration-red-600/50">{selectedRequestData?.currentDept}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">이관부서</span>
                <span className="text-blue-700 font-bold">{selectedRequestData?.requestedDept}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              취소
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove}>승인 실행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">재이관 반려</DialogTitle>
            <DialogDescription>반려 사유를 입력하세요</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="반려 사유를 구체적으로 작성하세요"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-input-background resize-none focus:border-red-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              반려 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}