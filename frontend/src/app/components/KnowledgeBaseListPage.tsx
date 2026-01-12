import { useState } from 'react';
import { Search, Filter, X, Upload, Eye, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface KnowledgeBaseListPageProps {
  onViewDetail: (id: string) => void;
}

const mockDocuments = [
  {
    id: 'KB-001',
    title: '도로 유지보수 업무 매뉴얼',
    type: '매뉴얼',
    version: 'v2.1',
    effectivePeriod: '2026-01-01 ~ 2026-12-31',
    isActive: true,
    indexingStatus: 'ready',
    uploadedAt: '2025-12-15 14:30',
  },
  {
    id: 'KB-002',
    title: '도로법 시행규칙',
    type: '법령',
    version: 'v1.0',
    effectivePeriod: '2025-03-01 ~ 무기한',
    isActive: true,
    indexingStatus: 'ready',
    uploadedAt: '2025-11-20 10:15',
  },
  {
    id: 'KB-003',
    title: '민원 처리 FAQ',
    type: 'FAQ',
    version: 'v1.2',
    effectivePeriod: '2026-01-01 ~ 2026-12-31',
    isActive: true,
    indexingStatus: 'processing',
    uploadedAt: '2026-01-01 09:00',
  },
  {
    id: 'KB-004',
    title: '환경관리 지침서',
    type: '지침',
    version: 'v3.0',
    effectivePeriod: '2025-06-01 ~ 2026-05-31',
    isActive: false,
    indexingStatus: 'ready',
    uploadedAt: '2025-05-28 16:45',
  },
  {
    id: 'KB-005',
    title: '교통안전 관련 법령',
    type: '법령',
    version: 'v1.1',
    effectivePeriod: '2025-09-01 ~ 무기한',
    isActive: true,
    indexingStatus: 'failed',
    uploadedAt: '2025-12-30 11:20',
  },
];

const indexingStatusMap = {
  uploaded: { label: '업로드', color: 'bg-blue-100 text-blue-800', icon: Upload },
  processing: { label: '변환중', color: 'bg-yellow-100 text-yellow-800', icon: Loader2 },
  ready: { label: '준비', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: '실패', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export function KnowledgeBaseListPage({ onViewDetail }: KnowledgeBaseListPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('');
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [immediateIndexing, setImmediateIndexing] = useState(true);

  const handleUpload = () => {
    if (!uploadTitle || !uploadType || !uploadVersion || !uploadFile) {
      toast('모든 필수 항목을 입력해주세요');
      return;
    }

    setShowUploadDialog(false);
    toast('문서가 업로드되었습니다');
    
    // Reset form
    setUploadTitle('');
    setUploadType('');
    setUploadVersion('');
    setUploadFile(null);
  };

  const handleReindex = (docId: string) => {
    toast('재인덱싱이 시작되었습니다');
  };

  const handleToggleActive = (docId: string, isActive: boolean) => {
    toast(isActive ? '문서가 활성화되었습니다' : '문서가 비활성화되었습니다');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1>지식베이스</h1>
            <p className="text-sm text-muted-foreground">AI 검색용 문서 관리</p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            문서 업로드
          </Button>
        </div>
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="bg-card border-b border-border p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="제목/출처 검색"
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
          <Select defaultValue="all">
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="law">법령</SelectItem>
              <SelectItem value="manual">매뉴얼</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
              <SelectItem value="guide">지침</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="인덱싱상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="ready">준비</SelectItem>
              <SelectItem value="processing">변환중</SelectItem>
              <SelectItem value="failed">실패</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="활성여부" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="inactive">비활성</SelectItem>
            </SelectContent>
          </Select>

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
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>버전</TableHead>
                <TableHead>효력기간</TableHead>
                <TableHead>활성</TableHead>
                <TableHead>인덱싱상태</TableHead>
                <TableHead>업로드일</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockDocuments.map((doc) => {
                const StatusIcon = indexingStatusMap[doc.indexingStatus as keyof typeof indexingStatusMap].icon;
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <div>{doc.title}</div>
                        <div className="text-xs text-muted-foreground">{doc.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{doc.version}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.effectivePeriod}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={doc.isActive}
                        onCheckedChange={(checked) => handleToggleActive(doc.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          indexingStatusMap[doc.indexingStatus as keyof typeof indexingStatusMap]
                            .color
                        }
                      >
                        <StatusIcon
                          className={`h-3 w-3 mr-1 ${
                            doc.indexingStatus === 'processing' ? 'animate-spin' : ''
                          }`}
                        />
                        {
                          indexingStatusMap[doc.indexingStatus as keyof typeof indexingStatusMap]
                            .label
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.uploadedAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetail(doc.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          상세
                        </Button>
                        {doc.indexingStatus === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReindex(doc.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            재시도
                          </Button>
                        )}
                        {doc.indexingStatus === 'ready' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReindex(doc.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문서 업로드</DialogTitle>
            <DialogDescription>새로운 지식베이스 문서를 추가합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">문서 제목 *</Label>
              <Input
                id="title"
                placeholder="문서 제목을 입력하세요"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">문서 유형 *</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger id="type" className="bg-input-background">
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="law">법령</SelectItem>
                  <SelectItem value="manual">매뉴얼</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="guide">지침</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">버전 *</Label>
              <Input
                id="version"
                placeholder="예: v1.0"
                value={uploadVersion}
                onChange={(e) => setUploadVersion(e.target.value)}
                className="bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">파일 선택 *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="bg-input-background"
              />
              <p className="text-xs text-muted-foreground">
                지원 형식: PDF, DOCX, TXT (최대 50MB)
              </p>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded">
              <Switch
                id="immediate"
                checked={immediateIndexing}
                onCheckedChange={setImmediateIndexing}
              />
              <label htmlFor="immediate" className="text-sm cursor-pointer">
                즉시 인덱싱 (업로드 후 자동으로 벡터 변환 시작)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              취소
            </Button>
            <Button onClick={handleUpload}>업로드</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
