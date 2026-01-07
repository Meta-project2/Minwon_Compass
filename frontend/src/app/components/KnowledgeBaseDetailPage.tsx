import { useState } from 'react';
import { ArrowLeft, RefreshCw, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { toast } from 'sonner';

interface KnowledgeBaseDetailPageProps {
  docId: string;
  onBack: () => void;
}

const mockDocument = {
  id: 'KB-001',
  title: '도로 유지보수 업무 매뉴얼',
  type: '매뉴얼',
  version: 'v2.1',
  source: '국토교통부',
  effectiveStart: '2026-01-01',
  effectiveEnd: '2026-12-31',
  isActive: true,
  indexingStatus: 'ready',
  uploadedAt: '2025-12-15 14:30',
  uploadedBy: '박관리자',
  fileSize: '2.3 MB',
  pageCount: 145,
};

const mockChunks = [
  {
    id: 'CH-001',
    sequence: 1,
    section: '제1장 개요',
    pageRange: '1-5',
    preview: '본 매뉴얼은 도로 유지보수 업무의 표준 절차와 지침을 제공하기 위해 작성되었습니다...',
    status: 'ready',
    vectorCount: 3,
  },
  {
    id: 'CH-002',
    sequence: 2,
    section: '제2장 일반 보수',
    pageRange: '6-25',
    preview: '일반 보수 작업은 정기적인 점검을 통해 발견된 경미한 손상을 수리하는 작업입니다...',
    status: 'ready',
    vectorCount: 8,
  },
  {
    id: 'CH-003',
    sequence: 3,
    section: '제3장 긴급 보수',
    pageRange: '26-45',
    preview: '긴급 보수는 도로의 안전에 즉각적인 위험을 초래하는 손상에 대한 신속한 대응을 의미합니다...',
    status: 'ready',
    vectorCount: 12,
  },
  {
    id: 'CH-004',
    sequence: 4,
    section: '제4장 예산 및 계획',
    pageRange: '46-70',
    preview: '도로 유지보수 예산은 연간 계획 수립 시 과거 데이터와 예상 수요를 기반으로 산정됩니다...',
    status: 'ready',
    vectorCount: 6,
  },
];

const mockIndexingLogs = [
  { timestamp: '2025-12-15 14:35', type: 'success', message: '인덱싱 완료 (145페이지, 29 청크)' },
  { timestamp: '2025-12-15 14:33', type: 'processing', message: '벡터 변환 중... (75%)' },
  { timestamp: '2025-12-15 14:32', type: 'processing', message: '청크 분할 시작' },
  { timestamp: '2025-12-15 14:31', type: 'processing', message: 'PDF 파싱 시작' },
  { timestamp: '2025-12-15 14:30', type: 'info', message: '파일 업로드 완료' },
];

const chunkStatusMap = {
  ready: { label: '준비', color: 'bg-green-100 text-green-800' },
  processing: { label: '변환중', color: 'bg-yellow-100 text-yellow-800' },
  failed: { label: '실패', color: 'bg-red-100 text-red-800' },
};

export function KnowledgeBaseDetailPage({ docId, onBack }: KnowledgeBaseDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(mockDocument.title);
  const [editedVersion, setEditedVersion] = useState(mockDocument.version);
  const [isActive, setIsActive] = useState(mockDocument.isActive);
  const [selectedChunk, setSelectedChunk] = useState<any>(null);

  const handleSaveMetadata = () => {
    setIsEditing(false);
    toast('문서 정보가 저장되었습니다');
  };

  const handleReindex = () => {
    toast('재인덱싱이 시작되었습니다');
  };

  const handleDeactivate = () => {
    setIsActive(false);
    toast('문서가 비활성화되었습니다');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={onBack} className="hover:text-foreground">
            지식베이스
          </button>
          <span>/</span>
          <span className="text-foreground">문서 상세</span>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1>{mockDocument.title}</h1>
                <Badge variant="outline">{mockDocument.type}</Badge>
                <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
                  {isActive ? '활성' : '비활성'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{mockDocument.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReindex}>
              <RefreshCw className="h-4 w-4 mr-2" />
              재인덱싱
            </Button>
            <Button
              variant="outline"
              onClick={handleDeactivate}
              disabled={!isActive}
            >
              비활성화
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">버전: </span>
                <span>{mockDocument.version}</span>
              </div>
              <div>
                <span className="text-muted-foreground">출처: </span>
                <span>{mockDocument.source}</span>
              </div>
              <div>
                <span className="text-muted-foreground">효력기간: </span>
                <span>{mockDocument.effectiveStart} ~ {mockDocument.effectiveEnd}</span>
              </div>
              <div>
                <span className="text-muted-foreground">파일 크기: </span>
                <span>{mockDocument.fileSize}</span>
              </div>
              <div>
                <span className="text-muted-foreground">페이지 수: </span>
                <span>{mockDocument.pageCount}p</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="info" className="h-full flex flex-col">
          <div className="border-b border-border px-6 bg-card">
            <TabsList>
              <TabsTrigger value="info">문서 정보</TabsTrigger>
              <TabsTrigger value="chunks">청크 목록</TabsTrigger>
              <TabsTrigger value="logs">인덱싱 로그</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            {/* Tab 1: 문서 정보 */}
            <TabsContent value="info" className="m-0 h-full p-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">메타데이터</CardTitle>
                    {!isEditing ? (
                      <Button size="sm" onClick={() => setIsEditing(true)}>
                        수정
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                          취소
                        </Button>
                        <Button size="sm" onClick={handleSaveMetadata}>
                          저장
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>문서 제목</Label>
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        disabled={!isEditing}
                        className="bg-input-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>버전</Label>
                      <Input
                        value={editedVersion}
                        onChange={(e) => setEditedVersion(e.target.value)}
                        disabled={!isEditing}
                        className="bg-input-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>출처</Label>
                      <Input
                        value={mockDocument.source}
                        disabled={!isEditing}
                        className="bg-input-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>문서 유형</Label>
                      <Input
                        value={mockDocument.type}
                        disabled
                        className="bg-input-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>효력 시작일</Label>
                      <Input
                        type="date"
                        value={mockDocument.effectiveStart}
                        disabled={!isEditing}
                        className="bg-input-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>효력 종료일</Label>
                      <Input
                        type="date"
                        value={mockDocument.effectiveEnd}
                        disabled={!isEditing}
                        className="bg-input-background"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded">
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      disabled={!isEditing}
                    />
                    <label className="text-sm cursor-pointer">
                      활성화 (AI 검색에 포함)
                    </label>
                  </div>

                  <div className="pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">업로드일</span>
                      <span>{mockDocument.uploadedAt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">업로드자</span>
                      <span>{mockDocument.uploadedBy}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: 청크 목록 */}
            <TabsContent value="chunks" className="m-0 h-full p-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      총 {mockChunks.length}개 청크
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      벡터 총 {mockChunks.reduce((sum, c) => sum + c.vectorCount, 0)}개
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">순번</TableHead>
                        <TableHead>섹션</TableHead>
                        <TableHead>페이지</TableHead>
                        <TableHead>미리보기</TableHead>
                        <TableHead>벡터수</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockChunks.map((chunk) => (
                        <TableRow key={chunk.id}>
                          <TableCell className="text-sm">{chunk.sequence}</TableCell>
                          <TableCell>{chunk.section}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {chunk.pageRange}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm text-muted-foreground truncate">
                              {chunk.preview}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">{chunk.vectorCount}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                chunkStatusMap[chunk.status as keyof typeof chunkStatusMap].color
                              }
                            >
                              {chunkStatusMap[chunk.status as keyof typeof chunkStatusMap].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedChunk(chunk)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              상세
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: 인덱싱 로그 */}
            <TabsContent value="logs" className="m-0 h-full p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">인덱싱 로그</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockIndexingLogs.map((log, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              log.type === 'success'
                                ? 'bg-green-100'
                                : log.type === 'processing'
                                ? 'bg-yellow-100'
                                : log.type === 'error'
                                ? 'bg-red-100'
                                : 'bg-blue-100'
                            }`}
                          >
                            {log.type === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-700" />
                            ) : log.type === 'processing' ? (
                              <Clock className="h-4 w-4 text-yellow-700" />
                            ) : log.type === 'error' ? (
                              <XCircle className="h-4 w-4 text-red-700" />
                            ) : (
                              <Clock className="h-4 w-4 text-blue-700" />
                            )}
                          </div>
                          {index < mockIndexingLogs.length - 1 && (
                            <div className="w-px h-full min-h-[40px] bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="text-sm text-muted-foreground mb-1">
                            {log.timestamp}
                          </div>
                          <div className="text-sm">{log.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Chunk Detail Drawer */}
      <Sheet open={!!selectedChunk} onOpenChange={() => setSelectedChunk(null)}>
        <SheetContent className="w-[600px]">
          <SheetHeader>
            <SheetTitle>청크 상세</SheetTitle>
          </SheetHeader>
          {selectedChunk && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">순번</div>
                  <div>{selectedChunk.sequence}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">페이지</div>
                  <div>{selectedChunk.pageRange}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">섹션</div>
                <div className="text-sm">{selectedChunk.section}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2">내용 미리보기</div>
                <div className="p-4 bg-muted rounded border text-sm leading-relaxed">
                  {selectedChunk.preview}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">벡터 수</div>
                  <div>{selectedChunk.vectorCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">상태</div>
                  <Badge
                    className={
                      chunkStatusMap[selectedChunk.status as keyof typeof chunkStatusMap].color
                    }
                  >
                    {chunkStatusMap[selectedChunk.status as keyof typeof chunkStatusMap].label}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
