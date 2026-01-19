import { useState, useEffect, useRef } from 'react'; // useRef 추가
import {
  ArrowLeft, Loader2, FileText, Search as SearchIcon, Send, Sparkles,
  FileCheck, ExternalLink, Save, Lock, UserCheck, RefreshCw, UserMinus, User,
  Check, ChevronDown, ChevronRight, PanelRightClose, PanelRightOpen // 아이콘 추가
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { AgentComplaintApi, ComplaintDetailDto, ComplaintHistoryDto } from '../../api/AgentComplaintApi';
// 패널 제어용 타입 import (react-resizable-panels 설치된 환경 가정)
import { ImperativePanelHandle } from "react-resizable-panels";
import { Panel as RawPanel } from "react-resizable-panels";

interface ComplaintDetailPageProps {
  complaintId: string;
  onBack: () => void;
}

const DEPARTMENTS = [
  { id: 12, name: '일자리정책과' },
  { id: 13, name: '지역경제과' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  NORMALIZED: { label: '정규화', color: 'bg-purple-100 text-purple-800' },
  RECOMMENDED: { label: '재이관 요청', color: 'bg-cyan-100 text-cyan-800' },
  IN_PROGRESS: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '처리완료', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-green-100 text-green-800' },
};

export function ComplaintDetailPage({ complaintId, onBack }: ComplaintDetailPageProps) {
  const [complaint, setComplaint] = useState<ComplaintDetailDto | null>(null);
  const [loading, setLoading] = useState(true);

  const [myId, setMyId] = useState<number | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");

  const [showRerouteDialog, setShowRerouteDialog] = useState(false);
  const [selectedTargetDept, setSelectedTargetDept] = useState<string>('');
  const [rerouteReason, setRerouteReason] = useState('');

  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: any[] }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);

  const [answerContent, setAnswerContent] = useState('');

  // [추가] 패널 제어용 ref 및 상태
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const knowledgeSources = [
    { id: 'KB-001', type: '매뉴얼', title: '도로 유지보수 업무 매뉴얼', section: '제3장 긴급 보수', confidence: 95, snippet: '긴급도가 높은 도로 파손의 경우 접수 후 24시간 이내 현장 조사 및 임시 조치를 실시하고...' },
    { id: 'KB-002', type: '규정', title: '도로법 시행규칙', section: '제12조', confidence: 88, snippet: '도로관리청은 도로의 파손, 함몰 등으로 인하여 교통 안전에 지장을 초래할 우려가 있는 경우...' },
    { id: 'KB-003', type: '사례', title: '2025년 도로 파손 처리 사례집', section: 'Case #45', confidence: 82, snippet: '역삼동 유사 사례: 접수 후 4시간 내 현장 조사, 12시간 내 임시 보수 완료...' },
  ];
  const suggestedPrompts = ['관련 규정/매뉴얼 찾아줘', '유사 사례 결과 요약해줘', '처리 안내 문구(공문체) 초안 작성'];

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [meData, detailData] = await Promise.all([
          AgentComplaintApi.getMe().catch(() => null),
          AgentComplaintApi.getDetail(complaintId)
        ]);

        if (meData) setMyId(meData.id);
        setComplaint(detailData);

        if (detailData.history && detailData.history.length > 0) {
          const latest = detailData.history[detailData.history.length - 1];
          setSelectedHistoryId(latest.id);
          if (latest.answer) setAnswerContent(latest.answer);
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

  const handleHistorySelect = (h: ComplaintHistoryDto) => {
    setSelectedHistoryId(h.id);
    setAnswerContent(h.answer || '');
  };

  const refetchDetail = async () => {
    try {
      const data = await AgentComplaintApi.getDetail(complaintId);
      setComplaint(data);
      if (selectedHistoryId) {
        const current = data.history.find(h => h.id === selectedHistoryId);
        if (current) setAnswerContent(current.answer || '');
      }
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

      await refetchDetail();
    } catch (e) { toast.error("요청 실패"); }
  };

  const handleSendChat = async () => {
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

  // 패널 토글 함수
  const toggleRightPanel = () => {
    const panel = rightPanelRef.current;

    if (panel) {
      if (isPanelOpen) {
        panel.collapse();
      } else {
        panel.resize(25);
      }
    } else {
      alert("패널을 찾을 수 없습니다. (Ref is null)");
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!complaint) return <div>Data Not Found</div>;

  const isUnassigned = !complaint.answeredBy;
  const isMine = (myId !== null) && (String(complaint.answeredBy) === String(myId));
  const isOthers = !isUnassigned && !isMine;

  const selectedHistory = complaint.history.find(h => h.id === selectedHistoryId);
  const isLatest = selectedHistoryId === complaint.history[complaint.history.length - 1].id;
  const isSelectedClosed = selectedHistory?.status === 'CLOSED' || selectedHistory?.status === 'RESOLVED';
  const isEditable = isMine && isLatest && !isSelectedClosed;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 1. Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex-none">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={statusMap[complaint.status]?.color || 'bg-gray-100'}>
                  {statusMap[complaint.status]?.label || complaint.status}
                </Badge>
                <h1 className="text-lg font-semibold">{complaint.title}</h1>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {isUnassigned && !isSelectedClosed && (
              <Button onClick={handleAssign} className="bg-gray-600 hover:bg-gray-700">
                <UserCheck className="w-4 h-4 mr-2" /> 담당하기
              </Button>
            )}
            {isMine && !isSelectedClosed && complaint.status !== 'RECOMMENDED' && (
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

{/* grid 대신 flex로 변경하여 내용물 크기에 맞게 공간 확보 */}
        <div className="flex flex-wrap items-center gap-15 text-sm w-full mt-4">
          
          {/* 1. 접수일시: 줄바꿈 절대 금지 (whitespace-nowrap) */}
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">접수일시: </span>
            <span>{complaint.receivedAt}</span>
          </div>

          {/* 2. 담당부서 */}
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">담당부서: </span>
            <span>{complaint.departmentName || '미배정'}</span>
          </div>

          {/* 3. 담당자 */}
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">담당자: </span>
            <span className={complaint.managerName ? "font-medium" : "text-slate-400"}>
              {complaint.managerName || '미배정'}
            </span>
          </div>

          {/* 4. 민원번호: 여기서부터 오른쪽 끝으로 밀어버림 (ml-auto) */}
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">민원번호: </span>
            <span className="medium font-mono">{complaint.id}</span>
          </div>

          {/* 5. 사건 */}
          <div className="whitespace-nowrap flex items-center gap-1">
            <span className="text-muted-foreground">사건: </span>
            {complaint.incidentId ? (
              <Badge variant="secondary" className="px-2 py-0.5 h-auto">
                {complaint.incidentId}
              </Badge>
            ) : (
              <span className="text-muted-foreground">미연결</span>
            )}
          </div>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">

        {/* [왼쪽] Tabs Panel */}
        {/* minSize를 주어 패널이 완전히 사라지지 않도록 보호할 수 있음 */}
        <ResizablePanel defaultSize={100} minSize={30}>
          <Tabs defaultValue="normalization" className="h-full flex flex-col">

            <div className="border-b border-border px-6 bg-card flex-none h-14 flex items-center justify-between">
              <TabsList className="w-full justify-start bg-transparent p-0 gap-2">

                <TabsTrigger
                  value="normalization"
                  className="flex-none data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none font-normal data-[state=active]:font-bold rounded-lg transition-all px-4"
                >
                  민원 타임라인
                </TabsTrigger>

                <TabsTrigger
                  value="incident"
                  className="flex-none data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none font-normal data-[state=active]:font-bold rounded-lg transition-all px-4"
                >
                  중복 민원
                </TabsTrigger>
{/* 
                <TabsTrigger
                  value="knowledge"
                  className="flex-none data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none font-normal data-[state=active]:font-bold rounded-lg transition-all px-4"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  지식·사례 검색
                </TabsTrigger> */}

              </TabsList>

              {/*  답변창 토글 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRightPanel}
                className="text-muted-foreground hover:text-foreground"
              >
                {isPanelOpen ? (
                  <span className="flex items-center text-xs"><PanelRightClose className="w-4 h-4 mr-2" />답변창 닫기</span>
                ) : (
                  <span className="flex items-center text-xs"><PanelRightOpen className="w-4 h-4 mr-2" />답변 및 처리</span>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/30">
              <TabsContent value="normalization" className="m-0 h-full p-6 space-y-4">
                {complaint.history.map((h) => {
                  const isSelected = selectedHistoryId === h.id;
                  const isParent = h.parent;

                  if (isSelected) {
                    return (
                      <Card key={h.id} className="border-blue-200 shadow-md">
                        <CardHeader className="bg-blue-50/50 pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                              <ChevronDown className="w-4 h-4" />
                              {h.receivedAt}
                              <span className="text-sm font-normal text-muted-foreground">| {isParent ? '최초 민원' : '추가 민원'}</span>
                            </CardTitle>
                            <Badge variant="outline">{statusMap[h.status]?.label}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {isParent ? (
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center"><FileText className="w-3 h-3 mr-1" /> 원문</div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{h.body}</p>
                              </div>
                              <div className="border-l pl-6">
                                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center"><Sparkles className="w-3 h-3 mr-1" /> AI 정규화 분석</div>
                                {!h.neutralSummary ? (
                                  <div className="text-sm text-muted-foreground">분석 데이터 없음</div>
                                ) : (
                                  <div className="space-y-3 text-sm">
                                    <div className="p-3 bg-slate-100 rounded text-slate-700">{h.coreRequest}</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div><span className="text-muted-foreground block mb-1">핵심 키워드</span>
                                        <div className="flex flex-wrap gap-1">
                                          {h.keywords && h.keywords.length > 0 ? (
                                            h.keywords.map((k, i) => (
                                              <Badge key={i} variant="secondary" className="text-xs px-1 py-0">{k}</Badge>
                                            ))
                                          ) : (
                                            <span className="text-slate-500"></span>
                                          )}
                                        </div></div>
                                      <div><span className="text-muted-foreground block mb-1">위치</span> <div><span className="text-sm text-muted-foreground b">{h.locationHint}</span></div></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="mb-4">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">제목</div>
                                <h3 className="font-semibold">{h.title}</h3>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-muted-foreground mb-1">내용</div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{h.body}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  } else {
                    return (
                      <Card
                        key={h.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => handleHistorySelect(h)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <div className="text-sm font-medium">
                              {h.receivedAt}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {h.parent ? `[최초] ${h.title}` : `[추가] ${h.title.substring(0, 30)}${h.title.length > 30 ? '...' : ''}`}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{statusMap[h.status]?.label}</Badge>
                        </CardContent>
                      </Card>
                    );
                  }
                })}
              </TabsContent>

              <TabsContent value="incident" className="m-0 h-full p-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">연결된 사건</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {complaint.incidentId ? (
                      <div className="p-4 border rounded bg-muted/50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-bold mb-1">{complaint.incidentTitle}</h3>
                            <p className="text-xs text-muted-foreground">{complaint.incidentId}</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800">{complaint.incidentStatus}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><span className="text-xs text-muted-foreground">구성민원수</span><p>{complaint.incidentComplaintCount}건</p></div>
                          <div><span className="text-xs text-muted-foreground">업무군</span><p>{complaint.category || '도로/교통'}</p></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center text-muted-foreground">연결된 사건(군집)이 없습니다.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="knowledge" className="m-0 h-full">
                <div className="grid grid-cols-3 h-full">
                  <div className="col-span-2 border-r border-border flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                          <SearchIcon className="h-12 w-12 text-muted-foreground" />
                          <div>
                            <h3 className="mb-2">규정/매뉴얼/유사사례를 자연어로 질문</h3>
                            <p className="text-sm text-muted-foreground">질문을 입력하거나 아래 추천 버튼을 클릭하세요</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>
                          ))}
                          {isChatLoading && <div className="flex justify-start"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="p-4 border-t border-border space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map(p => <Button key={p} variant="outline" size="sm" onClick={() => { setChatInput(p); handleSendChat(); }}>{p}</Button>)}
                      </div>
                      <div className="flex gap-2">
                        <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} />
                        <Button onClick={handleSendChat} disabled={isChatLoading}><Send className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/30 p-4">
                    <h3 className="text-sm mb-3">검색된 문서</h3>
                    <ScrollArea className="h-full">
                      {knowledgeSources.map(s => (
                        <Card key={s.id} className="mb-2 cursor-pointer hover:border-primary" onClick={() => setSelectedSource(s)}>
                          <CardContent className="p-3 text-xs space-y-1">
                            <div className="flex justify-between"><Badge variant="outline">{s.type}</Badge> <span>{s.confidence}%</span></div>
                            <div className="font-bold">{s.title}</div>
                            <div className="text-muted-foreground line-clamp-2">{s.snippet}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </ResizablePanel>

        {/* [수정] 핸들 아이콘(Grip) 제거 (withHandle 속성 삭제) */}
        <ResizableHandle />

        {/* [수정] 오른쪽 답변 패널에 Ref 연결 및 이벤트 핸들링 추가 */}
        <RawPanel
          ref={rightPanelRef}
          defaultSize={0}
          minSize={0}
          collapsible={true}
          onCollapse={() => setIsPanelOpen(false)}
          onExpand={() => setIsPanelOpen(true)}
          className="bg-background border-l flex flex-col" // flex flex-col 스타일 직접 추가
        >
          <div className="flex flex-col h-full">

            {/* Header */}
            <div className="h-14 px-4 border-b flex items-center justify-between bg-card flex-none">
              <span className="font-semibold text-sm">답변 및 처리</span>
              {isSelectedClosed ? <Badge className="bg-green-100 text-green-800">완료</Badge> : <Badge variant="outline">작성 중</Badge>}
            </div>

            {/* Banners */}
            <div className="flex-none">
              {isUnassigned && !isSelectedClosed && (
                <div className="bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3 border-b border-blue-100">
                  <Lock className="w-5 h-5 mt-0.5 shrink-0" />
                  <div><p className="font-medium">권한 없음</p><p className="text-xs mt-1"><b>담당자</b>만 작성이 가능합니다.</p></div>
                </div>
              )}
              {isOthers && (
                <div className="bg-slate-100 p-4 text-sm text-slate-600 flex items-center gap-3 border-b border-slate-200">
                  <User className="w-5 h-5 shrink-0" />
                  <span>현재 <b>{complaint.managerName}</b>님이 처리 중입니다.</span>
                </div>
              )}
              {isSelectedClosed && (
                <div className="bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3 border-b border-blue-100">
                  <Check className="w-5 h-5 shrink-0" />
                  <span>이미 처리된 건입니다.</span>
                </div>
              )}
              {!isLatest && (
                <div className="bg-yellow-50 p-4 text-sm text-yellow-800 flex items-center gap-3 border-b border-yellow-100">
                  <Lock className="w-4 h-4" />
                  <span>이전 민원은 수정할 수 없습니다.</span>
                </div>
              )}
            </div>

            {/* Content Area  */}
            <div className="flex-1 p-4 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2 flex-none">
                <label className="text-sm font-medium text-muted-foreground">내용</label>
                {isEditable && <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-6"><Sparkles className="w-3 h-3 mr-1" /> AI 초안</Button>}
              </div>

              <Textarea
                placeholder={isEditable ? "답변을 입력하세요." : "작성 권한이 없습니다."}
                className="flex-1 resize-none p-4 text-sm focus-visible:ring-1"
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                disabled={!isEditable}
              />
            </div>

            {/* Footer Buttons  */}
            {isEditable && (
              <div className="p-4 border-t bg-gray-50/50 grid grid-cols-2 gap-3 flex-none">
                <Button variant="outline" onClick={() => handleAnswer(true)}><Save className="w-4 h-4 mr-2" /> 저장</Button>
                <Button onClick={() => handleAnswer(false)}><Send className="w-4 h-4 mr-2" /> 전송</Button>
              </div>
            )}
          </div>
        </RawPanel>
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