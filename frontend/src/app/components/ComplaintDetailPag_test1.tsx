import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Loader2, FileText, Search as SearchIcon, Send, Sparkles, 
  FileCheck, ExternalLink, Save, Lock, UserCheck, RefreshCw, UserMinus, User 
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { AgentComplaintApi, ComplaintDetailDto } from '../../api/AgentComplaintApi';

interface ComplaintDetailPageProps {
  complaintId: string;
  onBack: () => void;
}

// 재이관 부서 목록
const DEPARTMENTS = [
  { id: 3, name: '교통행정과' },
  { id: 4, name: '교통안전과' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  NORMALIZED: { label: '정규화', color: 'bg-purple-100 text-purple-800' },
  RECOMMENDED: { label: '재이관', color: 'bg-cyan-100 text-cyan-800' },
  IN_PROGRESS: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  CLOSED: { label: '종결', color: 'bg-green-100 text-green-800' },
};

const urgencyMap: Record<string, { label: string; color: string }> = {
  LOW: { label: '낮음', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { label: '보통', color: 'bg-orange-100 text-orange-700' },
  HIGH: { label: '높음', color: 'bg-red-100 text-red-700' },
};

export function ComplaintDetailPage({ complaintId, onBack }: ComplaintDetailPageProps) {
  const [complaint, setComplaint] = useState<ComplaintDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ★ 내 ID 상태
  const [myId, setMyId] = useState<number | null>(null);

  const [isNormalizing, setIsNormalizing] = useState(false);
  
  // 재이관 상태
  const [showRerouteDialog, setShowRerouteDialog] = useState(false);
  const [selectedTargetDept, setSelectedTargetDept] = useState<string>(''); 
  const [rerouteReason, setRerouteReason] = useState('');

  // 채팅 상태
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: any[] }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);

  // 답변 작성 상태
  const [answerContent, setAnswerContent] = useState('');
  const [processStatus, setProcessStatus] = useState('processing');
  
  // Mock Data
  const similarCases = [
    { id: 'C2025-8234', similarity: 92, date: '2025-11-15', department: '도로관리과', result: '보수 완료', summary: '역삼동 도로 파손 긴급 보수' },
    { id: 'C2025-7891', similarity: 85, date: '2025-10-22', department: '도로관리과', result: '보수 완료', summary: '삼성동 도로 균열 보수' },
    { id: 'C2025-7123', similarity: 78, date: '2025-09-08', department: '도로관리과', result: '보수 완료', summary: '대치동 도로 함몰 긴급 조치' },
  ];

  const knowledgeSources = [
    { id: 'KB-001', type: '매뉴얼', title: '도로 유지보수 업무 매뉴얼', section: '제3장 긴급 보수', confidence: 95, snippet: '긴급도가 높은 도로 파손의 경우 접수 후 24시간 이내 현장 조사 및 임시 조치를 실시하고...' },
    { id: 'KB-002', type: '규정', title: '도로법 시행규칙', section: '제12조', confidence: 88, snippet: '도로관리청은 도로의 파손, 함몰 등으로 인하여 교통 안전에 지장을 초래할 우려가 있는 경우...' },
    { id: 'KB-003', type: '사례', title: '2025년 도로 파손 처리 사례집', section: 'Case #45', confidence: 82, snippet: '역삼동 유사 사례: 접수 후 4시간 내 현장 조사, 12시간 내 임시 보수 완료...' },
  ];

  const suggestedPrompts = ['관련 규정/매뉴얼 찾아줘', '유사 사례 결과 요약해줘', '처리 안내 문구(공문체) 초안 작성'];

  // ★ 1. 초기 데이터 로딩 (병렬 처리)
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // 내 정보와 민원 정보를 동시에 가져옴
        const [meData, detailData] = await Promise.all([
          AgentComplaintApi.getMe().catch(() => null), // 실패해도 null 처리
          AgentComplaintApi.getDetail(complaintId)
        ]);

        if (meData) setMyId(meData.id);
        setComplaint(detailData);
        
        // ★ 저장된 답변 내용 불러오기
        if (detailData.answer) {
          setAnswerContent(detailData.answer);
        }
      } catch (error) {
        console.error("데이터 로딩 실패", error);
        toast.error("민원 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [complaintId]);

  // --- 핸들러 함수들 ---
  const refetchDetail = async () => {
    try {
      const data = await AgentComplaintApi.getDetail(complaintId);
      setComplaint(data);
      if (data.answer) setAnswerContent(data.answer);
    } catch (e) { console.error(e); }
  };

  const handleAssign = async () => {
    if (!complaint) return;
    try {
      await AgentComplaintApi.assign(complaint.originalId);
      toast.success("담당자로 배정되었습니다.");
      refetchDetail();
    } catch (e) { toast.error("배정 실패"); }
  };

  const handleRelease = async () => {
    if (!complaint) return;
    if (confirm("배정을 취소하시겠습니까?")) {
      try {
        await AgentComplaintApi.release(complaint.originalId);
        toast.info("배정이 취소되었습니다.");
        refetchDetail();
      } catch (e) { toast.error("취소 실패"); }
    }
  };

  const handleAnswer = async (isTemporary: boolean) => {
    if (!complaint) return;
    if (!answerContent.trim()) { toast.warning("내용을 입력해주세요."); return; }
    try {
      await AgentComplaintApi.answer(complaint.originalId, answerContent, isTemporary);
      toast.success(isTemporary ? "저장되었습니다." : "처리 완료");
      refetchDetail();
    } catch (e) { toast.error("처리 실패"); }
  };

  const handleSubmitReroute = async () => {
    if (!complaint || !selectedTargetDept || !rerouteReason.trim()) return;
    try {
      await AgentComplaintApi.reroute(complaint.originalId, Number(selectedTargetDept), rerouteReason);
      toast.success("요청 완료");
      setShowRerouteDialog(false);
      setSelectedTargetDept(''); 
      setRerouteReason('');
    } catch (e) { toast.error("요청 실패"); }
  };

  const handleNormalize = () => {
    setIsNormalizing(true);
    setTimeout(() => {
      setIsNormalizing(false);
      toast.success("정규화가 재실행되었습니다.");
    }, 2000);
  };

  const handleSendChat = async() => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput;
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      let numericId = complaintId; 
      if (typeof complaintId === 'string' && complaintId.includes('-')) {
          const parts = complaintId.split('-');
          const lastPart = parts[parts.length - 1];
          if (!isNaN(parseInt(lastPart))) numericId = parseInt(lastPart).toString(); 
      }
      const response = await fetch(`http://localhost:8000/api/complaints/${numericId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.result, citations: [] }]);
      } else {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ 오류: ${data.message}` }]);
      }
    } catch (error) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: "🚫 서버 연결 실패" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!complaint) return <div>Data Not Found</div>;

  // ★★★ [권한 체크 로직] ★★★
  // answeredBy가 null이면 미배정
  const isUnassigned = !complaint.answeredBy;
  // 내 ID가 있고, 민원의 answeredBy와 같으면 내 것
  const isMine = (myId !== null) && (String(complaint.answeredBy) === String(myId));
  // 담당자는 있는데 내 것은 아님
  const isOthers = !isUnassigned && !isMine;
  // 종결 여부
  const isClosed = complaint.status === 'CLOSED';
  
  // 편집 가능 여부: 내 것이고 종결 안 됨
  const isEditable = isMine && !isClosed;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 1. Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex-none">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-semibold">{complaint.title}</h1>
                <Badge className={statusMap[complaint.status]?.color || 'bg-gray-100'}>
                  {statusMap[complaint.status]?.label || complaint.status}
                </Badge>
                <Badge className={urgencyMap[complaint.urgency]?.color || 'bg-gray-100'}>
                  {urgencyMap[complaint.urgency]?.label || complaint.urgency}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{complaint.id}</p>
            </div>
          </div>
          
          {/* ★ 상단 버튼 분기 */}
          <div className="flex gap-2">
            {isUnassigned && !isClosed && (
              <Button onClick={handleAssign} className="bg-blue-600 hover:bg-blue-700">
                <UserCheck className="w-4 h-4 mr-2" /> 담당하기
              </Button>
            )}
            {isMine && !isClosed && (
              <>
                <Button variant="outline" onClick={() => setShowRerouteDialog(true)}>
                  <RefreshCw className="w-4 h-4 mr-2" /> 재이관 요청
                </Button>
                <Button variant="ghost" onClick={handleRelease} className="text-red-600 hover:bg-red-50">
                  <UserMinus className="w-4 h-4 mr-2" /> 담당 취소
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="grid grid-cols-5 gap-4 text-sm">
          <div><span className="text-muted-foreground">접수일시: </span><span>{complaint.receivedAt}</span></div>
          <div><span className="text-muted-foreground">담당부서: </span><span>{complaint.departmentName || '미배정'}</span></div>          
          <div>
            <span className="text-muted-foreground">담당자: </span>
            <span className={complaint.managerName ? "font-medium" : "text-slate-400"}>
              {complaint.managerName || '미배정'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">사건: </span>
            {complaint.incidentId ? <Badge variant="secondary">{complaint.incidentId}</Badge> : <span className="text-muted-foreground">미연결</span>}
          </div>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        
        {/* [왼쪽] Tabs (기존 코드 유지) */}
        <ResizablePanel defaultSize={75} minSize={40}>
          <Tabs defaultValue="normalization" className="h-full flex flex-col">
            <div className="border-b border-border px-6 bg-card flex-none h-14 flex items-center">
              <TabsList>
                <TabsTrigger value="normalization">원문·정규화</TabsTrigger>
                <TabsTrigger value="similar">유사 민원</TabsTrigger>
                <TabsTrigger value="incident">사건(군집)</TabsTrigger>
                <TabsTrigger value="knowledge"><Sparkles className="h-4 w-4 mr-1" />지식·사례 검색</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/30">
              {/* Tab 1 */}
              <TabsContent value="normalization" className="m-0 h-full p-6">
                <div className="grid grid-cols-2 gap-6 h-full">
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center justify-between"><span>원문</span><FileText className="h-4 w-4 text-muted-foreground" /></CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div><p className="text-sm leading-relaxed whitespace-pre-wrap">{complaint.body}</p></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center justify-between"><span>정규화 결과</span><Button size="sm" onClick={handleNormalize} disabled={isNormalizing}>{isNormalizing ? <Loader2 className="animate-spin h-3 w-3" /> : <Sparkles className="h-3 w-3" />} 재실행</Button></CardTitle></CardHeader>
                    <CardContent>
                      {!complaint.neutralSummary ? <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">데이터 없음</div> : 
                        <div className="space-y-4 text-sm">
                          <div><div className="text-xs text-muted-foreground mb-1">중립 요약</div><p className="p-3 bg-muted rounded">{complaint.neutralSummary}</p></div>
                          <div><div className="text-xs text-muted-foreground mb-1">핵심 요구</div><p>{complaint.coreRequest || '-'}</p></div>
                          <div><div className="text-xs text-muted-foreground mb-1">원인 추정</div><p>{complaint.coreCause || '-'}</p></div>
                          <div><div className="text-xs text-muted-foreground mb-1">대상물</div><p>{complaint.targetObject || '-'}</p></div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-2">키워드</div>
                            <div className="flex flex-wrap gap-1">{complaint.keywords?.map((kw, idx) => <Badge key={idx} variant="secondary">{kw}</Badge>)}</div>
                          </div>
                          <div><div className="text-xs text-muted-foreground mb-1">위치 힌트</div><p>{complaint.locationHint || '-'}</p></div>
                        </div>
                      }
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 2, 3 생략 (기존과 동일) */}
              <TabsContent value="similar" className="m-0 h-full p-6"><div className="text-center text-muted-foreground p-10">유사 민원 목록 (Mock)</div></TabsContent>
              <TabsContent value="incident" className="m-0 h-full p-6"><div className="text-center text-muted-foreground p-10">사건 정보 (Mock)</div></TabsContent>

              {/* Tab 4 Chat */}
              <TabsContent value="knowledge" className="m-0 h-full">
                <div className="grid grid-cols-3 h-full">
                  <div className="col-span-2 border-r border-border flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                      {chatMessages.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-center"><SearchIcon className="h-12 w-12 text-muted-foreground mb-4" /><h3>질문하세요</h3></div> : 
                        <div className="space-y-4">{chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div>
                          </div>
                        ))}</div>
                      }
                    </ScrollArea>
                    <div className="p-4 border-t flex gap-2">
                       <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} />
                       <Button onClick={handleSendChat} disabled={isChatLoading}><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="bg-muted/30 p-4"><h3 className="text-sm mb-3">검색 문서</h3><ScrollArea className="h-full"><div className="space-y-3">{knowledgeSources.map(src => <Card key={src.id}><CardContent className="p-3"><h4 className="text-xs font-bold">{src.title}</h4><p className="text-xs line-clamp-2">{src.snippet}</p></CardContent></Card>)}</div></ScrollArea></div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* [오른쪽] 답변 패널 */}
        <ResizablePanel defaultSize={25} minSize={25} className="bg-background border-l">
          <div className="flex flex-col h-full">
            <div className="h-14 px-4 border-b flex items-center justify-between bg-card flex-none">
              <span className="font-semibold text-sm">답변 및 처리</span>
              {isClosed ? <Badge className="bg-green-100 text-green-800">완료</Badge> : <Badge variant="outline">작성 중</Badge>}
            </div>

            {/* 안내 배너 */}
            {isUnassigned && !isClosed && (
              <div className="bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3 border-b border-blue-100">
                <Lock className="w-5 h-5 mt-0.5 shrink-0" />
                <div><p className="font-medium">권한 없음</p><p className="text-xs mt-1"><b>담당하기</b>를 눌러 배정받으세요.</p></div>
              </div>
            )}
            {isOthers && (
               <div className="bg-slate-100 p-4 text-sm text-slate-600 flex items-center gap-3 border-b border-slate-200">
                  <User className="w-5 h-5 shrink-0" />
                  <span>현재 <b>{complaint.managerName}</b>님이 처리 중입니다.</span>
               </div>
            )}

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">처리 결과</label>
                  <Select value={processStatus} onValueChange={setProcessStatus} disabled={!isEditable}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">🟡 처리중</SelectItem>
                      <SelectItem value="completed">🟢 완료</SelectItem>
                      <SelectItem value="rejected">🔴 반려</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                     <label className="text-sm font-medium text-muted-foreground">답변 내용</label>
                     {isEditable && <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-6"><Sparkles className="w-3 h-3 mr-1" /> AI 초안</Button>}
                  </div>
                  <Textarea 
                    placeholder={isEditable ? "답변을 입력하세요." : "작성 권한이 없습니다."}
                    className="min-h-[400px] resize-none p-4 text-sm"
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </ScrollArea>

            {isEditable && (
              <div className="p-4 border-t bg-gray-50/50 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => handleAnswer(true)}><Save className="w-4 h-4 mr-2" /> 임시 저장</Button>
                <Button onClick={() => handleAnswer(false)}><Send className="w-4 h-4 mr-2" /> 전송</Button>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* 재이관 Dialog */}
      <Dialog open={showRerouteDialog} onOpenChange={setShowRerouteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>재이관 요청</DialogTitle><DialogDescription>부서와 사유를 입력하세요.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedTargetDept} onValueChange={setSelectedTargetDept}>
                <SelectTrigger><SelectValue placeholder="부서 선택" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea value={rerouteReason} onChange={(e) => setRerouteReason(e.target.value)} placeholder="사유 입력" />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRerouteDialog(false)}>취소</Button><Button onClick={handleSubmitReroute}>제출</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}