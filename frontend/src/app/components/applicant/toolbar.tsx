import { FileText, PenSquare, LogOut, UserPlus, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

interface ToolbarProps {
  isLoggedIn: boolean;          // 로그인 상태 추가
  onViewComplaints: () => void;
  onNewComplaint: () => void;
  onLogout: () => void;
}

export function Toolbar({ isLoggedIn, onViewComplaints, onNewComplaint, onLogout }: ToolbarProps) {
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-200 py-4 shrink-0 shadow-sm">
      <div className="max-w-[1700px] mx-auto px-10">
        {/* 3단 레이아웃: 좌(로고), 중(메뉴), 우(인증) */}
        <div className="flex items-center justify-between">

          {/* 좌측: 로고 (w-1/4로 공간 확보) */}
          <div className="w-1/4">
            <h1
              className="text-xl font-bold text-gray-900 tracking-tight cursor-pointer"
              onClick={() => navigate('/applicant/main')}
            >
              정부 민원 포털
            </h1>
          </div>

          {/* 중앙: 주요 서비스 버튼 (w-1/2 및 justify-center) */}
          <div className="w-1/2 flex justify-center items-center gap-6">
            <Button
              variant="ghost"
              onClick={onViewComplaints}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-colors"
            >
              <FileText className="w-5 h-5" />
              과거 민원 보기
            </Button>

            <Button
              variant="ghost"
              onClick={onNewComplaint}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-colors"
            >
              <PenSquare className="w-5 h-5" />
              새 민원 작성
            </Button>
          </div>

          {/* 우측: 인증 관련 버튼 (w-1/4 및 justify-end) */}
          <div className="w-1/4 flex justify-end items-center gap-3">
            {isLoggedIn ? (
              // 로그인 상태일 때: 로그아웃 버튼
              <Button
                variant="ghost"
                onClick={onLogout}
                className="flex items-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            ) : (
              // 비로그인 상태일 때: 로그인 및 회원가입
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/applicant/login')}
                  className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  로그인
                </Button>
                <Button
                  onClick={() => navigate('/applicant/signup')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  회원가입
                </Button>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}