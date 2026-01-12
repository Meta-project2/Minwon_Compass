import { useState } from 'react';
import { Toolbar } from './toolbar';
import { RecentComplaints } from './recent-complaints';
import { ResponseTimeStats } from './response-time-stats';
import { KeywordCloud } from './keyword-cloud';


// TODO: Mock data - 나중에 백엔드 API 연동 시 교체 필요
const mockRecentComplaints = [
  {
    id: 'C2024-00234',
    title: '아파트 주변 가로등 고장',
    content: '서초구 반포동 123-45번지 아파트 정문 앞 가로등이 2주째 작동하지 않아 야간에 보행자 안전에 위험이 있습니다. 조속한 수리를 요청드립니다.',
    status: 'categorizing' as const,
    submittedDate: '2024-01-05',
  },
  {
    id: 'C2024-00198',
    title: '불법 주정차 단속 요청',
    content: '강남구 역삼동 주택가 이면도로에 상습적으로 불법 주정차하는 차량들로 인해 주민들의 통행에 불편을 겪고 있습니다. 단속을 강화해 주시기 바랍니다.',
    status: 'assigned' as const,
    submittedDate: '2024-01-03',
  },
  {
    id: 'C2024-00156',
    title: '공원 놀이터 시설 보수',
    content: '송파구 올림픽공원 내 어린이 놀이터의 그네 줄이 해어져 있고, 미끄럼틀 표면이 벗겨져 아이들이 다칠 위험이 있습니다. 점검 및 보수를 부탁드립니다.',
    status: 'answered' as const,
    submittedDate: '2023-12-28',
  },
  {
    id: 'C2024-00089',
    title: '도로 포트홀 신고',
    content: '마포구 상암동 월드컵북로 차선 중앙에 큰 포트홀이 발생했습니다. 차량 통행에 위험하오니 긴급 보수를 요청합니다.',
    status: 'answered' as const,
    submittedDate: '2023-12-20',
  },
];

// Mock data for response time statistics
const mockResponseTimeData = [
  { category: '도로/교통', avgDays: 3.2 },
  { category: '환경/위생', avgDays: 5.1 },
  { category: '공원/시설', avgDays: 4.5 },
  { category: '안전/치안', avgDays: 2.8 },
  { category: '기타', avgDays: 6.3 },
];

const mockOverallStats = {
  averageResponseTime: 4.4,
  fastestCategory: '안전/치안',
  improvementRate: 12,
};

// Mock data for keywords
const mockKeywords = [
  { text: '가로등', value: 45 },
  { text: '주정차', value: 38 },
  { text: '포트홀', value: 32 },
  { text: '쓰레기', value: 28 },
  { text: '소음', value: 25 },
  { text: '교통', value: 22 },
  { text: '안전', value: 20 },
  { text: '보수', value: 18 },
  { text: '보도', value: 15 },
  { text: '공원', value: 12 },
  { text: '하수구', value: 10 },
  { text: '가로수', value: 8 },
  { text: '공사', value: 7 },
  { text: '불법', value: 6 },
];

const ApplicantMainPage = () => {
    const handleViewComplaints = () => {
    console.log('과거 민원 보기');
    // Navigate to complaints list view
  };

  const handleNewComplaint = () => {
    console.log('새 민원 작성');
    // Navigate to new complaint form
  };

  const handleLogout = () => {
    console.log('로그아웃');
    // Perform logout action
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toolbar
        onViewComplaints={handleViewComplaints}
        onNewComplaint={handleNewComplaint}
        onLogout={handleLogout}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Recent Complaints */}
          <RecentComplaints complaints={mockRecentComplaints} />
          
          {/* Stats and Keywords Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ResponseTimeStats 
              data={mockResponseTimeData} 
              overallStats={mockOverallStats}
            />
            <KeywordCloud keywords={mockKeywords} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default ApplicantMainPage;