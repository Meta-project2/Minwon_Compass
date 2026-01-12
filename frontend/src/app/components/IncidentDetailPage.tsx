import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Calendar, Users, Clock, Eye, AlertCircle, MessageSquare, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Textarea } from './ui/textarea';

interface IncidentDetailPageProps {
  incidentId: string;
  onBack: () => void;
  onViewComplaint: (id: string) => void;
}

// 백엔드 DTO 타입 정의
interface IncidentDetailResponse {
  id: string;
  title: string;
  status: string;
  district: string;
  firstOccurred: string;
  lastOccurred: string;
  complaintCount: number;
  avgProcessTime: string;
  complaints: {
    id: string;
    originalId: number;
    title: string;
    receivedAt: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    status: string;
  }[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '발생', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '해결', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

const urgencyMap: Record<string, { label: string; color: string }> = {
  HIGH: { label: '높음', color: 'bg-red-100 text-red-700' },
  MEDIUM: { label: '보통', color: 'bg-orange-100 text-orange-700' },
  LOW: { label: '낮음', color: 'bg-slate-100 text-slate-700' },
};

const complaintStatusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  NORMALIZED: { label: '정규화', color: 'bg-purple-100 text-purple-800' },
  RECOMMENDED: { label: '추천완료', color: 'bg-cyan-100 text-cyan-800' },
  IN_PROGRESS: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  CLOSED: { label: '종결', color: 'bg-green-100 text-green-800' },
};

// 타임라인과 메모는 아직 백엔드 API가 없으므로 목업 데이터 유지
const mockTimeline = [
  { date: '2026-01-01 14:30', type: 'complaint', content: '신규 민원 추가' },
  { date: '2026-01-01 10:00', type: 'note', content: '현장 조사 완료, 임시 보수 진행 중', author: '김담당' },
  { date: '2025-12-28 09:15', type: 'incident', content: '사건 생성' },
];

const mockNotes = [
  { id: 'N1', author: '김담당', date: '2026-01-01 10:00', content: '현장 조사 완료. 역삼동 주요 도로 3곳에서 파손 구간 확인. 임시 보수 작업 진행 중이며, 본 보수는 1월 3일 예정.' },
];

export function IncidentDetailPage({ incidentId, onBack, onViewComplaint }: IncidentDetailPageProps) {
  const [incidentData, setIncidentData] = useState<IncidentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');

  // API 호출
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        // incidentId (예: I-2026-0001) 그대로 전송
        const response = await axios.get(`/api/agent/incidents/${incidentId}`);
        setIncidentData(response.data);
      } catch (error) {
        console.error("사건 상세 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    if (incidentId) {
      fetchDetail();
    }
  }, [incidentId]);

  if (loading) {
    return <div className="h-full flex items-center justify-center">로딩 중...</div>;
  }

  if (!incidentData) {
    return <div className="h-full flex items-center justify-center">데이터를 찾을 수 없습니다.</div>;
  }

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
                <h1>{incidentData.title}</h1>
                <Badge className={statusMap[incidentData.status]?.color || 'bg-gray-100'}>
                  {statusMap[incidentData.status]?.label || incidentData.status}
                </Badge>
                {/* 업무군(Category) 배지 제거됨 */}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono">{incidentData.id}</span>
                <span>•</span>
                <span>{incidentData.district}</span>
              </div>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button variant="outline" disabled>
                    상태 변경
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>운영자 권한 필요</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">최초 발생</div>
                  <div className="text-sm">{incidentData.firstOccurred}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-700" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">최근 발생</div>
                  <div className="text-sm">{incidentData.lastOccurred}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">구성민원수</div>
                  <div className="text-sm">{incidentData.complaintCount}건</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">평균 처리시간</div>
                  <div className="text-sm">{incidentData.avgProcessTime}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="complaints" className="h-full flex flex-col">
          <div className="border-b border-border px-6 bg-card">
            <TabsList>
              <TabsTrigger value="complaints">구성민원</TabsTrigger>
              <TabsTrigger value="timeline">타임라인</TabsTrigger>
              <TabsTrigger value="notes">메모</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            {/* Tab 1: 구성민원 */}
            <TabsContent value="complaints" className="m-0 h-full p-6">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>민원 ID</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>접수일시</TableHead>
                      <TableHead>긴급도</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidentData.complaints.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            연결된 민원이 없습니다.
                          </TableCell>
                        </TableRow>
                    ) : (
                        incidentData.complaints.map((complaint) => (
                          <TableRow key={complaint.id}>
                            <TableCell className="text-sm font-mono">{complaint.id}</TableCell>
                            <TableCell>{complaint.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {complaint.receivedAt}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={urgencyMap[complaint.urgency]?.color || 'bg-gray-100'}
                              >
                                {urgencyMap[complaint.urgency]?.label || complaint.urgency}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={complaintStatusMap[complaint.status]?.color || 'bg-gray-100'}
                              >
                                {complaintStatusMap[complaint.status]?.label || complaint.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewComplaint(String(complaint.originalId))}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                열기
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Tab 2: 타임라인 (목업 유지) */}
            <TabsContent value="timeline" className="m-0 h-full p-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {mockTimeline.map((item, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              item.type === 'complaint'
                                ? 'bg-blue-100'
                                : item.type === 'status'
                                ? 'bg-yellow-100'
                                : item.type === 'note'
                                ? 'bg-purple-100'
                                : 'bg-green-100'
                            }`}
                          >
                            {item.type === 'complaint' ? (
                              <AlertCircle className="h-4 w-4 text-blue-700" />
                            ) : item.type === 'note' ? (
                              <MessageSquare className="h-4 w-4 text-purple-700" />
                            ) : (
                              <Calendar className="h-4 w-4 text-slate-700" />
                            )}
                          </div>
                          {index < mockTimeline.length - 1 && (
                            <div className="w-px h-full min-h-[40px] bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="text-sm text-muted-foreground mb-1">{item.date}</div>
                          <div className="text-sm">{item.content}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                             {item.type === 'incident' ? '시스템 자동 생성' : '작성자: 김담당'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: 메모 (목업 유지) */}
            <TabsContent value="notes" className="m-0 h-full p-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">메모 추가</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="메모 내용을 입력하세요"
                      rows={3}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="bg-input-background"
                    />
                    <div className="flex justify-end">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        메모 추가
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {mockNotes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                            {note.author[0]}
                          </div>
                          <div>
                            <div className="text-sm">{note.author}</div>
                            <div className="text-xs text-muted-foreground">{note.date}</div>
                          </div>
                        </div>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm leading-relaxed">{note.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}