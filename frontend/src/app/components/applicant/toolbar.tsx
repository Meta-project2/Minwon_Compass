import { FileText, PenSquare, LogOut, UserPlus, LogIn, Home } from 'lucide-react';
import { Button } from './ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import Swal from 'sweetalert2';
import { useAuthGuard } from './useAuthCheck';
import logoImg from '@/lib/image.png';

interface ToolbarProps {          // 로그인 상태 추가
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
      confirmButtonColor: '#1e40af', // blue-800
    }).then(() => {
      navigate('/applicant/main'); // 로그인 페이지로 이동
    });
  };

  // “액션 버튼” 톤: 항상 동일(활성 개념 없음)
  // - 파란 배경 위에서 읽히는 대비 확보
  // - hover 때만 살짝 더 밝아짐
  const actionBtn =
    "h-10 rounded-full px-5 font-semibold transition-all " +
    "bg-white/12 text-white border border-white/22 " +
    "hover:bg-white/18 hover:border-white/35 hover:shadow-sm " +
    "active:translate-y-[0.5px] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800";

  // 아이콘을 흰 원 안에 넣어서 대비를 강제로 확보(가시성 상승 포인트)
  const iconBadge =
    "w-7 h-7 rounded-full bg-white/90 text-blue-800 flex items-center justify-center " +
    "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]";

  // [공통] 하이라이트 스타일 결정 함수
  const getBtnStyle = (path: string) => {
    const isActive = location.pathname === path; // 현재 경로와 일치하는지 확인

    // 기본 스타일 (기존 actionBtn 스타일)
    const baseStyle = "h-10 rounded-full px-5 font-semibold transition-all border flex items-center ";

    // 활성화 상태(하이라이트): 흰색 배경, 파란 글씨
    if (isActive) {
      return baseStyle + "bg-white text-blue-800 border-white shadow-md scale-105";
    }

    // 비활성화 상태: 반투명 배경, 흰색 글씨
    return baseStyle + "bg-white/12 text-white border-white/22 hover:bg-white/18 hover:border-white/35";
  };

  // 아이콘 배지 스타일도 활성화 여부에 따라 색상 반전
  const getIconBadgeStyle = (path: string) => {
    const isActive = location.pathname === path;
    const baseBadge = "w-7 h-7 rounded-full flex items-center justify-center mr-2 ";
    return isActive
      ? baseBadge + "bg-blue-800 text-white" // 활성 시 아이콘 배경을 진하게
      : baseBadge + "bg-white/90 text-blue-800"; // 비활성 시 아이콘 배경을 밝게
  };

  // 오른쪽(로그아웃/로그인) 버튼은 살짝 더 작은 폭
  // [추가] 로그인 권한 체크 및 이동 함수
  const handleProtectedNavigation = (path: string) => {
    if (!isLoggedIn) {
      Swal.fire({
        title: '로그인이 필요합니다',
        text: '민원 서비스 이용을 위해 로그인을 먼저 진행해 주세요.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#1e40af', // blue-800
        cancelButtonColor: '#64748b', // slate-500
        confirmButtonText: '로그인하러 가기',
        cancelButtonText: '나중에 하기'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/applicant/login');
        }
      });
      return;
    }

    // 로그인이 되어 있다면 해당 경로로 이동
    navigate(path);
  };

  // 회원가입은 헤더에서만 살짝 강조(하지만 '활성'이 아니라 'CTA' 느낌)
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
          {/* 좌측: 로고 및 동적 부제목 (1/4 영역) */}
          <div className="w-1/4 flex items-center gap-3">
            {/* 로고 이미지 */}
            <img src={logoImg} alt="로고" className="h-10 w-10 shrink-0" />

            {/* 텍스트 묶음: 제목과 부제목을 위아래로 배치 */}
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

          {/* 중앙: 주요 서비스 버튼 (1/2 영역으로 중앙 정렬 강제) */}
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

          {/* 우측: 인증 관련 버튼 (1/4 영역) */}
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