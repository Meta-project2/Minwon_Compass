import { useState } from 'react';
import { Search, Filter, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

const statusMap = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', color: 'bg-green-100 text-green-800' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-800' },
  cancelled: { label: '취소', color: 'bg-slate-100 text-slate-700' },
};

const urgencyMap = {
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

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${selectedRequest ? 'mr-96' : ''}`}>
        <div className="border-b border-border bg-card px-6 py-4">
          <h1>재이관 요청함</h1>
          <p className="text-sm text-muted-foreground">부서 간 민원 이관 승인/반려 관리</p>
        </div>

        {/* Unified Search & Filter Bar */}
        <div className="bg-card border-b border-border p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="민원ID/제목/요청자 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-input-background"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
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

            <Select defaultValue="all">
              <SelectTrigger className="w-32 bg-input-background">
                <SelectValue placeholder="업무군" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 업무군</SelectItem>
                <SelectItem value="road">도로/교통</SelectItem>
                <SelectItem value="env">환경/시설</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" className="ml-auto">
              <X className="h-4 w-4 mr-1" />
              필터 초기화
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-card border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>요청일시</TableHead>
                  <TableHead>민원 ID</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>현재부서</TableHead>
                  <TableHead>희망부서</TableHead>
                  <TableHead>요청자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRequests
                  .filter((r) => selectedStatus === 'all' || r.status === selectedStatus)
                  .map((request) => (
                    <TableRow
                      key={request.id}
                      className={`cursor-pointer ${
                        selectedRequest === request.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedRequest(request.id)}
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {request.requestedAt}
                      </TableCell>
                      <TableCell className="text-sm">{request.complaintId}</TableCell>
                      <TableCell>{request.complaintTitle}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.currentDept}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.requestedDept}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{request.requester}</TableCell>
                      <TableCell>
                        <Badge
                          className={statusMap[request.status as keyof typeof statusMap].color}
                        >
                          {statusMap[request.status as keyof typeof statusMap].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          검토
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Right Review Panel */}
      {selectedRequest && selectedRequestData && (
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-96 bg-card border-l border-border overflow-y-auto">
          <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
            <h3 className="text-sm">검토</h3>
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">민원 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">민원 ID</span>
                  <span>{selectedRequestData.complaintId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">업무군</span>
                  <Badge variant="outline">{selectedRequestData.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">위치</span>
                  <span>{selectedRequestData.address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">긴급도</span>
                  <Badge
                    className={
                      urgencyMap[selectedRequestData.urgency as keyof typeof urgencyMap].color
                    }
                  >
                    {urgencyMap[selectedRequestData.urgency as keyof typeof urgencyMap].label}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Request Reason */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">요청 사유</div>
              <div className="p-3 bg-muted rounded border text-sm">
                {selectedRequestData.reason}
              </div>
            </div>

            {/* AI Routing Recommendation */}
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  참고: 라우팅 추천 요약
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Top-3 추천 부서</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>1. 환경관리과</span>
                      <span className="text-xs text-muted-foreground">92%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>2. 시설관리과</span>
                      <span className="text-xs text-muted-foreground">76%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>3. 도로관리과</span>
                      <span className="text-xs text-muted-foreground">45%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">근거</div>
                  <p className="text-xs">
                    키워드 '공원', '시설물'이 환경관리과 처리 이력과 높은 유사도를 보임
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Decision Memo */}
            <div>
              <label className="text-sm">결정 메모 *</label>
              <Textarea
                placeholder="승인 또는 반려 사유를 입력하세요"
                rows={4}
                value={decisionMemo}
                onChange={(e) => setDecisionMemo(e.target.value)}
                className="mt-2 bg-input-background"
              />
            </div>

            {/* Action Buttons */}
            {selectedRequestData.status === 'pending' && (
              <div className="pt-4 space-y-2 border-t">
                <Button
                  className="w-full"
                  onClick={() => setShowApprovalDialog(true)}
                  disabled={!decisionMemo.trim()}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  승인(이관 실행)
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRejectionDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  반려
                </Button>
              </div>
            )}

            {selectedRequestData.status !== 'pending' && (
              <div className="p-3 bg-muted rounded text-sm text-center text-muted-foreground">
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
              승인 시 민원이 즉시 {selectedRequestData?.requestedDept}로 이관됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">민원 ID</span>
                <span>{selectedRequestData?.complaintId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">현재부서</span>
                <span>{selectedRequestData?.currentDept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이관부서</span>
                <span>{selectedRequestData?.requestedDept}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              취소
            </Button>
            <Button onClick={handleApprove}>승인 실행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재이관 반려</DialogTitle>
            <DialogDescription>반려 사유를 입력하세요</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="반려 사유를 구체적으로 작성하세요"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-input-background"
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
