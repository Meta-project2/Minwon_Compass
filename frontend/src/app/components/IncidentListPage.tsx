import { useState, useEffect } from 'react';
import axios from 'axios';
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

// 백엔드 DTO 규격에 맞춘 인터페이스
interface IncidentResponse {
  id: string;            // 예: I-2026-0001
  originalId: number;    // DB PK
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  complaintCount: number;
  openedAt: string;      // yyyy-MM-dd HH:mm
}

// 백엔드 Enum 상태값에 따른 라벨과 색상 매핑
const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '발생', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '해결', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

export function IncidentListPage({ onViewDetail }: IncidentListPageProps) {
  // 데이터 및 로딩 상태
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // API 호출 함수
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      // 쿼리 파라미터 구성 (빈 값이거나 all이면 파라미터 제외)
      const params: any = {};
      if (searchQuery.trim()) {
        params.search = searchQuery;
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      // API 호출 (GET /api/agent/incidents)
      const response = await axios.get('/api/agent/incidents', { params });
      setIncidents(response.data);
    } catch (error) {
      console.error('사건 목록을 불러오는데 실패했습니다:', error);
      // 필요 시 에러 토스트 메시지 등을 여기에 추가
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 및 필터(Status) 변경 시 자동 조회
  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  // 검색 버튼 또는 엔터키 입력 시 조회 핸들러
  const handleSearch = () => {
    fetchIncidents();
  };

  // 필터 초기화 핸들러
  const handleReset = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    // 상태 변경 후 바로 재조회를 위해 fetchIncidents를 호출하고 싶으나,
    // setState가 비동기이므로 useEffect에 의존하거나 reload를 사용
    // 여기서는 간단하게 새로고침 효과를 주기 위해 location reload 혹은
    // setTimeout을 이용해 상태 반영 후 호출할 수 있음.
    // 가장 깔끔한 방법은 리셋 버튼 클릭 시 상태를 초기화하고 useEffect가 돌게 하는 것.
    // (현재 useEffect에 selectedStatus가 걸려있으므로 상태값 'all' 변경 시 자동 호출됨)
    if (selectedStatus === 'all' && searchQuery === '') {
        // 이미 초기 상태라면 강제 리프레시
        fetchIncidents();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1>사건(군집)</h1>
        <p className="text-sm text-muted-foreground">연관된 민원들을 하나의 사건으로 관리</p>
      </div>

      {/* 검색 및 필터 영역 */}
      <div className="bg-card border-b border-border p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="사건ID 또는 제목 검색 (엔터)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="pl-9 bg-input-background"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* 상태 필터 */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="OPEN">발생</SelectItem>
              <SelectItem value="IN_PROGRESS">대응중</SelectItem>
              <SelectItem value="RESOLVED">해결</SelectItem>
              <SelectItem value="CLOSED">종결</SelectItem>
            </SelectContent>
          </Select>

          {/* 초기화 버튼 */}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReset}>
            <X className="h-4 w-4 mr-1" />
            필터 초기화
          </Button>
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사건 ID</TableHead>
                <TableHead>제목</TableHead>
                {/* 업무군, 행정동 제외됨 */}
                <TableHead className="text-center">구성민원수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>최초 발생일</TableHead>
                <TableHead>최근 업데이트</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <span>데이터를 불러오는 중입니다...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : incidents.length > 0 ? (
                incidents.map((incident) => (
                  <TableRow key={incident.id} className="cursor-pointer hover:bg-accent">
                    <TableCell className="text-sm font-medium">{incident.id}</TableCell>
                    <TableCell>
                      <span>{incident.title}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{incident.complaintCount}건</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMap[incident.status]?.color || 'bg-gray-100 text-gray-800'}>
                        {statusMap[incident.status]?.label || incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {incident.openedAt}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {/* 최근 업데이트는 백엔드 데이터가 없으므로 목업(Placeholder) 유지 */}
                      -
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation(); // Row 클릭 이벤트 전파 방지
                          onViewDetail(incident.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        열기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="mb-1">조건에 맞는 사건이 없습니다</h3>
                      <p className="text-sm text-muted-foreground">
                        검색어나 필터 조건을 변경해보세요
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}