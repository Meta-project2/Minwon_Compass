import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { springApi } from "../../lib/springApi";

interface LoginPageProps {
  onLogin: (role: 'agent' | 'admin') => void;
}

type LoginResponse = {
  message?: string;
  username?: string;
  role: "ADMIN" | "AGENT";
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Mock login logic
    // setTimeout(() => {
    //   if (username && password) {
    //     // For demo: 'admin' logs in as admin, anything else as agent
    //     onLogin(username === 'admin' ? 'admin' : 'agent');
    //   } else {
    //     setError('아이디 또는 비밀번호를 확인하세요');
    //     setIsLoading(false);
    //   }
    // }, 1000);
    try {
      const res = await springApi.post<LoginResponse>("/api/agent/login", {
        username,
        password,
      });

      // 백엔드 role: ADMIN/AGENT  → 프론트 role: admin/agent
      const role = res.data.role === "ADMIN" ? "admin" : "agent";

      // 필요하면 저장(선택)
      localStorage.setItem("role", role);
      localStorage.setItem("username", res.data.username ?? username);

      onLogin(role);
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) setError("아이디 또는 비밀번호가 일치하지 않습니다.");
      else if (status === 403) setError("접근 권한이 없습니다.");
      else setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">내부 업무 시스템</CardTitle>
            <CardDescription className="mt-2">내부 사용자 전용</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                type="text"
                placeholder="아이디를 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-input-background"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded border border-destructive/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중…
                </>
              ) : (
                '로그인'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            AI 기반 민원 처리 지원 시스템 v1.0
          </div>
        </CardContent>
      </Card>
    </div>
  );
}