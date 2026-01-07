import { useState } from 'react';
import { Search, Filter, X, Eye, AlertCircle } from 'lucide-react';
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

interface IncidentListPageProps {
  onViewDetail: (id: string) => void;
}

const mockIncidents = [
  {
    id: 'I-2026-001',
    title: '역삼동 도로 파손 집중 발생',
    status: 'responding',
    category: '도로/교통',
    district: '역삼동',
    complaintCount: 12,
    lastUpdate: '2026-01-01 14:30',
  },
  {
    id: 'I-2026-002',
    title: '잠실동 소음 민원 다발',
    status: 'resolved',
    category: '환경/시설',
    district: '잠실동',
    complaintCount: 8,
    lastUpdate: '2025-12-31 18:20',
  },
  {
    id: 'I-2025-345',
    title: '삼성동 불법주차 반복 발생',
    status: 'occurred',
    category: '도로/교통',
    district: '삼성동',
    complaintCount: 15,
    lastUpdate: '2025-12-30 11:45',
  },
  {
    id: 'I-2025-344',
    title: '대치동 가로수 관리 요청',
    status: 'closed',
    category: '환경/시설',
    district: '대치동',
    complaintCount: 5,
    lastUpdate: '2025-12-29 16:10',
  },
];

const statusMap = {
  occurred: { label: '발생', color: 'bg-blue-100 text-blue-800' },
  responding: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  resolved: { label: '해결', color: 'bg-green-100 text-green-800' },
  closed: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

export function IncidentListPage({ onViewDetail }: IncidentListPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1>사건(군집)</h1>
        <p className="text-sm text-muted-foreground">연관된 민원들을 하나의 사건으로 관리</p>
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="bg-card border-b border-border p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="사건ID/제목 검색"
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
              <SelectItem value="occurred">발생</SelectItem>
              <SelectItem value="responding">대응중</SelectItem>
              <SelectItem value="resolved">해결</SelectItem>
              <SelectItem value="closed">종결</SelectItem>
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

          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="행정동" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 행정동</SelectItem>
              <SelectItem value="yeoksam">역삼동</SelectItem>
              <SelectItem value="samsung">삼성동</SelectItem>
              <SelectItem value="daechi">대치동</SelectItem>
              <SelectItem value="jamsil">잠실동</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-3 py-2 border rounded bg-input-background">
            <span className="text-sm text-muted-foreground">구성민원수</span>
            <Input type="number" placeholder="최소" className="w-16 h-8 text-sm" />
            <span className="text-muted-foreground">-</span>
            <Input type="number" placeholder="최대" className="w-16 h-8 text-sm" />
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
                <TableHead>사건 ID</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>업무군</TableHead>
                <TableHead>행정동</TableHead>
                <TableHead className="text-center">구성민원수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>최근 업데이트</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockIncidents.map((incident) => (
                <TableRow key={incident.id} className="cursor-pointer hover:bg-accent">
                  <TableCell className="text-sm">{incident.id}</TableCell>
                  <TableCell>
                    <span>{incident.title}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{incident.category}</Badge>
                  </TableCell>
                  <TableCell>{incident.district}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{incident.complaintCount}건</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusMap[incident.status as keyof typeof statusMap].color}>
                      {statusMap[incident.status as keyof typeof statusMap].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {incident.lastUpdate}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetail(incident.id)}
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

        {/* Empty State */}
        {mockIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="mb-1">조건에 맞는 사건이 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              필터 조건을 변경하거나 초기화해보세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}