import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Search as SearchIcon, 
  Send, 
  Sparkles, 
  FileCheck, 
  ExternalLink, 
  Save 
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
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
import { toast } from 'sonner';

// ★ API import 추가
import { AgentComplaintApi, ComplaintDetailDto } from '../../api/AgentComplaintApi';

interface ComplaintDetailPageProps {
  complaintId: string;
  onBack: () => void;
}

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
  // ★ 실제 데이터를 담을 State
  const [complaint, setComplaint] = useState<ComplaintDetailDto | null>(null);
  const [loading, setLoading] = useState(true);

  const [isNormalizing, setIsNormalizing] = useState(false);
  const [showRerouteDialog, setShowRerouteDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: any[] }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);

  // 답변 작성용 상태
  const [answerContent, setAnswerContent] = useState('');
  const [processStatus, setProcessStatus] = useState('processing');

  // ★ 아직 백엔드 연동 전인 Mock 데이터들 (유사민원, 지식검색)
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

  // ★ API 호출 Effect
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await AgentComplaintApi.getDetail(complaintId);
        setComplaint(data);
      } catch (error) {
        console.error("상세 조회 실패", error);
        toast.error("민원 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [complaintId]);

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

      // ID 파싱 로직
      // 예: "C2026-0003" -> split('-') -> ["C2026", "0003"] -> parseInt("0003") -> 3
      let numericId = complaintId; 
      if (typeof complaintId === 'string' && complaintId.includes('-')) {
          const parts = complaintId.split('-');
          // 마지막 부분이 숫자인지 확인하고 변환
          const lastPart = parts[parts.length - 1];
          if (!isNaN(parseInt(lastPart))) {
              numericId = parseInt(lastPart).toString(); // URL에 넣을 때는 문자열이어도 숫자로 된 문자열이면 OK
          }
      }
      
      console.log(`[*] 변환된 ID: ${complaintId} -> ${numericId}`); //확인용
      
      // 파이썬 서버로 실제 요청 전송 (POST)
      // 주의: complaintId는 props로 받아온 값을 사용합니다.
      const response = await fetch(`http://localhost:8000/api/complaints/${numericId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage }),
      });

      const data = await response.json();

      // 서버 응답 처리
      if (data.status === 'success') {
        // 성공 시: AI 답변 표시
        const botResponse = {
          role: 'assistant' as const,
          content: data.result, // 백엔드에서 준 답변 텍스트
          citations: [],        // (나중에 백엔드에서 근거 자료 보내주면 여기에 연결)
        };
        setChatMessages((prev) => [...prev, botResponse]);
      } else {
        // 백엔드 내부 에러 (예: DB 연결 실패) -> 에러 메시지를 말풍선으로 표시
        const errorResponse = {
          role: 'assistant' as const,
          content: `⚠️ 처리 실패: ${data.message}`, 
        };
        setChatMessages((prev) => [...prev, errorResponse]);
      }

    } catch (error) {
      // 4. 네트워크 통신 에러 (서버 꺼짐 등)
      console.error("Chat API Error:", error);
      const errorResponse = {
        role: 'assistant' as const,
        content: "🚫 서버와 연결할 수 없습니다. 백엔드가 켜져 있는지 확인해주세요.",
      };
      setChatMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsChatLoading(false); // 로딩 종료
    }

    
  };

  const suggestedPrompts = [
    '관련 규정/매뉴얼 찾아줘',
    '유사 사례 결과 요약해줘',
    '처리 안내 문구(공문체) 초안 작성',
  ];

  // 로딩 상태 처리
  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  // 데이터 없음 처리
  if (!complaint) {
    return <div className="h-full flex items-center justify-center">데이터를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 1. Header (실제 데이터 바인딩) */}
      <div className="border-b border-border bg-card px-6 py-4 flex-none">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRerouteDialog(true)}>
              재이관 요청
            </Button>
          </div>
        </div>

        {/* 상세 정보 Grid */}
        <div className="grid grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">접수일시: </span>
            <span>{complaint.receivedAt}</span>
          </div>
          {/* <div>
            <span className="text-muted-foreground">주소: </span>
            <span>{complaint.address || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">업무군: </span>
            <Badge variant="outline">{complaint.category || '미지정'}</Badge>
          </div> */}
          <div>
            <span className="text-muted-foreground">담당부서: </span>
            <span>{complaint.departmentName || '미배정'}</span>
          </div>          
          <div>
            <span className="text-muted-foreground">담당자: </span>
            <span>{complaint.departmentName || '미배정'}</span>
          </div>
          
          <div>
            <span className="text-muted-foreground">사건: </span>
            {complaint.incidentId ? (
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">{complaint.incidentId}</Badge>
            ) : (
              <span className="text-muted-foreground">미연결</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Split View Container */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        
        {/* [왼쪽 패널] 정보 조회 영역 */}
        <ResizablePanel defaultSize={75} minSize={40}>
          <Tabs defaultValue="normalization" className="h-full flex flex-col">
            <div className="border-b border-border px-6 bg-card flex-none h-14 flex items-center">
              <TabsList>
                <TabsTrigger value="normalization">원문·정규화</TabsTrigger>
                <TabsTrigger value="similar">유사 민원</TabsTrigger>
                <TabsTrigger value="incident">사건(군집)</TabsTrigger>
                <TabsTrigger value="knowledge">
                  <Sparkles className="h-4 w-4 mr-1" />
                  지식·사례 검색
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/30">
              
              {/* [Tab 1] 원문·정규화 (Real Data) */}
              <TabsContent value="normalization" className="m-0 h-full p-6">
                <div className="grid grid-cols-2 gap-6 h-full">
                  {/* 원문 카드 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>원문</span>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        {/* ★ DB Body 바인딩 */}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{complaint.body}</p>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">첨부파일</div>
                        {/* ★ 첨부파일은 Mock 유지 */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 border rounded text-sm bg-white">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1">현장사진_01.jpg</span>
                              <Button variant="ghost" size="sm">보기</Button>
                            </div>
                            <div className="flex items-center gap-2 p-2 border rounded text-sm bg-white">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1">현장사진_02.jpg</span>
                              <Button variant="ghost" size="sm">보기</Button>
                            </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 정규화 결과 카드 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>정규화 결과</span>
                        <Button size="sm" onClick={handleNormalize} disabled={isNormalizing}>
                           {isNormalizing ? (
                             <>
                               <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                               생성 중…
                             </>
                           ) : (
                             <>
                               <Sparkles className="h-3 w-3 mr-1" />
                               정규화 재실행
                             </>
                           )}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* 데이터 유무 체크 */}
                      {!complaint.neutralSummary ? (
                        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
                          아직 분석된 데이터가 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-4 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">중립 요약</div>
                            <p className="p-3 bg-muted rounded">{complaint.neutralSummary}</p>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">핵심 요구</div>
                            <p>{complaint.coreRequest || '-'}</p>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">원인 추정</div>
                            <p>{complaint.coreCause || '-'}</p>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">대상물</div>
                            <p>{complaint.targetObject || '-'}</p>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-2">키워드</div>
                            <div className="flex flex-wrap gap-1">
                              {complaint.keywords?.map((kw, idx) => (
                                <Badge key={idx} variant="secondary">{kw}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">위치 힌트</div>
                            <p>{complaint.locationHint || '-'}</p>
                          </div>
                          {/* ★ 긴급 근거 삭제됨 */}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* [Tab 2] 유사 민원 (Mock Data) */}
              <TabsContent value="similar" className="m-0 h-full p-6">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="기간" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 기간</SelectItem>
                        <SelectItem value="1m">1개월</SelectItem>
                        <SelectItem value="3m">3개월</SelectItem>
                        <SelectItem value="6m">6개월</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>유사도</TableHead>
                          <TableHead>민원 ID</TableHead>
                          <TableHead>접수일</TableHead>
                          <TableHead>처리부서</TableHead>
                          <TableHead>처리결과</TableHead>
                          <TableHead>요약</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {similarCases.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={c.similarity} className="w-16" />
                                <span className="text-sm">{c.similarity}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{c.id}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.date}</TableCell>
                            <TableCell className="text-sm">{c.department}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">{c.result}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{c.summary}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </TabsContent>

              {/* [Tab 3] 사건(군집) (Real Data) */}
              <TabsContent value="incident" className="m-0 h-full p-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">연결된 사건</CardTitle>
                  </CardHeader>
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
                            <div>
                              <span className="text-xs text-muted-foreground">구성민원수</span>
                              <p>{complaint.incidentComplaintCount}건</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">행정동</span>
                              {/* 주소에서 '동' 정보 추출 또는 간단히 처리 */}
                              <p>{complaint.address ? complaint.address.split(' ')[1] : '-'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">업무군</span>
                              <p>{complaint.category || '도로/교통'}</p>
                            </div>
                        </div>
                        </div>
                    ) : (
                        <div className="flex h-32 items-center justify-center text-muted-foreground">
                            연결된 사건(군집)이 없습니다.
                        </div>
                    )}
                    {complaint.incidentId && <Button variant="outline" className="w-full">사건 상세 보기</Button>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* [Tab 4] 지식·사례 검색 (Mock Data) */}
              <TabsContent value="knowledge" className="m-0 h-full">
                <div className="grid grid-cols-3 h-full">
                  {/* Chat Area */}
                  <div className="col-span-2 border-r border-border flex flex-col">
                    <ScrollArea className="flex-1 p-6">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                          <SearchIcon className="h-12 w-12 text-muted-foreground" />
                          <div>
                            <h3 className="mb-2">규정/매뉴얼/유사사례를 자연어로 질문</h3>
                            <p className="text-sm text-muted-foreground">
                              질문을 입력하거나 아래 추천 버튼을 클릭하세요
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded p-3 ${
                                msg.role === 'user' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                {msg.citations && msg.citations.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                                    <div className="text-xs opacity-80">근거:</div>
                                    {msg.citations.map((citation, i) => (
                                      <div key={i} className="text-xs opacity-90">
                                        • {citation.docName} · {citation.section} · p.{citation.page}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {isChatLoading && (
                            <div className="flex justify-start">
                              <div className="bg-muted rounded p-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t border-border space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map((prompt) => (
                          <Button
                            key={prompt}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setChatInput(prompt);
                              handleSendChat();
                            }}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="질문을 입력하세요"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          className="bg-input-background"
                        />
                        <Button onClick={handleSendChat} disabled={isChatLoading || !chatInput.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Sources Panel */}
                  <div className="bg-muted/30 p-4">
                    <h3 className="text-sm mb-3">검색된 문서/청크</h3>
                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {knowledgeSources.map((source) => (
                          <Card
                            key={source.id}
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => setSelectedSource(source)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <Badge variant="outline" className="text-xs">{source.type}</Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileCheck className="h-3 w-3" />
                                  {source.confidence}%
                                </div>
                              </div>
                              <h4 className="text-xs">{source.title}</h4>
                              <p className="text-xs text-muted-foreground">{source.section}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{source.snippet}</p>
                              <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                미리보기
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </ResizablePanel>

        {/* 핸들 */}
        <ResizableHandle withHandle />

        {/* [오른쪽 패널] 답변 작성 영역 */}
        <ResizablePanel defaultSize={25} minSize={25} className="bg-background border-l">
          <div className="flex flex-col h-full">
            <div className="h-14 px-4 border-b flex items-center justify-between bg-card flex-none">
              <span className="font-semibold text-sm">답변 및 처리</span>
              <Badge variant="outline" className="text-xs font-normal">작성 중</Badge>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">처리 결과 선택</label>
                  <Select value={processStatus} onValueChange={setProcessStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">🟡 처리중 (임시저장)</SelectItem>
                      <SelectItem value="completed">🟢 처리 완료 (답변 발송)</SelectItem>
                      <SelectItem value="rejected">🔴 반려/불가</SelectItem>
                      {/* <SelectItem value="transfer">↪️ 타부서 이관</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                     <label className="text-sm font-medium text-muted-foreground">답변 내용</label>
                     <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 h-6">
                       <Sparkles className="w-3 h-3 mr-1" />
                       AI 초안 생성
                     </Button>
                  </div>
                  <Textarea 
                    placeholder="민원인에게 전송할 답변 내용을 작성하세요." 
                    className="min-h-[400px] resize-none leading-relaxed p-4 text-sm"
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {answerContent.length}자 작성됨
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-gray-50/50">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  임시 저장
                </Button>
                <Button className="w-full" onClick={() => toast.success('답변이 등록되었습니다.')}>
                  <Send className="w-4 h-4 mr-2" />
                  {processStatus === 'completed' ? '답변 전송 및 종결' : '저장'}
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

      </ResizablePanelGroup>

      {/* Re-route Dialog */}
      <Dialog open={showRerouteDialog} onOpenChange={setShowRerouteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재이관 요청</DialogTitle>
            <DialogDescription>
              왜 우리 부서 소관이 아닌지 구체적으로 작성해 주세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm">희망 부서 *</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="env">환경관리과</SelectItem>
                  <SelectItem value="facility">시설관리과</SelectItem>
                  <SelectItem value="traffic">교통행정과</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm">사유 *</label>
              <Textarea
                placeholder="재이관이 필요한 이유를 입력하세요"
                rows={4}
                className="bg-input-background"
              />
            </div>
            <Card className="bg-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">참고 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Top-1 추천 부서</span>
                  <span>환경관리과</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">신뢰도</span>
                  <span>87%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">근거: </span>
                  <span className="text-xs">유사 민원 처리 이력 기반</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRerouteDialog(false)}>
              취소
            </Button>
            <Button onClick={() => {
              setShowRerouteDialog(false);
              toast('재이관 요청이 접수되었습니다(승인 대기)');
            }}>
              요청 제출
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}