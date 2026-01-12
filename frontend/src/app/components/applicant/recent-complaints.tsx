import { Check, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from './ui/card';

export type ComplaintStatus = 'received' | 'categorizing' | 'assigned' | 'answered';

interface Complaint {
  id: string;
  title: string;
  content: string;
  status: ComplaintStatus;
  submittedDate: string;
}

interface RecentComplaintsProps {
  complaints: Complaint[];
}

const statusConfig: Record<ComplaintStatus, { label: string; color: string; icon: any }> = {
  received: { label: '접수됨', color: 'bg-blue-100 text-blue-700', icon: FileText },
  categorizing: { label: '분류 중', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  assigned: { label: '담당자 배정됨', color: 'bg-purple-100 text-purple-700', icon: Check },
  answered: { label: '답변 완료', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export function RecentComplaints({ complaints }: RecentComplaintsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-6 text-gray-900">최근 제출한 민원</h2>
      
      <div className="space-y-4">
        {complaints.map((complaint) => {
          const config = statusConfig[complaint.status];
          const Icon = config.icon;
          
          return (
            <Card key={complaint.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">{complaint.title}</h3>
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{complaint.content}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>제출일: {complaint.submittedDate}</span>
                    <span>민원 번호: {complaint.id}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
