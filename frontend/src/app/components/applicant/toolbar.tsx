import { FileText, PenSquare, LogOut, UserPlus, LogIn, Home } from 'lucide-react';
import { Button } from './ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import Swal from 'sweetalert2';
import { useAuthGuard } from './useAuthCheck';
import logoImg from '@/lib/image.png';

interface ToolbarProps {
  subTitle?: string;
}

export function Toolbar({ subTitle }: ToolbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('accessToken');

  useAuthGuard();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    Swal.fire({
      title: '로그아웃',
      text: '안전하게 로그아웃 되었습니다.',
      icon: 'success',
      confirmButtonColor: '#1e40af',
    }).then(() => {
      navigate('/applicant/main');
    });
  };

  const actionBtn =
    "h-10 rounded-full px-5 font-semibold transition-all " +
    "bg-white/12 text-white border border-white/22 " +
    "hover:bg-white/18 hover:border-white/35 hover:shadow-sm " +
    "active:translate-y-[0.5px] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800";

  const iconBadge =
    "w-7 h-7 rounded-full bg-white/90 text-blue-800 flex items-center justify-center " +
    "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]";

  const getBtnStyle = (path: string) => {
    const isActive = location.pathname === path;

    const baseStyle = "h-10 rounded-full px-5 font-semibold transition-all border flex items-center ";

    if (isActive) {
      return baseStyle + "bg-white text-blue-800 border-white shadow-md scale-105";
    }

    return baseStyle + "bg-white/12 text-white border-white/22 hover:bg-white/18 hover:border-white/35";
  };

  const getIconBadgeStyle = (path: string) => {
    const isActive = location.pathname === path;
    const baseBadge = "w-7 h-7 rounded-full flex items-center justify-center mr-2 ";
    return isActive
      ? baseBadge + "bg-blue-800 text-white"
      : baseBadge + "bg-white/90 text-blue-800";
  };

  const handleProtectedNavigation = (path: string) => {
    if (!isLoggedIn) {
      Swal.fire({
        title: '로그인이 필요합니다',
        text: '민원 서비스 이용을 위해 로그인을 먼저 진행해 주세요.',
        icon: 'info',
        showCancelButton: true,
        cancelButtonColor: '#64748b',
        confirmButtonColor: '#1e40af',
        cancelButtonText: '나중에 하기',
        confirmButtonText: '로그인하러 가기',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/applicant/login');
        }
      });
      return;
    }
    navigate(path);
  };

  const ctaBtn =
    "h-10 rounded-full px-5 font-extrabold transition-all " +
    "bg-white text-blue-800 border border-white/60 shadow-sm " +
    "hover:bg-blue-50 hover:text-blue-900 " +
    "active:translate-y-[0.5px] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800";

  return (
    <nav className="shrink-0 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 py-4 shadow-sm z-50">
      <div className="max-w-[1700px] mx-auto px-10">
        <div className="flex items-center justify-between">
          <div className="w-1/4 flex items-center gap-3">
            <img src={logoImg} alt="로고" className="h-10 w-10 shrink-0" />
            <div className="flex flex-col justify-center">
              <h1
                className="text-xl font-extrabold text-white tracking-tight cursor-pointer select-none leading-tight"
                onClick={() => navigate('/applicant/main')}
              >
                정부 민원 포털
              </h1>
              <p className="text-[11px] text-blue-100/90 font-medium leading-normal">
                {subTitle || '빠르고 투명한 민원 처리 안내'}
              </p>
            </div>
          </div>
          <div className="w-1/2 flex justify-center items-center gap-6">
            <Button variant="ghost" onClick={() => navigate('/applicant/main')} className={getBtnStyle('/applicant/main')}>
              <span className={getIconBadgeStyle('/applicant/main')}><Home className="w-4 h-4" /></span>
              홈으로
            </Button>

            <Button variant="ghost" onClick={() => handleProtectedNavigation('/applicant/complaints')} className={getBtnStyle('/applicant/complaints')}>
              <span className={getIconBadgeStyle('/applicant/complaints')}><FileText className="w-4 h-4" /></span>
              과거 민원 보기
            </Button>

            <Button variant="ghost" onClick={() => handleProtectedNavigation('/applicant/complaints/form')} className={getBtnStyle('/applicant/complaints/form')}>
              <span className={getIconBadgeStyle('/applicant/complaints/form')}><PenSquare className="w-4 h-4" /></span>
              새 민원 작성
            </Button>
          </div>
          <div className="w-1/4 flex justify-end items-center gap-3">
            {isLoggedIn ? (
              <Button variant="ghost" onClick={handleLogout} className={actionBtn}>
                <LogOut className="w-4 h-4 mr-2" /> 로그아웃
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/applicant/login')} className={actionBtn}>
                  로그인
                </Button>
                <Button onClick={() => navigate('/applicant/signup')} className={ctaBtn}>
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