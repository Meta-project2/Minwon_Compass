import { useState } from 'react';
import { Search, Filter, X, Eye, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
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
import { Checkbox } from './ui/checkbox';

interface ComplaintListPageProps {
  onViewDetail: (id: string) => void;
}

const mockComplaints = [
  {
    id: 'C2026-0001',
    receivedAt: '2026-01-01 09:23',
    title: '도로 파손으로 인한 보수 요청',
    category: '도로/교통',
    urgency: 'high',
    incidentId: 'I-2026-001',
    status: 'processing',
    tags: ['지역급증'],
    address: '강남구 역삼동',
  },
  {
    id: 'C2026-0002',
    receivedAt: '2026-01-01 08:15',
    title: '공원 가로등 고장 신고',
    category: '환경/시설',
    urgency: 'medium',
    incidentId: null,
    status: 'normalized',
    tags: [],
    address: '서초구 서초동',
  },
  {
    id: 'C2026-0003',
    receivedAt: '2025-12-31 16:42',
    title: '불법 주정차 단속 요청',
    category: '도로/교통',
    urgency: 'low',
    incidentId: null,
    status: 'received',
    tags: ['반복'],
    address: '강남구 삼성동',
  },
  {
    id: 'C2026-0004',
    receivedAt: '2025-12-31 14:20',
    title: '소음 민원 처리 요청',
    category: '환경/시설',
    urgency: 'high',
    incidentId: 'I-2026-002',
    status: 'completed',
    tags: ['악성'],
    address: '송파구 잠실동',
  },
  {
    id: 'C2026-0005',
    receivedAt: '2025-12-31 11:05',
    title: '보도블록 파손 보수',
    category: '도로/교통',
    urgency: 'medium',
    incidentId: 'I-2026-001',
    status: 'processing',
    tags: [],
    address: '강남구 역삼동',
  },
];

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

const tagMap = {
  악성: 'bg-red-100 text-red-700 border-red-300',
  반복: 'bg-orange-100 text-orange-700 border-orange-300',
  지역급증: 'bg-purple-100 text-purple-700 border-purple-300',
  키워드급증: 'bg-blue-100 text-blue-700 border-blue-300',
};

export function ComplaintListPage({ onViewDetail }: ComplaintListPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [includeIncidents, setIncludeIncidents] = useState(false);
  const [tagsOnly, setTagsOnly] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);

  const selectedComplaintData = mockComplaints.find((c) => c.id === selectedComplaint);

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${selectedComplaint ? 'mr-80' : ''}`}>
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="mb-1">
            <h1>민원함</h1>
          </div>
          <p className="text-sm text-muted-foreground">내 부서 배정 민원</p>
        </div>

        {/* Unified Search & Filter Bar */}
        <div className="bg-card border-b border-border p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="제목/내용/주소/민원ID 검색"
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
                <SelectItem value="received">접수</SelectItem>
                <SelectItem value="normalized">정규화</SelectItem>
                <SelectItem value="processing">처리중</SelectItem>
                <SelectItem value="completed">종결</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32 bg-input-background">
                <SelectValue placeholder="업무군" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 업무군</SelectItem>
                <SelectItem value="road">도로/교통</SelectItem>
                <SelectItem value="env">환경/시설</SelectItem>
                <SelectItem value="admin">행정/민원</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
              <SelectTrigger className="w-32 bg-input-background">
                <SelectValue placeholder="긴급도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 긴급도</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2 px-3 py-2 border rounded bg-input-background">
              <Checkbox
                id="incidents"
                checked={includeIncidents}
                onCheckedChange={(checked) => setIncludeIncidents(checked as boolean)}
              />
              <label htmlFor="incidents" className="text-sm cursor-pointer">
                사건 포함
              </label>
            </div>

            <div className="flex items-center space-x-2 px-3 py-2 border rounded bg-input-background">
              <Checkbox
                id="tags"
                checked={tagsOnly}
                onCheckedChange={(checked) => setTagsOnly(checked as boolean)}
              />
              <label htmlFor="tags" className="text-sm cursor-pointer">
                특이 태그만
              </label>
            </div>

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
                  <TableHead>접수일시</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>업무군</TableHead>
                  <TableHead>긴급도</TableHead>
                  <TableHead>사건</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>특이태그</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockComplaints.map((complaint) => (
                  <TableRow
                    key={complaint.id}
                    className={`cursor-pointer ${
                      selectedComplaint === complaint.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedComplaint(complaint.id)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {complaint.receivedAt}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{complaint.title}</span>
                        <span className="text-xs text-muted-foreground">{complaint.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{complaint.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={urgencyMap[complaint.urgency as keyof typeof urgencyMap].color}>
                        {urgencyMap[complaint.urgency as keyof typeof urgencyMap].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {complaint.incidentId ? (
                        <Badge variant="secondary">{complaint.incidentId}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMap[complaint.status as keyof typeof statusMap].color}>
                        {statusMap[complaint.status as keyof typeof statusMap].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {complaint.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={tagMap[tag as keyof typeof tagMap]}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail(complaint.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        열기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Right Preview Panel */}
      {selectedComplaint && selectedComplaintData && (
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-card border-l border-border overflow-y-auto">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm">미리보기</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedComplaint(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">민원 ID</div>
              <div className="text-sm">{selectedComplaintData.id}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">제목</div>
              <div className="text-sm">{selectedComplaintData.title}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">중립 요약</div>
              <div className="text-sm p-3 bg-muted rounded border">
                {selectedComplaintData.status === 'received' ? (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    정규화 대기
                  </div>
                ) : (
                  <p>
                    {selectedComplaintData.address} 지역에서 {selectedComplaintData.category} 관련 문제가 발생하여 신속한 처리가 필요합니다.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">위치</div>
                <div className="text-sm">{selectedComplaintData.address}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">긴급도</div>
                <Badge className={urgencyMap[selectedComplaintData.urgency as keyof typeof urgencyMap].color}>
                  {urgencyMap[selectedComplaintData.urgency as keyof typeof urgencyMap].label}
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">사건 연결</div>
              {selectedComplaintData.incidentId ? (
                <Badge variant="secondary">{selectedComplaintData.incidentId}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">미연결</span>
              )}
            </div>

            <div className="pt-4 space-y-2">
              <Button className="w-full" onClick={() => onViewDetail(selectedComplaintData.id)}>
                상세 열기
              </Button>
              <Button variant="outline" className="w-full">
                재이관 요청
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
