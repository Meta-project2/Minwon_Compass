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
import { AgentComplaintApi, ComplaintDetailDto, ComplaintHistoryDto, DepartmentDto } from '../../api/AgentComplaintApi';
import { ImperativePanelHandle } from "react-resizable-panels";
import { Panel as RawPanel } from "react-resizable-panels";

interface ComplaintDetailPageProps {
  complaintId: string;
  onBack: () => void;
}

const statusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  RECOMMENDED: { label: '이관 요청', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  IN_PROGRESS: { label: '처리중', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  RESOLVED: { label: '답변완료', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-600 border-slate-300' },
  CANCELED: { label: '취하', color: 'bg-red-100 text-pink-600 border-red-300' }
};

const incidentstatusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '발생', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: '대응중', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  RESOLVED: { label: '해결', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-600 border-slate-300' },
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

  const [isDrafting, setIsDrafting] = useState(false);
  const [expandedDocIndex, setExpandedDocIndex] = useState<number | null>(null);

  const [allDepts, setAllDepts] = useState<DepartmentDto[]>([]);
  const [selectedGukId, setSelectedGukId] = useState<string>('');

  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [documents, setDocuments] = useState<any[]>([]);

  const suggestedPrompts = ['관련 규정/매뉴얼 찾아줘', '유사 사례 결과 요약해줘'];

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

  useEffect(() => {
    if (!complaint?.originalId) return;

    const loadChatHistory = async () => {
      try {
        const res = await AgentComplaintApi.getChatHistory(complaint.originalId);
        if (res.status === 'success' && res.data) {
          setChatMessages(res.data);
        }
      } catch (e) {
        console.error("채팅 기록 로드 실패", e);
      }
    };
    loadChatHistory();
  }, [complaint?.originalId]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await AgentComplaintApi.getDepartments();
        setAllDepts(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchDepts();
  }, []);

  const gukOptions = allDepts.filter(d => d.category === 'GUK');
  const gwaOptions = allDepts.filter(d =>
    d.category === 'GWA' && String(d.parentId) === selectedGukId
  );

  const handleGukChange = (val: string) => {
    setSelectedGukId(val);
    setSelectedTargetDept(''); // 과 선택 초기화
  };

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

  const handleDraft = async () => {
    if (!complaint) return;
    const targetHistory = complaint.history.find((h) => h.parent) || complaint.history[0];
    const bodyText = targetHistory?.body;

    if (!bodyText) {
      toast.error("분석할 민원 본문 내용이 없습니다.");
      return;
    }

    if (answerContent.trim() && !confirm("작성 중인 내용이 사라지고 AI 초안으로 대체됩니다. 계속하시겠습니까?")) {
      return;
    }

    setIsDrafting(true);

    try {
      // 3. API 호출
      const result = await AgentComplaintApi.generateAiDraft(complaint.originalId, bodyText);

      if (result.status === "success") {
        setAnswerContent(result.data);
        toast.success("AI 초안이 작성되었습니다.");
      } else {
        toast.error("초안 생성 실패: " + result.status);
      }
    } catch (error) {
      console.error("Draft Error:", error);
      toast.error("AI 서버 연결 실패");
    } finally {
      setIsDrafting(false);
    }
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

  const handleSendChat = async (message: string, action: 'chat' | 'search_law' | 'search_case' = 'chat') => {
    if (!message.trim() && action === 'chat') return;

    if (action === 'chat') {
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      setChatInput('');
    } else {
      setChatMessages((prev) => [...prev, { role: 'user', content: `${message}` }]);
    }

    setIsChatLoading(true);

    try {
      let numericId = complaintId;
      if (typeof complaintId === 'string' && complaintId.includes('-')) {
        const parts = complaintId.split('-');
        const lastPart = parts[parts.length - 1];
        if (!isNaN(parseInt(lastPart))) numericId = parseInt(lastPart).toString();
      }

      const response = await fetch(`/api/v2/complaints/${numericId}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: message,
          action: action
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setChatMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.data.answer
        }]);

        if (data.data.documents && data.data.documents.length > 0) {
          setDocuments(data.data.documents);
        }
      } else {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ 오류: ${data.message}` }]);
      }
    } catch (error) {
      console.error(error);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: "🚫 AI 서버 연결 실패" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

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
            {isUnassigned && !isSelectedClosed && complaint.status !== 'CANCELED' && complaint.status !== 'CLOSED' && (
              <Button onClick={handleAssign} className="bg-gray-600 hover:bg-gray-700">
                <UserCheck className="w-4 h-4 mr-2" /> 담당하기
              </Button>
            )}

            {isMine && !isSelectedClosed && complaint.status !== 'RECOMMENDED' && complaint.status !== 'CANCELED' && complaint.status !== 'CLOSED' && (
              <>
                <Button variant="outline" onClick={() => setShowRerouteDialog(true)}>
                  <RefreshCw className="w-4 h-4 mr-2" /> 이관 요청
                </Button>
                <Button variant="ghost" onClick={handleRelease} className="text-red-600 hover:bg-red-50">
                  <UserMinus className="w-4 h-4 mr-2" /> 담당 취소
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-15 text-sm w-full mt-4">
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">접수일시: </span>
            <span>{complaint.receivedAt}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">담당부서: </span>
            <span>{complaint.departmentName || '미배정'}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">담당자: </span>
            <span className={complaint.managerName ? "font-medium" : "text-slate-400"}>
              {complaint.managerName || '미배정'}
            </span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">민원번호: </span>
            <span className="medium font-mono">{complaint.id}</span>
          </div>
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

                <TabsTrigger
                  value="knowledge"
                  className="flex-none data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none font-normal data-[state=active]:font-bold rounded-lg transition-all px-4"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  지식·사례 검색
                </TabsTrigger>

              </TabsList>
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

            <div className="flex-1 overflow-hidden bg-gray-50/30">
              <TabsContent value="normalization" className="m-0 h-full p-6 space-y-4 overflow-y-auto">
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
                                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center"><Sparkles className="w-3 h-3 mr-1" /> AI 요약</div>
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
                                      <div><span className="text-muted-foreground block mb-1">위치</span> <div><span className="text-sm text-muted-foreground b">{complaint.address}</span></div></div>
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
                          <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 border ${incidentstatusMap[complaint.incidentStatus]?.color || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {incidentstatusMap[complaint.incidentStatus]?.label || complaint.incidentStatus}
                          </Badge>
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
                <div className="grid grid-cols-3 h-full min-h-0 overflow-hidden">
                  <div className="col-span-2 border-r border-border flex flex-col h-full min-h-0 overflow-hidden">
                    <ScrollArea className="flex-1 min-h-0 p-6">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                          <SearchIcon className="h-12 w-12 text-muted-foreground" />
                          <div>
                            <h3 className="mb-2 font-semibold">규정/매뉴얼/유사사례 검색</h3>
                            <p className="text-sm text-muted-foreground">궁금한 점을 질문하거나 아래 버튼을 클릭하세요.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[85%] rounded-lg p-4 shadow-sm ${msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-200 text-slate-800'
                                  }`}
                              >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>
                          ))}
                          {isChatLoading && (
                            <div className="flex justify-start">
                              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-sm text-muted-foreground">답변 생성 중...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="p-4 border-t border-border bg-white space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map((prompt, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            onClick={() => handleSendChat(
                              prompt,
                              i === 0 ? 'search_law' : (i === 1 ? 'search_case' : 'chat')
                            )}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2 relative">
                        <Input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendChat(chatInput, 'chat')}
                          placeholder="질문을 입력하세요..."
                          className="pr-12"
                        />
                        <Button
                          onClick={() => handleSendChat(chatInput, 'chat')}
                          disabled={isChatLoading}
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          size="sm"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50/80 p-4 h-full min-h-0 flex flex-col overflow-hidden border-l">
                    <div className="mb-3 flex items-center justify-between flex-none">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700">
                        <FileCheck className="w-4 h-4 text-blue-600" />
                        참고 문서
                      </h3>
                      <Badge variant="secondary" className="text-[10px]">{documents.length}건</Badge>
                    </div>
                    <ScrollArea className="flex-1 min-h-0 pr-3 -mr-3">
                      {documents.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-10 border-2 border-dashed rounded-lg">
                          검색된 관련 문서가 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3 pb-4">
                          {documents.map((doc, idx) => {
                            const isExpanded = expandedDocIndex === idx;

                            // ★ 데이터 타입 식별 (answer가 있으면 '유사 사례', 없으면 '법령')
                            const isCase = doc.hasOwnProperty('answer');

                            // 1. 배지 라벨 및 스타일 설정
                            const badgeLabel = isCase ? "유사 사례" : "법령/규정";
                            const badgeStyle = isCase
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-white text-slate-500 border-slate-200";

                            // 2. 제목 설정
                            const titleText = isCase
                              ? `유사 민원 #${doc.id} (유사도 ${doc.similarity}%)`
                              : `${doc.title || '문서명 없음'} ${doc.article_no || doc.section || ''}`;

                            // 3. 본문 설정 (유사 사례는 질문+답변 형태)
                            const contentElement = isCase ? (
                              <div className="space-y-2">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Q. 민원 내용</span>
                                  <p className="text-slate-700">{doc.body}</p>
                                </div>
                                <div className="border-t border-slate-200 pt-2 mt-2">
                                  <span className="text-[10px] font-bold text-blue-600 block mb-1">A. 처리 결과</span>
                                  <p className="text-slate-700">{doc.answer}</p>
                                </div>
                              </div>
                            ) : (
                              <p>{doc.chunk_text || doc.content || '내용 없음'}</p>
                            );

                            return (
                              <Card
                                key={idx}
                                className={`transition-all duration-200 hover:shadow-md cursor-pointer border-l-4 ${isExpanded
                                  ? (isCase ? 'border-l-amber-500 ring-1 ring-amber-200' : 'border-l-blue-500 ring-1 ring-blue-200')
                                  : 'border-l-transparent hover:border-l-slate-300'
                                  }`}
                                onClick={() => setExpandedDocIndex(isExpanded ? null : idx)}
                              >
                                <CardContent className="p-3 text-xs space-y-2">
                                  <div className="flex justify-between items-start">
                                    <Badge variant="outline" className={`font-normal ${badgeStyle}`}>
                                      {badgeLabel}
                                    </Badge>
                                    {/* 펼침/접힘 아이콘 */}
                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                  </div>

                                  <div className="font-bold text-slate-800 text-sm">
                                    {titleText}
                                  </div>

                                  {/* 내용 부분 */}
                                  <div className={`text-slate-600 bg-slate-50 p-2 rounded leading-relaxed ${isExpanded ? '' : 'line-clamp-3'
                                    }`}>
                                    {contentElement}
                                  </div>

                                  {/* 유사도 표시 (법령일 때도 표시) */}
                                  {isExpanded && doc.similarity && (
                                    <div className="pt-1 flex justify-end">
                                      <span className={`text-[10px] font-medium ${isCase ? 'text-amber-600' : 'text-blue-600'}`}>
                                        정확도: {doc.similarity}%
                                      </span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </ResizablePanel>
        <ResizableHandle />
        <RawPanel
          ref={rightPanelRef}
          defaultSize={0}
          minSize={0}
          collapsible={true}
          onCollapse={() => setIsPanelOpen(false)}
          onExpand={() => setIsPanelOpen(true)}
          className="bg-background border-l flex flex-col"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="h-14 px-4 border-b flex items-center justify-between bg-card flex-none">
              <span className="font-semibold text-sm">답변 및 처리</span>
              {isSelectedClosed ? <Badge className="bg-green-100 text-green-800">완료</Badge> : <Badge variant="outline">작성 중</Badge>}
            </div>
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

            <div className="flex-1 p-4 min-h-0 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between mb-2 flex-none">
                <label className="text-sm font-medium text-muted-foreground">내용</label>

                {isEditable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600 h-6"
                    onClick={handleDraft}
                    disabled={isDrafting}
                  >
                    {isDrafting ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    {isDrafting ? "작성 중..." : "AI 초안"}
                  </Button>
                )}
              </div>
              <div className="relative flex-1 flex flex-col min-h-[300px]">
                <Textarea
                  placeholder={isEditable ? "답변을 입력하세요." : "작성 권한이 없습니다."}
                  className="flex-1 resize-none p-4 text-sm focus-visible:ring-1"
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  disabled={!isEditable || isDrafting}
                />

                {isDrafting && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-md border">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                    <p className="text-sm text-blue-800 font-semibold animate-pulse">
                      AI 초안 작성 중...
                    </p>
                  </div>
                )}
              </div>
            </div>
            {isEditable && (
              <div className="p-4 border-t bg-gray-50/50 grid grid-cols-2 gap-3 flex-none">
                <Button variant="outline" onClick={() => handleAnswer(true)}><Save className="w-4 h-4 mr-2" /> 저장</Button>
                <Button onClick={() => handleAnswer(false)}><Send className="w-4 h-4 mr-2" /> 전송</Button>
              </div>
            )}
          </div>
        </RawPanel>
      </ResizablePanelGroup>
      <Dialog open={showRerouteDialog} onOpenChange={setShowRerouteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>이관 요청</DialogTitle><DialogDescription>부서와 사유를 입력하세요.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">국 (상위부서)</label>
                <Select value={selectedGukId} onValueChange={handleGukChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="국 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {gukOptions.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">과 (하위부서)</label>
                <Select
                  value={selectedTargetDept}
                  onValueChange={setSelectedTargetDept}
                  disabled={!selectedGukId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedGukId ? "과 선택" : "국을 먼저 선택"} />
                  </SelectTrigger>
                  <SelectContent>
                    {gwaOptions.length === 0 ? (
                      <div className="p-2 text-xs text-center text-muted-foreground">하위 부서 없음</div>
                    ) : (
                      gwaOptions.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea
              value={rerouteReason}
              onChange={(e) => setRerouteReason(e.target.value)}
              placeholder="이관 사유를 입력하세요 (필수)"
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerouteDialog(false)}>취소</Button>
            <Button onClick={handleSubmitReroute} disabled={!selectedTargetDept || !rerouteReason.trim()}>
              제출
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}