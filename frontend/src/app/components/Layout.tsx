import { useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, FileText, Layers, Settings, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: 'agent' | 'admin';
}

export function Layout({ children, currentPage, onNavigate, userRole }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const agentMenuItems = [
    { id: 'complaints', label: '민원함', icon: FileText },
    { id: 'incidents', label: '사건(군집)', icon: Layers },
    // { id: 'settings', label: '설정', icon: Settings },
  ];

  const adminMenuItems = [
    { id: 'dashboard', label: '운영 대시보드', icon: Layers },
    { id: 'reroute-requests', label: '재이관 요청함', icon: FileText },
    { id: 'knowledge-base', label: '지식베이스', icon: FileText },
    { id: 'user-management', label: '사용자/부서 관리', icon: User },
    // { id: 'settings', label: '설정', icon: Settings },
  ];

  const menuItems = userRole === 'agent' ? agentMenuItems : adminMenuItems;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-sidebar-foreground">민원 시스템</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex-1 max-w-xl">
            {/* <Input
              type="search"
              placeholder="민원/사건 검색"
              className="w-full bg-input-background"
            /> */}
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-5 w-5" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm">김담당</span>
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {userRole === 'agent' ? '처리 담당자' : '운영 관리자'}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>계정</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>내 정보</DropdownMenuItem>
                <DropdownMenuItem>설정</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>로그아웃</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}