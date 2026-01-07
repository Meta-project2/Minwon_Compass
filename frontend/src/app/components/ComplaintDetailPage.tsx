import { useState } from 'react';
import { ArrowLeft, Loader2, FileText, Search as SearchIcon, AlertCircle, Send, Sparkles, FileCheck, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
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

interface ComplaintDetailPageProps {
  complaintId: string;
  onBack: () => void;
}

const statusMap = {
  received: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  normalized: { label: '정규화', color: 'bg-purple-100 text-purple-800' },
  recommended: { label: '추천완료', color: 'bg-cyan-100 text-cyan-800' },
  processing: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '종결', color: 'bg-green-100 text-green-800' },
};

const urgencyMap = {
  low: { label: '낮음', color: 'bg-slate-100 text-slate-700' },
  medium: { label: '보통', color: 'bg-orange-100 text-orange-700' },
  high: { label: '높음', color: 'bg-red-100 text-red-700' },
};

export function ComplaintDetailPage({ complaintId, onBack }: ComplaintDetailPageProps) {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [showRerouteDialog, setShowRerouteDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations?: any[] }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);

  const mockComplaint = {
    id: complaintId,
    title: '도로 파손으로 인한 보수 요청',
    status: 'processing',
    urgency: 'high',
    receivedAt: '2026-01-01 09:23',
    address: '강남구 역삼동 123-45',
    district: '역삼동',
    category: '도로/교통',
    department: '도로관리과',
    incidentId: 'I-2026-001',
    originalText: '역삼동 사거리 인근 도로에 큰 구멍이 생겨서 차량 통행에 위험합니다. 빨리 조치해주세요. 며칠 전부터 이 구멍 때문에 사고가 날 뻔한 적도 있었고, 주민들이 많이 불편해하고 있습니다.',
    attachments: ['도로파손_사진1.jpg', '도로파손_사진2.jpg'],
  };

  const normalizationData = {
    neutralSummary: '역삼동 사거리 인근 도로에 파손 구간이 발생하여 차량 통행의 안전성이 저하되고 있으며, 주민 불편이 지속되고 있음',
    coreRequest: '도로 파손 구간 긴급 보수',
    estimatedCause: '노후화 및 기상 요인으로 인한 포장면 손상 추정',
    targetObject: '역삼동 사거리 인근 도로 포장면',
    keywords: ['도로파손', '보수', '안전', '긴급'],
    locationHint: '강남구 역삼동 사거리 인근',
    urgencyReason: '차량 통행 안전 위험, 주민 불편 지속',
  };

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

  const handleNormalize = () => {
    setIsNormalizing(true);
    setTimeout(() => setIsNormalizing(false), 2000);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    setTimeout(() => {
      const response = {
        role: 'assistant' as const,
        content: '도로법 시행규칙 제12조에 따르면, 도로 파손으로 인한 교통 안전 지장 발생 시 즉시 조치가 필요합니다. 해당 민원의 경우 긴급도가 높으므로 접수 후 24시간 이내 현장 조사 및 임시 조치를 진행해야 합니다.\n\n유사 사례를 참고하면, 역삼동 지역 도로 파손은 평균 4시간 내 현장 조사, 12시간 내 임시 보수가 완료되었습니다.',
        citations: [
          { docName: '도로법 시행규칙', section: '제12조', page: '8' },
          { docName: '도로 유지보수 업무 매뉴얼', section: '제3장', page: '24' },
        ],
      };
      setChatMessages((prev) => [...prev, response]);
      setIsChatLoading(false);
    }, 1500);
  };

  const suggestedPrompts = [
    '관련 규정/매뉴얼 찾아줘',
    '유사 사례 결과 요약해줘',
    '처리 안내 문구(공문체) 초안 작성',
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1>{mockComplaint.title}</h1>
                <Badge className={statusMap[mockComplaint.status as keyof typeof statusMap].color}>
                  {statusMap[mockComplaint.status as keyof typeof statusMap].label}
                </Badge>
                <Badge className={urgencyMap[mockComplaint.urgency as keyof typeof urgencyMap].color}>
                  {urgencyMap[mockComplaint.urgency as keyof typeof urgencyMap].label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{mockComplaint.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="processing">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="processing">처리중</SelectItem>
                <SelectItem value="completed">종결</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowRerouteDialog(true)}>
              재이관 요청
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">접수일시: </span>
            <span>{mockComplaint.receivedAt}</span>
          </div>
          <div>
            <span className="text-muted-foreground">주소: </span>
            <span>{mockComplaint.address}</span>
          </div>
          <div>
            <span className="text-muted-foreground">업무군: </span>
            <Badge variant="outline">{mockComplaint.category}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">담당부서: </span>
            <span>{mockComplaint.department}</span>
          </div>
          <div>
            <span className="text-muted-foreground">사건: </span>
            {mockComplaint.incidentId ? (
              <Badge variant="secondary">{mockComplaint.incidentId}</Badge>
            ) : (
              <span className="text-muted-foreground">미연결</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="normalization" className="h-full flex flex-col">
          <div className="border-b border-border px-6 bg-card">
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

          <div className="flex-1 overflow-auto">
            {/* Tab 1: 원문·정규화 */}
            <TabsContent value="normalization" className="m-0 h-full p-6">
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* Original */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>원문</span>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm leading-relaxed">{mockComplaint.originalText}</p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">첨부파일</div>
                      <div className="space-y-2">
                        {mockComplaint.attachments.map((file) => (
                          <div key={file} className="flex items-center gap-2 p-2 border rounded text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{file}</span>
                            <Button variant="ghost" size="sm">보기</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Normalized */}
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
                    {isNormalizing ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : (
                      <div className="space-y-4 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">중립 요약</div>
                          <p className="p-3 bg-muted rounded">{normalizationData.neutralSummary}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">핵심 요구</div>
                          <p>{normalizationData.coreRequest}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">원인 추정</div>
                          <p>{normalizationData.estimatedCause}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">대상물</div>
                          <p>{normalizationData.targetObject}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">키워드</div>
                          <div className="flex flex-wrap gap-1">
                            {normalizationData.keywords.map((kw) => (
                              <Badge key={kw} variant="secondary">{kw}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">위치 힌트</div>
                          <p>{normalizationData.locationHint}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">긴급 근거</div>
                          <p>{normalizationData.urgencyReason}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab 2: 유사 민원 */}
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

            {/* Tab 3: 사건(군집) */}
            <TabsContent value="incident" className="m-0 h-full p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">연결된 사건</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded bg-muted/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm mb-1">역삼동 도로 파손 집중 발생</h3>
                        <p className="text-xs text-muted-foreground">{mockComplaint.incidentId}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">대응중</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">구성민원수</span>
                        <p>12건</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">행정동</span>
                        <p>역삼동</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">업무군</span>
                        <p>도로/교통</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">사건 상세 보기</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: 지식·사례 검색 */}
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
      </div>

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