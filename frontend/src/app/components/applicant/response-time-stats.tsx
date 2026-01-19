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

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04'];

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
            <Pie
              data={pieData}
              cx="50%"
              cy="45%" // 차트를 살짝 위로 올려 아래 범례 공간 확보
              labelLine={true}
              label={({ name, value }) => `${name}: ${value}일`} // 가독성을 위해 이름만 표시 (값은 툴팁으로)
              outerRadius={95} // 차트 크기 소폭 확대
              innerRadius={60} // 도넛 형태로 변경하여 더 세련되게 수정
              stroke="none"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
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