import { useEffect, useState, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  Area, AreaChart, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  AdminDashboardApi,
  DailyCountDto, TimeRangeDto, DeptStatusDto, GeneralStatsResponse, DepartmentFilterDto
} from '../../api/AdminDashboardApi';
import { format, subDays } from 'date-fns';

// --- [복구] 디자인 헬퍼 함수 (원본 유지) ---
const RADIAN = Math.PI / 180;
function clamp01(n: number) { return Math.min(1, Math.max(0, n)); }
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function lightenHex(hex: string, amount = 0.55) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = clamp01(amount);
  const r = Math.round(rgb.r + (255 - rgb.r) * a);
  const g = Math.round(rgb.g + (255 - rgb.g) * a);
  const b = Math.round(rgb.b + (255 - rgb.b) * a);
  return rgbToHex(r, g, b);
}

// 라벨 렌더러
const makePieLabelRenderer = (getColor: any) => (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  if (percent < 0.05) return null;
  const radius = outerRadius * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(0,0,0,0.5)' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// --- 색상 정의 ---
const COLORS = {
  blue: '#3b82f6', green: '#10b981', yellow: '#f59e0b',
  purple: '#8b5cf6', red: '#ef4444', orange: '#fb923c',
  slate: '#64748b', gray: '#9ca3af'
};
const CATEGORY_PALETTE = [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.purple, COLORS.orange];

export function AdminDashboard() {
  // --- 상태 관리 ---
  const [departments, setDepartments] = useState<DepartmentFilterDto[]>([]); // 부서 목록
  const [period, setPeriod] = useState('7d');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // 위젯별 데이터 & 필터
  const [trendData, setTrendData] = useState<DailyCountDto[]>([]);
  const [trendFilter, setTrendFilter] = useState('all');

  const [timeData, setTimeData] = useState<TimeRangeDto[]>([]);
  const [timeFilter, setTimeFilter] = useState('all');

  const [deptStatusData, setDeptStatusData] = useState<DeptStatusDto[]>([]);
  const [deptStatusFilter, setDeptStatusFilter] = useState('all');

  const [generalData, setGeneralData] = useState<GeneralStatsResponse | null>(null);

  // --- 데이터 로드 ---
  // 1. 초기 로드: 부서 목록
  useEffect(() => {
    AdminDashboardApi.getDepartments()
      .then(setDepartments)
      .catch(err => console.error("부서 목록 로드 실패:", err));
  }, []);

  // 2. 위젯 데이터 로드
  useEffect(() => { loadTrend(); }, [dateRange, trendFilter]);
  useEffect(() => { loadTime(); }, [dateRange, timeFilter]);
  useEffect(() => { loadDeptStatus(); }, [dateRange, deptStatusFilter]);
  useEffect(() => { loadGeneral(); }, [dateRange]);

  const loadTrend = async () => setTrendData(await AdminDashboardApi.getTrend(dateRange.start, dateRange.end, trendFilter));
  const loadTime = async () => setTimeData(await AdminDashboardApi.getProcessingTime(dateRange.start, dateRange.end, timeFilter));
  const loadDeptStatus = async () => setDeptStatusData(await AdminDashboardApi.getDeptStatus(dateRange.start, dateRange.end, deptStatusFilter));
  const loadGeneral = async () => setGeneralData(await AdminDashboardApi.getGeneral(dateRange.start, dateRange.end));

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val === 'custom') return;
    const today = new Date();
    let start = today;
    if (val === '1d') start = today;
    else if (val === '7d') start = subDays(today, 6);
    else if (val === '30d') start = subDays(today, 29);
    setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') });
  };

  // --- 데이터 가공 ---
  // 1. 민원 유형 (Pie)
  const pieChartData = useMemo(() => {
    if (!generalData) return [];
    const sorted = [...generalData.categoryStats].sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5).map((item, idx) => ({ name: item.categoryName, value: item.count, color: CATEGORY_PALETTE[idx] }));
    const others = sorted.slice(5).reduce((acc, cur) => acc + cur.count, 0);
    if (others > 0) top5.push({ name: '기타', value: others, color: COLORS.gray });
    return top5;
  }, [generalData]);

  // 2. 처리 시간 (Pie + Gradient)
  const procTimeChartData = useMemo(() => {
    const colorMap: Record<string, string> = { "3일 이내": COLORS.green, "7일 이내": COLORS.blue, "14일 이내": COLORS.yellow, "14일 이상": COLORS.red };
    return timeData.map(item => ({
      name: item.range, value: item.count, color: colorMap[item.range] || COLORS.slate
    }));
  }, [timeData]);

  // [수정] 동적 부서 필터 컴포넌트
  const DeptFilterSelect = ({ value, onChange }: any) => (
    <div className="ml-auto w-32">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200"><SelectValue placeholder="전체" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 부서</SelectItem>
          {/* DB에서 가져온 departments 매핑 */}
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id.toString()}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (!generalData) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card px-6 shadow-sm flex items-center gap-3 shrink-0">
        <h1 className="text-2.5xl font-bold text-slate-900">민원 처리 현황</h1>
        <div className="flex flex-wrap gap-2 items-center ml-auto">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32 bg-input-background"><SelectValue placeholder="기간 선택" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">오늘</SelectItem><SelectItem value="7d">최근 7일</SelectItem><SelectItem value="30d">최근 30일</SelectItem><SelectItem value="custom">직접 선택</SelectItem>
            </SelectContent>
          </Select>
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1 shadow-sm">
              <input type="date" className="text-sm border-none outline-none" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
              <span className="text-slate-400">~</span>
              <input type="date" className="text-sm border-none outline-none" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => handlePeriodChange('7d')}><X className="h-4 w-4 mr-1" /> 초기화</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100/50">
        <div className="grid grid-cols-3 gap-4">

          {/* 1. 접수 추이 */}
          <Card className="col-span-1 shadow-sm">
            <CardHeader className="flex flex-row items-center">
              <div className="h-4 w-1 bg-blue-600 rounded-full mr-2" />
              <CardTitle className="text-base font-bold">민원 접수 추이</CardTitle>
              <DeptFilterSelect value={trendFilter} onChange={setTrendFilter} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke={COLORS.blue} fill="url(#colorTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2. 처리 시간 (그라데이션 & 꽉찬 파이 복구) */}
          <Card className="col-span-1 shadow-sm">
            <CardHeader className="flex flex-row items-center">
              <div className="h-4 w-1 bg-green-600 rounded-full mr-2" />
              <CardTitle className="text-base font-bold">처리 소요 시간</CardTitle>
              <DeptFilterSelect value={timeFilter} onChange={setTimeFilter} />
            </CardHeader>
            <CardContent className="px-1 py-0">
              <div className="flex h-[180px] items-center justify-center">
                <div className="w-[60%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {/* [복구] 그라데이션 defs 동적 생성 */}
                      <defs>
                        {procTimeChartData.map((entry, idx) => (
                          <linearGradient key={idx} id={`proc-${idx}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={entry.color} />
                            <stop offset="100%" stopColor={lightenHex(entry.color)} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={procTimeChartData}
                        cx="50%" cy="50%"
                        outerRadius={75}
                        // innerRadius={0} // 꽉찬 원
                        dataKey="value"
                        labelLine={false}
                        label={makePieLabelRenderer(null)}
                      >
                        {procTimeChartData.map((e, i) => (
                          <Cell key={i} fill={`url(#proc-${i})`} stroke="white" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* 범례 */}
                <div className="w-[40%] pl-2 space-y-2">
                  {procTimeChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. AI 정확도 */}
          <Card className="col-span-1 shadow-sm">
            <CardHeader className="flex flex-row items-center">
              <div className="h-4 w-1 bg-purple-600 rounded-full mr-2" />
              <CardTitle className="text-base font-bold">AI 자동 배정 정확도</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full flex items-center justify-center">
                <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-xl text-white ${generalData.aiAccuracy >= 80 ? 'bg-gradient-to-br from-emerald-400 to-cyan-600 shadow-emerald-200' : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-200'}`}>
                  <span className="text-4xl font-bold drop-shadow-sm">{generalData.aiAccuracy}%</span>
                  <span className="text-sm opacity-90">일치율</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. 부서별 현황 (막대 그라데이션) */}
          <Card className="col-span-1 shadow-sm">
            <CardHeader className="flex flex-row items-center">
              <div className="h-4 w-1 bg-blue-600 rounded-full mr-2" />
              <CardTitle className="text-base font-bold">부서별 현황</CardTitle>
              <DeptFilterSelect value={deptStatusFilter} onChange={setDeptStatusFilter} />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptStatusData} barGap={4} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
                    <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="deptName" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="received" name="접수" fill="url(#barBlue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="미처리" fill="url(#barRed)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 5. 민원 유형 (Pie + Gradient) */}
          <Card className="col-span-1 shadow-sm">
            <CardHeader className="flex flex-row items-center">
              <div className="h-4 w-1 bg-yellow-500 rounded-full mr-2" />
              <CardTitle className="text-base font-bold">민원 유형 분포</CardTitle>
            </CardHeader>
            <CardContent className="px-1 py-0">
              <div className="flex h-[220px] items-center justify-center">
                <div className="w-[60%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {/* [복구] 그라데이션 defs */}
                      <defs>
                        {pieChartData.map((entry, idx) => (
                          <linearGradient key={idx} id={`cat-${idx}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={entry.color} />
                            <stop offset="100%" stopColor={lightenHex(entry.color)} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={pieChartData}
                        cx="50%" cy="50%"
                        outerRadius={75}
                        dataKey="value"
                        labelLine={false}
                        label={makePieLabelRenderer(null)}
                      >
                        {pieChartData.map((e, i) => <Cell key={i} fill={`url(#cat-${i})`} stroke="white" strokeWidth={1} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[40%] pl-2 space-y-2 overflow-y-auto max-h-[180px]">
                  {pieChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium truncate" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. 반복 민원 (수직 정렬 Fix) */}
          <Card className="col-span-1 shadow-sm">
            <CardHeader className="flex flex-row items-center">
              <div className="h-4 w-1 bg-red-600 rounded-full mr-2" />
              <CardTitle className="text-base font-bold">반복 민원 Top 3</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generalData.recurringIncidents.map(inc => (
                  <div key={inc.incidentId} className="flex items-center justify-between p-3 border border-slate-100 bg-white rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="text-sm font-semibold truncate" title={inc.title}>{inc.title}</div>
                      {/* <div className="text-xs text-slate-500 font-mono">{inc.incidentId} | {inc.count}건</div> */}
                      <div className="text-xs text-slate-500 font-mono">
                        <Badge variant="secondary" className="px-2 py-0.5 h-auto">
                          {inc.incidentId}
                        </Badge>
                      </div>


                    </div>
                    <Badge className={`shrink-0 px-2 py-1 text-xs font-bold shadow-none ${inc.trend > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                      {inc.trend > 0 ? `+${inc.trend}` : inc.trend}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}