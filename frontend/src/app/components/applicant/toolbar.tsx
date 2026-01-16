import { FileText, PenSquare, LogOut } from 'lucide-react';
import { Button } from './ui/button';

interface ToolbarProps {
  onViewComplaints: () => void;
  onNewComplaint: () => void;
  onLogout: () => void;
}

export function Toolbar({ onViewComplaints, onNewComplaint, onLogout }: ToolbarProps) {
  return (
    // 전체 배경은 흰색이며 하단 테두리를 유지합니다.
    <nav className="bg-white border-b border-gray-200 py-4 shrink-0">
      {/* [중요] 아래 div가 본문(main)과 동일한 너비 및 여백을 가집니다.
         main 태그의 max-w-[1700px] mx-auto px-10 설정과 일치시킵니다.
      */}
      <div className="max-w-[1700px] mx-auto px-10">
        <div className="flex items-center justify-between">

          {/* 좌측: 로고 (본문의 좌측 섹션 시작점과 일치) */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              정부 민원 포털
            </h1>
          </div>

          {/* 우측: 버튼 그룹 (본문의 우측 섹션 끝점과 일치) */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onViewComplaints}
              className="flex items-center gap-2 hover:bg-gray-50 border-gray-200 text-gray-600 font-medium"
            >
              <FileText className="w-4 h-4" />
              과거 민원 보기
            </Button>

            <Button
              onClick={onNewComplaint}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              <PenSquare className="w-4 h-4" />
              새 민원 작성
            </Button>

            <div className="w-[1px] h-4 bg-gray-200 mx-2" /> {/* 시각적 구분을 위한 구분선 */}

            <Button
              variant="ghost"
              onClick={onLogout}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>

        </div>
      </div>
    </nav>
  );
}