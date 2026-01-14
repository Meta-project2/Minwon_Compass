import { useState } from 'react';
import { X, TrendingUp, Clock, MapPin, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

const complaintTrendData = [
  { date: '12/26', count: 45 },
  { date: '12/27', count: 52 },
  { date: '12/28', count: 48 },
  { date: '12/29', count: 61 },
  { date: '12/30', count: 55 },
  { date: '12/31', count: 58 },
  { date: '01/01', count: 67 },
];

const categoryDistribution = [
  { name: '도로/교통', value: 35, color: '#3b82f6' },
  { name: '환경/시설', value: 28, color: '#10b981' },
  { name: '행정/민원', value: 20, color: '#f59e0b' },
  { name: '복지/보건', value: 17, color: '#8b5cf6' },
];

const departmentRanking = [
  { dept: '도로관리과', received: 145, pending: 23 },
  { dept: '환경관리과', received: 98, pending: 15 },
  { dept: '시설관리과', received: 87, pending: 8 },
  { dept: '복지정책과', received: 76, pending: 12 },
  { dept: '교통행정과', received: 65, pending: 19 },
];

const processingTimeData = [
  { range: '0-4시간', count: 45 },
  { range: '4-8시간', count: 62 },
  { range: '8-12시간', count: 38 },
  { range: '12-24시간', count: 28 },
  { range: '24시간+', count: 15 },
];

const recurringIncidents = [
  { id: 'I-2026-001', title: '역삼동 도로 파손 집중 발생', count: 12, trend: '+3' },
  { id: 'I-2025-342', title: '삼성동 불법주차 반복', count: 15, trend: '+5' },
  { id: 'I-2025-340', title: '대치동 소음 민원', count: 8, trend: '+2' },
];

const hotspotData = [
  { id: 1, name: '역삼동', x: 35, y: 45, intensity: 'high', complaints: 12, category: '도로/교통' },
  { id: 2, name: '삼성동', x: 55, y: 35, intensity: 'medium', complaints: 8, category: '도로/교통' },
  { id: 3, name: '대치동', x: 45, y: 60, intensity: 'low', complaints: 5, category: '환경/시설' },
  { id: 4, name: '잠실동', x: 70, y: 50, intensity: 'high', complaints: 10, category: '환경/시설' },
];

export function AdminDashboard() {
  const [trendView, setTrendView] = useState<'daily' | 'weekly'>('daily');
  const [mapView, setMapView] = useState<'heatmap' | 'marker'>('heatmap');
  const [showSurgeOnly, setShowSurgeOnly] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1>민원 처리 현황</h1>
        <p className="text-sm text-muted-foreground">사전 집계된 지표</p>
      </div>

      {/* Global Filters */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Select defaultValue="7d">
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="기간" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">오늘</SelectItem>
              <SelectItem value="7d">최근 7일</SelectItem>
              <SelectItem value="30d">최근 30일</SelectItem>
              <SelectItem value="custom">직접 선택</SelectItem>
            </SelectContent>
          </Select>

          {/* <Select defaultValue="all">
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="업무군" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 업무군</SelectItem>
              <SelectItem value="road">도로/교통</SelectItem>
              <SelectItem value="env">환경/시설</SelectItem>
              <SelectItem value="admin">행정/민원</SelectItem>
            </SelectContent>
          </Select> */}

          {/* <Select defaultValue="all">
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="부서" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              <SelectItem value="road">도로관리과</SelectItem>
              <SelectItem value="env">환경관리과</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-32 bg-input-background">
              <SelectValue placeholder="행정동" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 행정동</SelectItem>
              <SelectItem value="yeoksam">역삼동</SelectItem>
              <SelectItem value="samsung">삼성동</SelectItem>
            </SelectContent>
          </Select> */}

          <Button variant="ghost" size="sm" className="ml-auto">
            <X className="h-4 w-4 mr-1" />
            필터 초기화
          </Button>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-4">
          {/* Widget 1: 민원 유입 추이 */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">민원 접수 추이</CardTitle>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32 bg-input-background">
                      <SelectValue placeholder="부서" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 부서</SelectItem>
                      <SelectItem value="road">도로관리과</SelectItem>
                      <SelectItem value="env">환경관리과</SelectItem>
                      {/* 실제 부서 데이터 가져오게 */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={complaintTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#334155" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>


                    {/* Widget 4: 처리시간 분포 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">처리 소요시간 분포</CardTitle>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32 bg-input-background">
                      <SelectValue placeholder="부서" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 부서</SelectItem>
                      <SelectItem value="road">도로관리과</SelectItem>
                      <SelectItem value="env">환경관리과</SelectItem>
                      {/* 실제 부서 데이터 가져오게 */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={processingTimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="range" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Widget 3: 부서 유입·미처리 랭킹 */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-base">부서별 접수·처리 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={departmentRanking}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="received" fill="#3b82f6" name="접수" />
                  <Bar dataKey="pending" fill="#ef4444" name="미처리" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Widget 2: 업무군 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">민원 유형 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Widget 5: 라우팅 품질 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">민원 자동 배정 품질</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">재이관 승인율</span>
                </div>
                <div className="text-xl">87%</div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="text-sm">수동 이관율</span>
                </div>
                <div className="text-xl">13%</div>
              </div>
            </CardContent>
          </Card>

          {/* Widget 6: 사건 재발 Top */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">사건 재발 Top</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recurringIncidents.map((incident) => (
                  <div key={incident.id} className="flex items-start justify-between p-2 border rounded text-sm">
                    <div className="flex-1">
                      <div className="mb-1">{incident.title}</div>
                      <div className="text-xs text-muted-foreground">{incident.id}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary">{incident.count}건</Badge>
                      <Badge className="bg-red-100 text-red-700 text-xs">{incident.trend}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Widget 7: 지도 핫스팟 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">민원 집중 지역</CardTitle>
                <div className="flex gap-2">
                  <Select value={mapView} onValueChange={(v: any) => setMapView(v)}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heatmap">히트맵</SelectItem>
                      <SelectItem value="marker">마커</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={showSurgeOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowSurgeOnly(!showSurgeOnly)}
                  >
                    급증만
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mock Map */}
              <div className="relative h-64 bg-slate-100 rounded border overflow-hidden">
                {/* Map placeholder */}
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  <MapPin className="h-5 w-5 mr-2" />
                  강남구 지도
                </div>

                {/* Hotspot markers/heatmap */}
                {mapView === 'marker' ? (
                  // Marker mode
                  <>
                    {hotspotData.map((spot) => (
                      <div
                        key={spot.id}
                        className="absolute cursor-pointer"
                        style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: 'translate(-50%, -50%)' }}
                        onClick={() => setSelectedHotspot(spot)}
                      >
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center shadow-lg ${
                            spot.intensity === 'high'
                              ? 'bg-red-500'
                              : spot.intensity === 'medium'
                              ? 'bg-orange-500'
                              : 'bg-yellow-500'
                          }`}
                        >
                          <span className="text-xs text-white">{spot.complaints}</span>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  // Heatmap mode
                  <>
                    {hotspotData.map((spot) => (
                      <div
                        key={spot.id}
                        className="absolute cursor-pointer"
                        style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: 'translate(-50%, -50%)' }}
                        onClick={() => setSelectedHotspot(spot)}
                      >
                        <div
                          className={`h-16 w-16 rounded-full blur-md ${
                            spot.intensity === 'high'
                              ? 'bg-red-400/60'
                              : spot.intensity === 'medium'
                              ? 'bg-orange-400/40'
                              : 'bg-yellow-400/30'
                          }`}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Legend */}
              <div className="mt-3 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>높음</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span>보통</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span>낮음</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hotspot Detail Drawer */}
      <Sheet open={!!selectedHotspot} onOpenChange={() => setSelectedHotspot(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedHotspot?.name} 핫스팟 상세</SheetTitle>
          </SheetHeader>
          {selectedHotspot && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">주요 업무군</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{selectedHotspot.category}</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">최근 7일 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={complaintTrendData.slice(0, 7)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#334155" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">관련 민원/사건</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 border rounded cursor-pointer hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <span>C2026-0001</span>
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">처리중</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">도로 파손 보수 요청</p>
                    </div>
                    <div className="p-2 border rounded cursor-pointer hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <span>I-2026-001</span>
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">대응중</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">역삼동 도로 파손 집중 발생</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
