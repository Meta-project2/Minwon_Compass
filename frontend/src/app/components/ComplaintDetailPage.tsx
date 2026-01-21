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
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  RECOMMENDED: { label: '이관 요청', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  IN_PROGRESS: { label: '처리중', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  RESOLVED: { label: '답변완료', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-600 border-slate-300' },
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

  // [부서 데이터 State]
  const [allDepts, setAllDepts] = useState<DepartmentDto[]>([]); // 전체 목록
  // [선택 State]
  const [selectedGukId, setSelectedGukId] = useState<string>(''); // 왼쪽: 국 ID

  // [추가] 패널 제어용 ref 및 상태
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // const knowledgeSources = [
  //   { id: 'KB-001', type: '매뉴얼', title: '도로 유지보수 업무 매뉴얼', section: '제3장 긴급 보수', confidence: 95, snippet: '긴급도가 높은 도로 파손의 경우 접수 후 24시간 이내 현장 조사 및 임시 조치를 실시하고...' },
  //   { id: 'KB-002', type: '규정', title: '도로법 시행규칙', section: '제12조', confidence: 88, snippet: '도로관리청은 도로의 파손, 함몰 등으로 인하여 교통 안전에 지장을 초래할 우려가 있는 경우...' },
  //   { id: 'KB-003', type: '사례', title: '2025년 도로 파손 처리 사례집', section: 'Case #45', confidence: 82, snippet: '역삼동 유사 사례: 접수 후 4시간 내 현장 조사, 12시간 내 임시 보수 완료...' },
  // ];

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
    
    // 채팅 기록 불러오기
    const loadChatHistory = async () => {
      try {
        const res = await AgentComplaintApi.getChatHistory(complaint.originalId);
        if (res.status === 'success' && res.data) {
          // DB 포맷({role, content})을 프론트 포맷으로 맞춰줌
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

  // 필터링 로직
  // 국 목록: category가 'GUK' 인 것들
  const gukOptions = allDepts.filter(d => d.category === 'GUK');

  // 과 목록: 선택된 국(selectedGukId)을 부모로 가지는 것들
  const gwaOptions = allDepts.filter(d => 
    d.category === 'GWA' && String(d.parentId) === selectedGukId
  );

  // 국 변경 핸들러 (국을 바꾸면, 선택된 과는 초기화)
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

  // AI 초안 작성 핸들러
  const handleDraft = async () => {
    if (!complaint) return;

    // 1. 민원 본문 찾기 (history 중 부모글)
    const targetHistory = complaint.history.find((h) => h.parent) || complaint.history[0];
    const bodyText = targetHistory?.body;

    if (!bodyText) {
      toast.error("분석할 민원 본문 내용이 없습니다.");
      return;
    }

    // 2. 덮어쓰기 경고 (answerContent 사용)
    if (answerContent.trim() && !confirm("작성 중인 내용이 사라지고 AI 초안으로 대체됩니다. 계속하시겠습니까?")) {
      return;
    }

    setIsDrafting(true); // 로딩 시작

    try {
      // 3. API 호출
      const result = await AgentComplaintApi.generateAiDraft(complaint.originalId, bodyText);

      if (result.status === "success") {
        setAnswerContent(result.data); // 결과 적용 (setAnswerContent 사용)
        toast.success("AI 초안이 작성되었습니다.");
      } else {
        toast.error("초안 생성 실패: " + result.status);
      }
    } catch (error) {
      console.error("Draft Error:", error);
      toast.error("AI 서버 연결 실패");
    } finally {
      setIsDrafting(false); // 로딩 끝
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

    // 1. 사용자 메시지 UI 표시 (버튼 클릭 시엔 메시지 표시 안 함 or 선택사항)
    if (action === 'chat') {
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      setChatInput('');
    } else {
      // 버튼 클릭 시 안내 메시지 추가
      setChatMessages((prev) => [...prev, { role: 'user', content: `${message}` }]);
    }

    setIsChatLoading(true);

    try {
      // ID 파싱 (기존 로직 유지)
      let numericId = complaintId;
      if (typeof complaintId === 'string' && complaintId.includes('-')) {
        const parts = complaintId.split('-');
        const lastPart = parts[parts.length - 1];
        if (!isNaN(parseInt(lastPart))) numericId = parseInt(lastPart).toString();
      }

      // 2. Python AI 서버 호출
      const response = await fetch(`http://localhost:8000/api/complaints/${numericId}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: message,
          action: action
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        // 3. 응답 처리
        // (1) AI 답변 말풍선 추가
        setChatMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.data.answer
        }]);

        // (2) 우측 문서 카드 리스트 갱신
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
                  <RefreshCw className="w-4 h-4 mr-2" /> 이관 요청
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

                <TabsTrigger
                  value="knowledge"
                  className="flex-none data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none font-normal data-[state=active]:font-bold rounded-lg transition-all px-4"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  지식·사례 검색
                </TabsTrigger>

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

              {/* ▼▼▼ 기존 knowledge 탭 내용을 이걸로 교체하세요 ▼▼▼ */}
              <TabsContent value="knowledge" className="m-0 h-full">
                <div className="grid grid-cols-3 h-full min-h-0 overflow-hidden"> {/* overflow-hidden 추가로 전체 스크롤 방지 */}

                  {/* 왼쪽: 채팅 영역 (ScrollArea가 있어서 내부에서만 스크롤됨) */}
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
                        <div className="space-y-6"> {/* 메시지 간격 조금 넓힘 */}
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

                    {/* 채팅 입력바 (하단 고정) */}
                    <div className="p-4 border-t border-border bg-white space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map((prompt, i) => ( // suggestedPrompts 변수 활용
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

                  {/* 오른쪽: 근거 카드 영역 (Sticky 효과) */}
                  {/* h-full과 overflow-hidden을 주어 스크롤이 채팅창과 독립적으로 돕니다 */}
                  <div className="bg-slate-50/80 p-4 h-full min-h-0 flex flex-col overflow-hidden border-l">
                    <div className="mb-3 flex items-center justify-between flex-none">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700">
                        <FileCheck className="w-4 h-4 text-blue-600" />
                        참고 문서
                      </h3>
                      <Badge variant="secondary" className="text-[10px]">{documents.length}건</Badge>
                    </div>

                    {/* 카드 리스트 스크롤 영역 */}
                    <ScrollArea className="flex-1 min-h-0 pr-3 -mr-3">
                      {documents.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-10 border-2 border-dashed rounded-lg">
                          검색된 관련 문서가 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3 pb-4">
                          {documents.map((doc, idx) => {
                            const isExpanded = expandedDocIndex === idx;
                            return (
                              <Card
                                key={idx}
                                className={`transition-all duration-200 hover:shadow-md cursor-pointer border-l-4 ${isExpanded ? 'border-l-blue-500 ring-1 ring-blue-200' : 'border-l-transparent hover:border-l-blue-300'
                                  }`}
                                onClick={() => setExpandedDocIndex(isExpanded ? null : idx)}
                              >
                                <CardContent className="p-3 text-xs space-y-2">
                                  <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 font-normal">
                                      법령/규정
                                    </Badge>
                                    {/* 펼침/접힘 아이콘 표시 */}
                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                  </div>

                                  <div className="font-bold text-slate-800 text-sm">
                                    {doc.title || '문서명 없음'} {doc.article_no || doc.section || ''}
                                  </div>

                                  {/* 내용 부분: isExpanded에 따라 line-clamp 해제 */}
                                  <div className={`text-slate-600 bg-slate-50 p-2 rounded leading-relaxed ${isExpanded ? '' : 'line-clamp-3'
                                    }`}>
                                    {doc.chunk_text || doc.content || '내용 없음'}
                                  </div>

                                  {/* 펼쳐졌을 때만 보이는 추가 정보 (예: 정확도) */}
                                  {isExpanded && (
                                    <div className="pt-1 flex justify-end">
                                      <span className="text-[10px] text-blue-600 font-medium">
                                        유사도: {doc.similarity}%
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
          <div className="flex flex-col h-full overflow-hidden">
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
            {/* <div className="flex-1 p-4 min-h-0 flex flex-col">
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
            </div> */}
            <div className="flex-1 p-4 min-h-0 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between mb-2 flex-none">
                <label className="text-sm font-medium text-muted-foreground">내용</label>

                {/* [수정] 기존 버튼에 onClick 연결 및 disabled 처리 */}
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600 h-6"
                    onClick={handleDraft}     // 핸들러 연결
                    disabled={isDrafting}     // 로딩 중 비활성화
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

              {/* [수정] Textarea를 div.relative로 감싸서 로딩 오버레이 추가 */}
              <div className="relative flex-1 flex flex-col min-h-[300px]">
                <Textarea
                  placeholder={isEditable ? "답변을 입력하세요." : "작성 권한이 없습니다."}
                  className="flex-1 resize-none p-4 text-sm focus-visible:ring-1"
                  value={answerContent} // 기존 변수명 유지
                  onChange={(e) => setAnswerContent(e.target.value)} // 기존 함수 유지
                  disabled={!isEditable || isDrafting} // 로딩 중 수정 불가
                />

                {/* 로딩 오버레이 */}
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
            {/* Content Area 끝 */}

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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>이관 요청</DialogTitle><DialogDescription>부서와 사유를 입력하세요.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            {/* [수정] 2단 Select 구조 (Grid 사용) */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* 왼쪽: 국(GUK) 선택 */}
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

              {/* 오른쪽: 과(GWA) 선택 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">과 (하위부서)</label>
                <Select 
                  value={selectedTargetDept} 
                  onValueChange={setSelectedTargetDept}
                  disabled={!selectedGukId} // 국을 선택해야 활성화
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
            {/* 제출 버튼은 기존 selectedTargetDept를 사용하므로 로직 변경 없음 */}
            <Button onClick={handleSubmitReroute} disabled={!selectedTargetDept || !rerouteReason.trim()}>
              제출
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}