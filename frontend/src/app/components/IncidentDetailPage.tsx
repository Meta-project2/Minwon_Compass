import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, Calendar, Users, Clock, Eye, AlertCircle, 
  Search, ChevronLeft, ChevronRight, Loader2, RotateCcw,
<<<<<<< HEAD
  Pencil, Check, X, MoveRight, FolderPlus // 추가 아이콘
=======
  Pencil, Check, X, MoveRight, FolderPlus, Tag, Filter
>>>>>>> d624cf004203b37948ba08108fab49fad3530f84
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

// [이식] 사용자님이 보내주신 민원 상세 페이지 컴포넌트
import { ComplaintDetailPage } from './ComplaintDetailPage';

interface IncidentDetailPageProps {
  incidentId: string;
  onBack: () => void;
}

<<<<<<< HEAD
const ITEMS_PER_PAGE = 5;
=======
const ITEMS_PER_PAGE = 8; // 6개 고정

>>>>>>> d624cf004203b37948ba08108fab49fad3530f84
const cleanTitle = (title: string) => title?.replace(/\[.*?\]/g, '').trim() || "";

const statusMap: Record<string, { label: string; color: string }> = {
  OPEN: { label: '발생', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: '대응중', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: '해결', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-700' },
};

<<<<<<< HEAD
=======
const complaintStatusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  PROCESSING: { label: '처리중', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  DONE: { label: '완료', color: 'bg-green-50 text-green-700 border-green-100' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

>>>>>>> d624cf004203b37948ba08108fab49fad3530f84
export function IncidentDetailPage({ incidentId, onBack }: IncidentDetailPageProps) {
  const [incidentData, setIncidentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // --- 필터 및 페이지네이션 상태 ---
  const [complaintPage, setComplaintPage] = useState(1);
<<<<<<< HEAD
  const [innerSearch, setInnerSearch] = useState("");
=======
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

>>>>>>> d624cf004203b37948ba08108fab49fad3530f84
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // --- [상태 관리] 제목 편집 및 민원 선택 ---
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/agent/incidents/${incidentId}`);
        setIncidentData(response.data);
        setTempTitle(cleanTitle(response.data.title));
      } catch (error) {
        console.error("데이터 조회 실패");
      } finally {
        setLoading(false);
      }
    };
    if (incidentId) fetchDetail();
  }, [incidentId]);

<<<<<<< HEAD
  // 제목 저장 로직
=======
>>>>>>> d624cf004203b37948ba08108fab49fad3530f84
  const handleSaveTitle = async () => {
    try {
      await axios.patch(`/api/agent/incidents/${incidentId}`, { title: tempTitle });
      setIncidentData({ ...incidentData, title: tempTitle });
      setIsEditingTitle(false);
    } catch (e) { alert("저장 실패"); }
  };

  const filteredComplaints = useMemo(() => {
    if (!incidentData) return [];
<<<<<<< HEAD
    return incidentData.complaints.filter((c: any) =>
      c.title.toLowerCase().includes(innerSearch.toLowerCase()) || c.id.toLowerCase().includes(innerSearch.toLowerCase())
    );
  }, [incidentData, innerSearch]);

  const visibleComplaints = filteredComplaints.slice((complaintPage - 1) * ITEMS_PER_PAGE, complaintPage * ITEMS_PER_PAGE);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
  if (!incidentData) return <div className="h-full flex items-center justify-center">데이터 없음</div>;

  if (selectedComplaintId) {
    return <ComplaintDetailPage complaintId={selectedComplaintId} onBack={() => setSelectedComplaintId(null)} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-100/50 overflow-hidden relative">

      {/* 1. 상단 배너: 심플 & 트렌디 편집 모드 */}
      <div className="h-16 border-b border-border bg-card px-6 shadow-sm flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-600 shrink-0 -ml-4 h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col justify-center overflow-hidden flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-1">
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="h-8 text-lg font-bold bg-white border-blue-400 focus:ring-1 focus:ring-blue-500 w-[60%]"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700" onClick={handleSaveTitle}><Check className="h-4 w-4"/></Button>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setIsEditingTitle(false)}><X className="h-4 w-4"/></Button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group cursor-pointer hover:bg-slate-100/80 p-1 -ml-1 rounded-md transition-all w-fit"
              onClick={() => setIsEditingTitle(true)}
            >
              <h1 className="text-lg font-bold text-slate-900 leading-none truncate">
                {tempTitle}
              </h1>
              <Pencil className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] text-blue-500 font-medium opacity-0 group-hover:opacity-100">클릭하여 수정</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 h-4 mt-0.5">
            <span className="font-mono font-bold text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0 rounded border border-slate-200">{incidentData.id}</span>
            <Badge className={`${statusMap[incidentData.status]?.color} text-[9px] px-1 py-0 border-none h-3.5`}>
              {statusMap[incidentData.status]?.label}
            </Badge>
          </div>
        </div>
=======
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

  // 페이지네이션 렌더링
  const renderPagination = () => {
    const pageGroupSize = 10;
    const currentGroup = Math.ceil(complaintPage / pageGroupSize);
    const startPage = (currentGroup - 1) * pageGroupSize + 1;
    const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);
    
    if (totalPages === 0) return null;

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center gap-2 justify-center py-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-white shadow-sm border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => setComplaintPage(Math.max(1, complaintPage - 1))}
          disabled={complaintPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map(p => (
          <Button
            key={p}
            variant={p === complaintPage ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 p-0 shadow-sm border ${
              p === complaintPage 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => setComplaintPage(p)}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-white shadow-sm border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => setComplaintPage(Math.min(totalPages, complaintPage + 1))}
          disabled={complaintPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
>>>>>>> d624cf004203b37948ba08108fab49fad3530f84
      </div>
    );
  };

<<<<<<< HEAD
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        {/* 요약 카드 (기존 유지) */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-5 w-5 text-blue-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">최초 발생</div><div className="text-sm font-semibold">{incidentData.firstOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-orange-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">최근 발생</div><div className="text-sm font-semibold">{incidentData.lastOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-purple-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">구성민원수</div><div className="text-sm font-semibold">{incidentData.complaintCount}건</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-green-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">평균 처리시간</div><div className="text-sm font-semibold">{incidentData.avgProcessTime}</div></div></CardContent></Card>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-[400px]">
          <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md bg-white rounded-md">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-300 border-b-2 z-10">
                  <TableRow>
                    <TableHead className="w-[40px] text-center border-r border-slate-400">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        onChange={(e) => setSelectedIds(e.target.checked ? visibleComplaints.map(c => c.id) : [])}
                      />
                    </TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-900 border-r border-slate-400">민원 ID</TableHead>
                    <TableHead className="text-center font-bold text-slate-900 border-r border-slate-400">제목</TableHead>
                    <TableHead className="w-[150px] text-center font-bold text-slate-900 border-r border-slate-400">접수일시</TableHead>
                    <TableHead className="text-center font-bold text-slate-900">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleComplaints.map((c) => (
                    <TableRow key={c.id} className={`${selectedIds.includes(c.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'} border-b border-slate-200 transition-colors`}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-center text-slate-600">{c.id}</TableCell>
                      <TableCell className="font-medium text-slate-700">{c.title}</TableCell>
                      <TableCell className="text-center text-xs text-slate-500">{c.receivedAt}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" className="h-7 text-xs border border-slate-200" onClick={() => setSelectedComplaintId(c.id)}>
                          <Eye className="h-3 w-3 mr-1" /> 열기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      {/* 2. 하단 플로팅 액션 바: 민원 이동/생성 기능 */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4">
=======
  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
  if (!incidentData) return <div className="h-full flex items-center justify-center">데이터 없음</div>;

  if (selectedComplaintId) {
    return <ComplaintDetailPage complaintId={selectedComplaintId} onBack={() => setSelectedComplaintId(null)} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      
      {/* 1. 상단 배너 (높이 h-16으로 변경하여 사이드바와 균형 맞춤) */}
      <div className="h-16 border-b border-slate-200 bg-white px-6 shadow-sm flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-slate-600 shrink-0 -ml-4 h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col justify-center overflow-hidden flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-1">
              <Input 
                value={tempTitle} 
                onChange={(e) => setTempTitle(e.target.value)}
                className="h-8 text-lg font-bold bg-white border-blue-400 focus:ring-1 focus:ring-blue-500 w-[60%]"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700" onClick={handleSaveTitle}><Check className="h-4 w-4"/></Button>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setIsEditingTitle(false)}><X className="h-4 w-4"/></Button>
              </div>
            </div>
          ) : (
            <div 
              className="flex items-center gap-2 group cursor-pointer hover:bg-slate-100/80 p-1 -ml-1 rounded-md transition-all w-fit"
              onClick={() => setIsEditingTitle(true)}
            >
              <h1 className="text-lg font-bold text-slate-900 leading-none truncate">
                {tempTitle}
              </h1>
              <Pencil className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] text-blue-500 font-medium opacity-0 group-hover:opacity-100">클릭하여 수정</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 h-4 mt-0.5">
            <span className="font-mono font-bold text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0 rounded border border-slate-200">{incidentData.id}</span>
            <Badge className={`${statusMap[incidentData.status]?.color} text-[9px] px-1 py-0 border-none h-3.5 shadow-none`}>
              {statusMap[incidentData.status]?.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 overflow-auto px-6 py-4 flex flex-col gap-4">
        
        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-5 w-5 text-blue-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">최초 발생</div><div className="text-sm font-semibold">{incidentData.firstOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-orange-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">최근 발생</div><div className="text-sm font-semibold">{incidentData.lastOccurred}</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-purple-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">구성민원수</div><div className="text-sm font-semibold">{incidentData.complaintCount}건</div></div></CardContent></Card>
          <Card className="border-none shadow-sm bg-white"><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-green-600" /><div><div className="text-[10px] font-bold text-slate-400 uppercase">평균 처리시간</div><div className="text-sm font-semibold">{incidentData.avgProcessTime}</div></div></CardContent></Card>
        </div>

        {/* 테이블 래퍼 */}
        <div className="flex-1 flex flex-col">
          
          {/* 필터 및 검색 바 */}
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="민원 제목, ID 검색" 
                className="pl-9 w-64 bg-white" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-white">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="RECEIVED">접수</SelectItem>
                <SelectItem value="PROCESSING">처리중</SelectItem>
                <SelectItem value="DONE">완료</SelectItem>
              </SelectContent>
            </Select>
            <Button className='border-2' variant="outline" onClick={handleSearch}>검색</Button>
            
            {/* 필터 초기화 버튼 위치 이동 */}
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-500 hover:bg-slate-200 ml-1">
              <X className="h-3.5 w-3.5 mr-1.5" /> 필터 초기화
            </Button>
          </div>

          {/* 테이블 카드 */}
          <Card className="flex flex-col border-none shadow-sm bg-white rounded-md overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-300 border-b-2 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40px] text-center border-r border-slate-100 h-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      onChange={(e) => setSelectedIds(e.target.checked ? visibleComplaints.map(c => c.id) : [])} 
                    />
                  </TableHead>
                  <TableHead className="w-[100px] text-center font-bold text-slate-700 border-r border-slate-100 h-10">ID</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 border-r border-slate-100 h-10">민원 제목</TableHead>
                  <TableHead className="w-[120px] text-center font-bold text-slate-700 border-r border-slate-100 h-10">태그</TableHead>
                  <TableHead className="w-[80px] text-center font-bold text-slate-700 border-r border-slate-100 h-10">상태</TableHead>
                  <TableHead className="w-[150px] text-center font-bold text-slate-700 border-r border-slate-100 h-10">접수일시</TableHead>
                  <TableHead className="w-[80px] text-center font-bold text-slate-700 h-10">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleComplaints.length > 0 ? visibleComplaints.map((c) => (
                  // 행 높이 50px로 유지
                  <TableRow key={c.id} className={`${selectedIds.includes(c.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'} border-b border-slate-100 transition-colors h-[50px]`}>
                    <TableCell className="text-center py-0">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(c.id)} 
                        onChange={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} 
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono text-center text-slate-500 py-0">{c.id.slice(0,8)}</TableCell>
                    
                    <TableCell className="font-medium text-slate-700 truncate max-w-[300px] py-0" title={c.title}>
                      {c.title}
                    </TableCell>

                    <TableCell className="text-center py-0">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {c.tags && c.tags.length > 0 ? c.tags.map((t: string, idx: number) => (
                          <span key={idx} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {t}
                          </span>
                        )) : <span className="text-[10px] text-slate-300">-</span>}
                      </div>
                    </TableCell>

                    <TableCell className="text-center p-1 py-0">
                      <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 border ${complaintStatusMap[c.status]?.color || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {complaintStatusMap[c.status]?.label || c.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-xs text-slate-500 py-0">{c.receivedAt}</TableCell>
                    <TableCell className="text-center py-0">
                      <Button size="sm" variant="ghost" className="h-7 text-xs border border-slate-200 bg-white hover:bg-slate-50" onClick={() => setSelectedComplaintId(c.id)}>
                        <Eye className="h-3 w-3 mr-1" /> 보기
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {/* 빈 행 채우기 (높이 유지) */}
                {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - visibleComplaints.length) }).map((_, i) => (
                  <TableRow key={`empty-${i}`} className="h-[50px] border-b border-slate-50"><TableCell colSpan={7} /></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* 페이지네이션 */}
          <div className="mt-auto">
            {renderPagination()}
          </div>
        </div>
      </div>

      {/* 하단 플로팅 액션 바 */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 z-50">
>>>>>>> d624cf004203b37948ba08108fab49fad3530f84
          <span className="text-sm font-bold text-blue-300">{selectedIds.length}건 선택됨</span>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-slate-800 gap-1.5 h-8">
              <MoveRight className="h-4 w-4" /> 기존 사건으로 이동
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8">
              <FolderPlus className="h-4 w-4" /> 새 사건방 만들기
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setSelectedIds([])}>취소</Button>
          </div>
        </div>
      )}
    </div>
  );
}