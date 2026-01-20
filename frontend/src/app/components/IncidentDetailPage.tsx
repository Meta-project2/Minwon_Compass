import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, Calendar, Users, Clock, Eye, AlertCircle, 
  Search, ChevronLeft, ChevronRight, Loader2, RotateCcw,
  Pencil, Check, X, MoveRight, FolderPlus,
  Reply, AlertTriangle
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

// [이식] 사용자님이 보내주신 민원 상세 페이지 컴포넌트
import { ComplaintDetailPage } from './ComplaintDetailPage'; 

interface IncidentDetailPageProps {
  incidentId: string;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 8; 

const cleanTitle = (title: string) => title?.replace(/\[.*?\]/g, '').trim() || "";

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '발생', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '해결', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

const complaintStatusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  PROCESSING: { label: '처리중', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  DONE: { label: '완료', color: 'bg-green-50 text-green-700 border-green-100' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function IncidentDetailPage({ incidentId, onBack }: IncidentDetailPageProps) {
  const [incidentData, setIncidentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // --- 필터 및 페이지네이션 상태 ---
  const [complaintPage, setComplaintPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // --- [상태 관리] 제목 편집 및 민원 선택 ---
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- [민원 이동 모달 상태] ---
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState("");
  const [targetCandidates, setTargetCandidates] = useState<any[]>([]);
  const [isSearchingTarget, setIsSearchingTarget] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotalPages, setModalTotalPages] = useState(1);

  // --- 커스텀 Alert/Confirm 대화상자 상태 ---
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  // [수정] 데이터 조회 함수
  const fetchDetail = useCallback(async () => {
    try {
      if (!incidentData) setLoading(true); 
      const response = await axios.get(`/api/agent/incidents/${incidentId}`);
      setIncidentData(response.data);
      
      if (!isEditingTitle) {
        setTempTitle(cleanTitle(response.data.title));
      }
      return response.data; 
    } catch (error) {
      console.error("데이터 조회 실패");
      return null;
    } finally {
      setLoading(false);
    }
  }, [incidentId, incidentData, isEditingTitle]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const showDialog = (type: 'alert' | 'confirm', title: string, message: string, onConfirm?: () => void) => {
    setDialogConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleSaveTitle = async () => {
    try {
      await axios.patch(`/api/agent/incidents/${incidentId}`, { title: tempTitle });
      setIncidentData({ ...incidentData, title: tempTitle });
      setIsEditingTitle(false);
    } catch (e) { 
      showDialog('alert', '오류', '제목 저장에 실패했습니다.'); 
    }
  };

  // 모달 열기 (검색어 초기화 및 전체 조회)
  const openMoveModal = () => {
    setIsMoveModalOpen(true);
    setTargetSearchQuery(""); 
    setModalPage(1);
    searchTargetIncidents("", 1); 
  };

  // [수정 26-01-20] 모달 검색 실행 (버그 수정: 페이지 1로 리셋)
  const handleModalSearch = () => {
    setModalPage(1); // 1페이지로 강제 초기화 (이게 핵심!)
    searchTargetIncidents(targetSearchQuery, 1);
  };

  const searchTargetIncidents = async (query: string, page: number) => {
    setIsSearchingTarget(true);
    try {
      const response = await axios.get('/api/agent/incidents', {
        params: { search: query, page: page - 1, size: 5 } 
      });
      let filtered = response.data.content.filter((inc: any) => inc.id !== incidentData.id);
      if (filtered.length > 4) filtered = filtered.slice(0, 4);

      setTargetCandidates(filtered);
      setModalTotalPages(response.data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingTarget(false);
    }
  };

  const parseIdFromStr = (str: any) => {
    const s = String(str);
    if (s.includes('-')) {
      const parts = s.split('-');
      return parseInt(parts[parts.length - 1], 10);
    }
    return parseInt(s.replace(/[^0-9]/g, ""), 10);
  };

  const checkEmptyAndExit = (newData: any) => {
    if (newData && newData.complaintCount === 0) {
      showDialog('alert', '사건 자동 종결', '모든 민원이 이동되어 사건방이 소멸됩니다.\n목록으로 돌아갑니다.', () => {
        onBack();
      });
    } else {
      showDialog('alert', '이동 성공', "성공적으로 민원이 이동되었습니다.");
    }
  };

  const executeMove = (targetIdInput: any) => {
    if (!targetIdInput) return;

    showDialog('confirm', '이동 확인', `선택한 ${selectedIds.length}건의 민원을 이동하시겠습니까?`, async () => {
      try {
        const targetId = parseIdFromStr(targetIdInput);
        const complaintIds = selectedIds.map(id => parseIdFromStr(id));

        if (isNaN(targetId)) {
            showDialog('alert', '오류', "대상 사건 ID가 올바르지 않습니다.");
            return;
        }

        await axios.post('/api/agent/incidents/move', {
          targetIncidentId: targetId,
          complaintIds: complaintIds
        });

        setIsMoveModalOpen(false);
        setSelectedIds([]);
        
        const updatedData = await fetchDetail(); 
        checkEmptyAndExit(updatedData);

      } catch (error) {
        console.error(error);
        showDialog('alert', '이동 실패', "이동 중 오류가 발생했습니다.");
      }
    });
  };

  const handleCreateNewIncident = () => {
    if (selectedIds.length === 0) return;

    showDialog('confirm', '새 사건방 생성', `선택한 ${selectedIds.length}건으로 '새로운 사건방'을 만드시겠습니까?`, async () => {
      try {
        const complaintIds = selectedIds.map(id => parseIdFromStr(id));

        await axios.post('/api/agent/incidents/new', {
          targetIncidentId: 0,
          complaintIds: complaintIds
        });

        setSelectedIds([]);
        
        const updatedData = await fetchDetail();
        
        if (updatedData && updatedData.complaintCount === 0) {
           showDialog('alert', '생성 완료', "새로운 사건방이 생성되었습니다.\n현재 방은 비어있으므로 목록으로 이동합니다.", () => {
             onBack();
           });
        } else {
           showDialog('alert', '생성 완료', "새로운 사건방이 생성되었습니다.");
        }

      } catch (error) {
        console.error(error);
        showDialog('alert', '오류', "생성 중 오류가 발생했습니다.");
      }
    });
  };

  const handleModalPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > modalTotalPages) return;
    setModalPage(newPage);
    searchTargetIncidents(targetSearchQuery, newPage);
  };

  const filteredComplaints = useMemo(() => {
    if (!incidentData) return [];
    return incidentData.complaints.filter((c: any) => {
      const matchesSearch = 
        (c.title?.toLowerCase().includes(activeSearch.toLowerCase()) || 
         c.id?.toLowerCase().includes(activeSearch.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [incidentData, activeSearch, statusFilter]);

  const totalItems = filteredComplaints.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const visibleComplaints = filteredComplaints.slice(
    (complaintPage - 1) * ITEMS_PER_PAGE, 
    complaintPage * ITEMS_PER_PAGE
  );

  const handleSearch = () => { setActiveSearch(searchQuery); setComplaintPage(1); };
  const handleReset = () => { setSearchQuery(""); setActiveSearch(""); setStatusFilter("all"); setComplaintPage(1); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const renderPagination = () => {
    const pageGroupSize = 10;
    const currentGroup = Math.ceil(complaintPage / pageGroupSize);
    const startPage = (currentGroup - 1) * pageGroupSize + 1;
    const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);
    if (totalPages === 0) return null;
    const pages = [];
    for (let i = startPage; i <= endPage; i++) { pages.push(i); }

    return (
      <div className="flex items-center gap-2 justify-center py-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setComplaintPage(Math.max(1, complaintPage - 1))} disabled={complaintPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
        {pages.map(p => (
          <Button key={p} variant={p === complaintPage ? "default" : "outline"} size="sm" className={`h-8 w-8 p-0 ${p === complaintPage ? 'bg-blue-600 text-white' : ''}`} onClick={() => setComplaintPage(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setComplaintPage(Math.min(totalPages, complaintPage + 1))} disabled={complaintPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    );
  };

  if (loading && !incidentData) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
  if (!incidentData) return <div className="h-full flex items-center justify-center">데이터 없음</div>;
  if (selectedComplaintId) return <ComplaintDetailPage complaintId={selectedComplaintId} onBack={() => setSelectedComplaintId(null)} />;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      
      {/* 상단 배너 */}
      <div className="h-16 border-b border-slate-200 bg-white px-6 shadow-sm flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-600 shrink-0 -ml-4 h-9 w-9"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex flex-col justify-center overflow-hidden flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 animate-in fade-in">
              <Input 
                value={tempTitle} 
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') { setIsEditingTitle(false); setTempTitle(cleanTitle(incidentData.title)); }
                }}
                className="h-8 text-lg font-bold w-[60%]"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="icon" className="h-8 w-8 bg-blue-600" onClick={handleSaveTitle}><Check className="h-4 w-4"/></Button>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setIsEditingTitle(false)}><X className="h-4 w-4"/></Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer p-1 -ml-1 rounded-md" onClick={() => setIsEditingTitle(true)}>
              <h1 className="text-lg font-bold text-slate-900 truncate">{tempTitle}</h1>
              <Pencil className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100" />
            </div>
          )}
          <div className="flex items-center gap-1.5 h-4 mt-0.5">
            <span className="font-mono font-bold text-[10px] text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200">{incidentData.id}</span>
            <Badge className={`${statusMap[incidentData.status]?.color} text-[9px] px-1 py-0 border-none h-3.5`}>{statusMap[incidentData.status]?.label}</Badge>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-auto px-6 py-4 flex flex-col gap-4">
        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-5 w-5 text-blue-600" /><div><div className="text-[10px] font-bold text-slate-400">최초 발생</div><div className="text-sm font-semibold">{incidentData.firstOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-orange-600" /><div><div className="text-[10px] font-bold text-slate-400">최근 발생</div><div className="text-sm font-semibold">{incidentData.lastOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-purple-600" /><div><div className="text-[10px] font-bold text-slate-400">구성민원수</div><div className="text-sm font-semibold">{incidentData.complaintCount}건</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-green-600" /><div><div className="text-[10px] font-bold text-slate-400">평균 처리시간</div><div className="text-sm font-semibold">{incidentData.avgProcessTime}</div></div></CardContent></Card>
        </div>

        <div className="flex-1 flex flex-col">
          {/* 필터 및 검색바 */}
          <div className="py-3 flex items-center gap-4 justify-left shrink-0">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="민원 제목, ID 검색" className="pl-9 w-64 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} />
                {searchQuery && <button onClick={() => { setSearchQuery(''); setComplaintPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4" /></button>}
              </div>
              <Button className='border-2' variant="outline" onClick={handleSearch}>검색</Button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white"><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent><SelectItem value="all">전체</SelectItem><SelectItem value="RECEIVED">접수</SelectItem><SelectItem value="PROCESSING">처리중</SelectItem><SelectItem value="DONE">완료</SelectItem><SelectItem value="CLOSED">종결</SelectItem></SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReset}><X className="h-4 w-4 mr-1" /> 필터 초기화</Button>
            </div>
            <div className="flex items-center h-10 ml-2"><div className="h-4 w-px bg-slate-300 mr-4"></div><span className="text-sm font-medium text-slate-600">총 <span className="text-blue-600 font-bold">{totalItems}</span>건</span></div>
          </div>

          {/* 테이블 */}
          <Card className="flex flex-col border-none shadow-sm bg-white rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-300 border-b-2 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px] text-center border-r border-slate-100"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? visibleComplaints.map(c => c.id) : [])} /></TableHead>
                  <TableHead className="w-[120px] text-center font-bold text-slate-700 border-r border-slate-100">ID</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 border-r border-slate-100 w-auto">민원 제목</TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-slate-700 border-r border-slate-100">상태</TableHead>
                  <TableHead className="w-[180px] text-center font-bold text-slate-700 border-r border-slate-100">접수일시</TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-slate-700">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleComplaints.length > 0 ? visibleComplaints.map((c) => (
                  <TableRow key={c.id} className={`${selectedIds.includes(c.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'} border-b border-slate-100 h-[50px]`}>
                    <TableCell className="text-center py-0"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} /></TableCell>
                    <TableCell className="text-xs font-mono text-center text-slate-500">{c.id.slice(0,8)}</TableCell>
                    <TableCell className="font-medium text-slate-700 truncate max-w-[400px] text-left pl-6" title={c.title}>{c.title}</TableCell>
                    <TableCell className="text-center p-1"><Badge variant="secondary" className={`text-[10px] px-2 py-0.5 border ${complaintStatusMap[c.status]?.color}`}>{complaintStatusMap[c.status]?.label || c.status}</Badge></TableCell>
                    <TableCell className="text-center text-xs text-slate-500">{c.receivedAt}</TableCell>
                    <TableCell className="text-center"><Button size="sm" variant="ghost" className="h-7 text-xs border bg-white" onClick={() => setSelectedComplaintId(c.id)}><Eye className="h-3 w-3 mr-1" /> 보기</Button></TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={6} className="h-40 text-center text-slate-400">데이터가 없습니다.</TableCell></TableRow>}
                {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - visibleComplaints.length) }).map((_, i) => (<TableRow key={`empty-${i}`} className="h-[50px] border-b border-slate-50"><TableCell colSpan={6} /></TableRow>))}
              </TableBody>
            </Table>
          </Card>
          <div className="mt-auto">{renderPagination()}</div>
        </div>
      </div>

      {/* 하단 플로팅 액션 바 */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border border-slate-200 px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 z-50">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-2"><Check className="h-4 w-4 text-blue-600" /><span className="text-blue-600">{selectedIds.length}건</span> 선택됨</span>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-9 px-4 font-semibold shadow-md" onClick={openMoveModal}>
              <Reply className="h-4 w-4" /> 기존 사건으로 이동
            </Button>
            <Button size="sm" variant="outline" className="border-slate-300 hover:bg-slate-50 text-slate-700 gap-2 h-9 px-4" onClick={handleCreateNewIncident}>
              <FolderPlus className="h-4 w-4" /> 새 사건방 만들기
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-800 h-9 px-3" onClick={() => setSelectedIds([])}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* 사건 이동 모달 */}
      {isMoveModalOpen && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-[500px] flex flex-col h-[550px]"> 
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg shrink-0">
              <h2 className="font-bold text-lg text-slate-800">이동할 사건 선택</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMoveModalOpen(false)}><X className="h-5 w-5 text-slate-500" /></Button>
            </div>
            <div className="p-4 flex flex-col gap-4 overflow-hidden flex-1">
              <div className="flex gap-2 shrink-0">
                <Input 
                  placeholder="이동할 사건 그룹의 제목을 입력하세요..." 
                  value={targetSearchQuery}
                  onChange={(e) => setTargetSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleModalSearch()} // [수정 26-01-20] 검색 실행 시 페이지 리셋
                />
                <Button onClick={handleModalSearch} disabled={isSearchingTarget}> {/* [수정 26-01-20] 검색 실행 시 페이지 리셋 */}
                  {isSearchingTarget ? <Loader2 className="animate-spin h-4 w-4" /> : "검색"}
                </Button>
              </div>
              <div className="flex-1 overflow-auto border rounded-md relative bg-slate-50/30">
                {targetCandidates.length > 0 ? (
                  <div className="flex flex-col divide-y bg-white">
                    {targetCandidates.map((inc: any) => (
                      <div key={inc.id} className="p-4 hover:bg-slate-50 flex justify-between items-center group transition-colors">
                        <div className="flex flex-col gap-1.5 overflow-hidden pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{inc.id}</span>
                            <Badge variant="outline" className="text-[10px] h-5 bg-white">{inc.complaintCount}건</Badge>
                          </div>
                          <span className="font-medium text-sm text-slate-800 truncate block w-full" title={inc.title}>{cleanTitle(inc.title)}</span>
                        </div>
                        <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-sm" onClick={() => executeMove(inc.id)}>선택</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    {isSearchingTarget ? "검색 중..." : "검색 결과가 없습니다."}
                  </div>
                )}
              </div>
              {modalTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-2 border-t mt-auto shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleModalPageChange(modalPage - 1)} disabled={modalPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm text-slate-600 font-medium">{modalPage} / {modalTotalPages}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleModalPageChange(modalPage + 1)} disabled={modalPage === modalTotalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 Alert/Confirm 대화상자 */}
      {dialogConfig.isOpen && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${dialogConfig.type === 'confirm' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                {dialogConfig.type === 'confirm' ? <AlertCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <h3 className="text-lg font-bold text-slate-800">{dialogConfig.title}</h3>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed pl-1 whitespace-pre-wrap">
              {dialogConfig.message}
            </p>

            <div className="flex justify-end gap-2 mt-2">
              {dialogConfig.type === 'confirm' && (
                <Button 
                  variant="outline" 
                  onClick={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
                  className="h-9 px-4 text-slate-600 border-slate-300"
                >
                  취소
                </Button>
              )}
              
              <Button 
                onClick={() => {
                  setDialogConfig({ ...dialogConfig, isOpen: false });
                  if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                }}
                className={`h-9 px-6 font-semibold text-white shadow-md ${dialogConfig.type === 'confirm' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}