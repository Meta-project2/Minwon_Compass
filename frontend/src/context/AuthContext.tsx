import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { springApi } from '../lib/springApi';

// 공무원 사용자 정보 타입
interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 앱 시작 시 localStorage에서 공무원 정보 복구 (새로고침 유지용)
    const initializeAuth = () => {
      try {
        // ★ 중요: 일반 사용자와 섞이지 않게 'agent_user'라는 별도 키 사용
        const storedUser = localStorage.getItem('agent_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("세션 복구 실패", e);
        localStorage.removeItem('agent_user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 로그인: UI 상태 업데이트 및 localStorage 저장
  const login = (userData: User) => {
    localStorage.setItem('agent_user', JSON.stringify(userData));
    setUser(userData);
    // 쿠키는 브라우저가 알아서 관리하므로 axios 헤더 설정 불필요!
  };

  // 로그아웃: 백엔드 세션 종료 요청 + 프론트엔드 상태 초기화
  const logout = async () => {
    try {
      await springApi.post('/api/agent/logout');
    } catch (e) {
      console.error("로그아웃 요청 실패 (이미 만료되었을 수 있음)", e);
    } finally {
      localStorage.removeItem('agent_user');
      setUser(null);
      // 필요 시 로그인 페이지로 강제 이동 로직 추가 가능
      // window.location.href = '/agent/login'; 
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}