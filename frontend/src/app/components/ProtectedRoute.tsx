import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // 1. 아직 복구 중(로딩 중)이면 -> 튕겨내지 말고 로딩 화면 보여줌
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">인증 정보를 확인 중입니다...</p>
        </div>
      </div>
    );
  }

  // 2. 로딩 끝났는데 로그인 안 되어 있으면 -> 로그인 페이지로 이동
  if (!isAuthenticated) {
    return <Navigate to="/agent/login" replace />;
  }

  // 3. 로그인 되어 있으면 -> 자식 라우트(Outlet) 보여줌
  return <Outlet />;
}