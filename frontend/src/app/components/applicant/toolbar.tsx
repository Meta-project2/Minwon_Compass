import { FileText, PenSquare, LogOut } from 'lucide-react';
import { Button } from './ui/button';

interface ToolbarProps {
  onViewComplaints: () => void;
  onNewComplaint: () => void;
  onLogout: () => void;
}

export function Toolbar({ onViewComplaints, onNewComplaint, onLogout }: ToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">정부 민원 포털</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onViewComplaints}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            과거 민원 보기
          </Button>
          
          <Button
            onClick={onNewComplaint}
            className="flex items-center gap-2"
          >
            <PenSquare className="w-4 h-4" />
            새 민원 작성
          </Button>
          
          <Button
            variant="ghost"
            onClick={onLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
}