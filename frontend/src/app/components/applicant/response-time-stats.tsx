// ResponseTimeStats.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Clock, TrendingDown, Award } from 'lucide-react';

interface ResponseTimeStatsProps {
  data: {
    category: string;
    avgDays: number;
  }[];
  overallStats: {
    averageResponseTime: number;
    fastestCategory: string;
    improvementRate: number;
  };
}

const COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6'];
const GRADIENTS = [
  { id: 'grad1', start: '#818CF8', end: '#4338CA' },
  { id: 'grad2', start: '#F472B6', end: '#BE185D' },
  { id: 'grad3', start: '#FBBF24', end: '#D97706' },
  { id: 'grad4', start: '#34D399', end: '#047857' },
  { id: 'grad5', start: '#A78BFA', end: '#6D28D9' },
];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const labelColor = COLORS[index % COLORS.length];

  return (
    <text
      x={x}
      y={y}
      fill={labelColor}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-[15px]"
    >
      <tspan fontWeight="600">{name}: </tspan>
      <tspan fontWeight="800" fontSize="20px"> {value}일</tspan>
    </text>
  );
};

export function ResponseTimeStats({ data, overallStats }: ResponseTimeStatsProps) {
  const pieData = data.map(item => ({
    name: item.category,
    value: item.avgDays,
  }));

  return (
    // 부모 섹션의 흰색 배경과 겹치지 않도록 투명 배경 처리 및 패딩 조정
    <div className="w-full h-full flex flex-col">

      {/* [수정] 지표 카드 영역: gap과 px를 늘려 틀에서 띄움 */}
      <div className="grid grid-cols-3 gap-5 mb-12 px-2 shrink-0">
        <div className="p-5 bg-blue-50/50 rounded-3xl text-center border border-blue-100/50 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="flex flex-col items-center gap-1.5 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-[20px] font-bold text-blue-400 uppercase tracking-tighter">평균 처리 시간</span>
          </div>
          <p className="text-2xl font-black text-blue-900">{overallStats.averageResponseTime}일</p>
        </div>

        <div className="p-5 bg-blue-50/50 rounded-3xl text-center border border-blue-100/50 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="flex flex-col items-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-green-600" />
            <span className="text-[20px] font-bold text-green-400 uppercase tracking-tighter">최단 처리 분야</span>
          </div>
          <p className="text-2xl font-black text-green-900 leading-tight">{overallStats.fastestCategory}</p>
        </div>

        <div className="p-5 bg-blue-50/50 rounded-3xl text-center border border-blue-100/50 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="flex flex-col items-center gap-1.5 mb-2">
            <TrendingDown className="w-4 h-4 text-purple-600" />
            <span className="text-[20px] font-bold text-purple-400 uppercase tracking-tighter">처리 속도 개선</span>
          </div>
          <p className="text-2xl font-black text-purple-900">+{overallStats.improvementRate}%</p>
        </div>
      </div>

      {/* [수정] 파이 차트 영역: 라벨 가독성 및 높이 확보 */}
      <div className="flex-1 min-h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {GRADIENTS.map((grad) => (
                <linearGradient key={grad.id} id={grad.id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={grad.start} stopOpacity={1} />
                  <stop offset="95%" stopColor={grad.end} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
              label={renderCustomizedLabel} // 커스텀 라벨 적용
              outerRadius={95}
              stroke="none"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#grad${(index % GRADIENTS.length) + 1})`} // 그라데이션 ID 연결
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                padding: '12px'
              }}
              itemStyle={{ fontWeight: 'bold' }}
              formatter={(value) => [`${value}일`, '평균 처리 시간']}
            />
          </PieChart>
        </ResponsiveContainer>
        <p className="absolute bottom-4 left-0 right-0 text-[10px] text-gray-400 text-center italic">
          * 최근 3개월간 수집된 행정 데이터를 기반으로 분석되었습니다.
        </p>
      </div>
    </div>
  );
}