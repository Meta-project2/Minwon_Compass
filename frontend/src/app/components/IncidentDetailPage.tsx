import { useState } from 'react';
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

const statusMap = {
  occurred: { label: '발생', color: 'bg-blue-100 text-blue-800' },
  responding: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  resolved: { label: '해결', color: 'bg-green-100 text-green-800' },
  closed: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

const complaintStatusMap = {
  received: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  processing: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '종결', color: 'bg-green-100 text-green-800' },
};

const mockIncident = {
  id: 'I-2026-001',
  title: '역삼동 도로 파손 집중 발생',
  status: 'responding',
  category: '도로/교통',
  district: '역삼동',
  firstOccurred: '2025-12-28 09:15',
  lastOccurred: '2026-01-01 14:30',
  complaintCount: 12,
  avgProcessTime: '4.5시간',
};

const mockComplaints = [
  { id: 'C2026-0001', title: '도로 파손으로 인한 보수 요청', status: 'processing', receivedAt: '2026-01-01 09:23', urgency: 'high' },
  { id: 'C2026-0005', title: '보도블록 파손 보수', status: 'processing', receivedAt: '2025-12-31 11:05', urgency: 'medium' },
  { id: 'C2025-9876', title: '도로 균열 신고', status: 'completed', receivedAt: '2025-12-30 15:40', urgency: 'low' },
  { id: 'C2025-9823', title: '역삼동 도로 상태 불량', status: 'completed', receivedAt: '2025-12-29 10:22', urgency: 'medium' },
  { id: 'C2025-9801', title: '보도 파손 긴급 조치 요청', status: 'completed', receivedAt: '2025-12-28 14:10', urgency: 'high' },
];

const mockTimeline = [
  { date: '2026-01-01 14:30', type: 'complaint', content: '신규 민원 추가 (C2026-0001)' },
  { date: '2026-01-01 10:00', type: 'note', content: '현장 조사 완료, 임시 보수 진행 중', author: '김담당' },
  { date: '2025-12-31 11:05', type: 'complaint', content: '신규 민원 추가 (C2026-0005)' },
  { date: '2025-12-30 16:00', type: 'status', content: '상태 변경: 발생 → 대응중' },
  { date: '2025-12-30 15:40', type: 'complaint', content: '신규 민원 추가 (C2025-9876)' },
  { date: '2025-12-28 09:15', type: 'incident', content: '사건 생성' },
];

const mockNotes = [
  { id: 'N1', author: '김담당', date: '2026-01-01 10:00', content: '현장 조사 완료. 역삼동 주요 도로 3곳에서 파손 구간 확인. 임시 보수 작업 진행 중이며, 본 보수는 1월 3일 예정.' },
  { id: 'N2', author: '이과장', date: '2025-12-30 14:30', content: '기상청 자료 확인 결과 최근 한파로 인한 도로 균열 가능성 높음. 유사 지역 예방 점검 필요.' },
];

export function IncidentDetailPage({ incidentId, onBack, onViewComplaint }: IncidentDetailPageProps) {
  const [newNote, setNewNote] = useState('');

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
                <h1>{mockIncident.title}</h1>
                <Badge className={statusMap[mockIncident.status as keyof typeof statusMap].color}>
                  {statusMap[mockIncident.status as keyof typeof statusMap].label}
                </Badge>
                <Badge variant="outline">{mockIncident.category}</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{mockIncident.id}</span>
                <span>•</span>
                <span>{mockIncident.district}</span>
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
                  <div className="text-sm">{mockIncident.firstOccurred}</div>
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
                  <div className="text-sm">{mockIncident.lastOccurred}</div>
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
                  <div className="text-sm">{mockIncident.complaintCount}건</div>
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
                  <div className="text-sm">{mockIncident.avgProcessTime}</div>
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
                    {mockComplaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="text-sm">{complaint.id}</TableCell>
                        <TableCell>{complaint.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {complaint.receivedAt}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              complaint.urgency === 'high'
                                ? 'bg-red-100 text-red-700'
                                : complaint.urgency === 'medium'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-700'
                            }
                          >
                            {complaint.urgency === 'high' ? '높음' : complaint.urgency === 'medium' ? '보통' : '낮음'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              complaintStatusMap[complaint.status as keyof typeof complaintStatusMap].color
                            }
                          >
                            {complaintStatusMap[complaint.status as keyof typeof complaintStatusMap].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewComplaint(complaint.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            열기
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Tab 2: 타임라인 */}
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
                          {item.author && (
                            <div className="text-xs text-muted-foreground mt-1">작성자: {item.author}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: 메모 */}
            <TabsContent value="notes" className="m-0 h-full p-6">
              <div className="space-y-4">
                {/* Add Note */}
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

                {/* Existing Notes */}
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
