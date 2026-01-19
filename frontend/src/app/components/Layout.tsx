import { useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, FileText, Layers, RotateCcw , User, Map , Globe, ChartNoAxesCombined } from 'lucide-react';
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
  userName: string;  
  departmentName?: string;
  onLogout: () => void;
}

export function Layout({ children, currentPage, onNavigate, userRole, userName, departmentName ,onLogout }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const agentMenuItems = [
    { id: 'complaints', label: '민원함', icon: FileText },
    { id: 'incidents', label: '중복 민원', icon: Layers },
    { id: 'reroute-requests', label: '재이관 요청함', icon: RotateCcw },
    { id: 'dashboard', label: '민원 처리 통계', icon: ChartNoAxesCombined },
    { id: 'complaintmap', label: '민원 지도', icon: Map },
    { id: 'civil-service', label: '민원인 사이트', icon: Globe },
    // { id: 'knowledge-base', label: '지식베이스', icon: FileText },
    // { id: 'user-management', label: '사용자/부서 관리', icon: User },
    // { id: 'settings', label: '설정', icon: Settings },
  ];

  const adminMenuItems = [
    { id: 'complaints', label: '민원함', icon: FileText },
    { id: 'incidents', label: '중복 민원', icon: Layers },
    { id: 'reroute-requests', label: '재이관 요청함', icon: RotateCcw },
    { id: 'dashboard', label: '민원 처리 통계', icon: ChartNoAxesCombined },
    // { id: 'user-management', label: '사용자/부서 관리', icon: User },
    { id: 'civil-service', label: '민원인 서비스', icon: Globe },
    // { id: 'knowledge-base', label: '지식베이스', icon: FileText },
    // { id: 'settings', label: '설정', icon: Settings },
  ];

  const menuItems = userRole === 'agent' ? agentMenuItems : adminMenuItems;

  const handleMoveToCivilService = () => {
    window.location.href = '/applicant/login'; 
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-46'
        }`}
      >
        {/* Sidebar Header */}
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

        {/* Sidebar Menu */}
        <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isCivilService = item.id === 'civil-service';
            return (
              <button
                key={item.id}
                onClick={() => isCivilService ? handleMoveToCivilService() : onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto p-4"> 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'gap-2'}`}>
                  <User className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start text-left overflow-hidden">
                        {/* [★수정] 실제 이름 표시 */}
                        <span className="text-sm truncate w-full">{userName}</span> 
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 mt-0.5">
                        {userRole === 'agent' ? '기획 예산과' : '관리자'}
                        </Badge>
                        {/* <span className="text-xs text-muted-foreground truncate w-full">
                          {departmentName || '소속 없음'}
                        </span> */}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" side="top" sideOffset={10}>
                <DropdownMenuItem onClick={onLogout}>
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        {/* <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">

          <div className="flex items-center gap-4">
            <Button 
              className="relative gap-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-5 py-3"
              onClick={handleMoveToCivilService}
            >
              <Globe className="h-5 w-5 text-indigo-600" />
              <span className="text-base font-bold">민원인 서비스</span>
            </Button>      
                        
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
        </header> */}

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}