import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">지역 민원 처리 현황</h2>
      
      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">평균 처리 시간</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{overallStats.averageResponseTime}일</p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">최단 처리 분야</span>
          </div>
          <p className="text-lg font-bold text-green-600">{overallStats.fastestCategory}</p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600">처리 속도 개선</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">+{overallStats.improvementRate}%</p>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}일`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}일`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-gray-500 text-center mt-4">
        * 최근 3개월 기준 평균 처리 시간
      </p>
    </div>
  );
}
