import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { springApi } from '../lib/springApi';

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
    const initializeAuth = () => {
      try {
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
  const login = (userData: User) => {
    localStorage.setItem('agent_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await springApi.post('/api/agent/logout');
    } catch (e) {
      console.error("로그아웃 요청 실패 (이미 만료되었을 수 있음)", e);
    } finally {
      localStorage.removeItem('agent_user');
      setUser(null);
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