import { useState } from 'react';
import { Search, Plus, Edit, UserX, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { toast } from 'sonner';

const mockUsers = [
  { id: 'U001', name: '김담당', username: 'kim.agent', role: 'agent', department: '도로관리과', isActive: true },
  { id: 'U002', name: '이과장', username: 'lee.agent', role: 'agent', department: '환경관리과', isActive: true },
  { id: 'U003', name: '박대리', username: 'park.agent', role: 'agent', department: '시설관리과', isActive: true },
  { id: 'U004', name: '최관리자', username: 'choi.admin', role: 'admin', department: '정보화담당관', isActive: true },
  { id: 'U005', name: '정담당', username: 'jung.agent', role: 'agent', department: '도로관리과', isActive: false },
];

const mockDepartments = [
  { id: 'D001', code: 'ROAD', name: '도로관리과', parent: '도시관리국', isActive: true, userCount: 12 },
  { id: 'D002', code: 'ENV', name: '환경관리과', parent: '환경국', isActive: true, userCount: 8 },
  { id: 'D003', code: 'FAC', name: '시설관리과', parent: '도시관리국', isActive: true, userCount: 10 },
  { id: 'D004', code: 'TRAFFIC', name: '교통행정과', parent: '교통국', isActive: true, userCount: 15 },
  { id: 'D005', code: 'IT', name: '정보화담당관', parent: '기획조정실', isActive: true, userCount: 5 },
];

const roleMap = {
  agent: { label: '처리 담당자', color: 'bg-blue-100 text-blue-800' },
  admin: { label: '운영 관리자', color: 'bg-purple-100 text-purple-800' },
};

export function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeptChangeDialog, setShowDeptChangeDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [deptError, setDeptError] = useState('');

  // User form state
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userDepartment, setUserDepartment] = useState('');

  // Department form state
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptParent, setDeptParent] = useState('');

  const handleAddUser = () => {
    if (!userName || !userUsername || !userRole || !userDepartment) {
      toast('모든 필수 항목을 입력해주세요');
      return;
    }
    setShowUserDialog(false);
    toast('사용자가 추가되었습니다');
    // Reset form
    setUserName('');
    setUserUsername('');
    setUserRole('');
    setUserDepartment('');
  };

  const handleAddDepartment = () => {
    if (!deptCode || !deptName || !deptParent) {
      toast('모든 필수 항목을 입력해주세요');
      return;
    }

    // Check for duplicate code
    if (mockDepartments.some((d) => d.code === deptCode)) {
      setDeptError('이미 존재하는 부서 코드입니다');
      return;
    }

    setShowDeptDialog(false);
    setDeptError('');
    toast('부서가 추가되었습니다');
    // Reset form
    setDeptCode('');
    setDeptName('');
    setDeptParent('');
  };

  const handleToggleUserActive = (user: any) => {
    toast(user.isActive ? `${user.name} 비활성화되었습니다` : `${user.name} 활성화되었습니다`);
  };

  const handleChangeRole = () => {
    if (!newRole) {
      toast('권한을 선택해주세요');
      return;
    }
    setShowRoleDialog(false);
    toast('권한이 변경되었습니다');
    setSelectedUser(null);
    setNewRole('');
  };

  const handleChangeDepartment = () => {
    if (!newDepartment) {
      toast('부서를 선택해주세요');
      return;
    }
    setShowDeptChangeDialog(false);
    toast('부서가 변경되었습니다');
    setSelectedUser(null);
    setNewDepartment('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1>사용자/부서 관리</h1>
        <p className="text-sm text-muted-foreground">시스템 사용자 및 조직 관리</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="users" className="h-full flex flex-col">
          <div className="border-b border-border px-6 bg-card">
            <TabsList>
              <TabsTrigger value="users">사용자</TabsTrigger>
              <TabsTrigger value="departments">부서</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            {/* Tab 1: Users */}
            <TabsContent value="users" className="m-0 h-full">
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="이름/아이디 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-input-background"
                    />
                  </div>
                  <Button onClick={() => setShowUserDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    사용자 추가
                  </Button>
                </div>

                <div className="bg-card border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>아이디</TableHead>
                        <TableHead>권한</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead>활성</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.username}
                          </TableCell>
                          <TableCell>
                            <Badge className={roleMap[user.role as keyof typeof roleMap].color}>
                              {roleMap[user.role as keyof typeof roleMap].label}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>
                            <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
                              {user.isActive ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleUserActive(user)}
                              >
                                {user.isActive ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRoleDialog(true);
                                }}
                              >
                                권한 변경
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeptChangeDialog(true);
                                }}
                              >
                                부서 변경
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Departments */}
            <TabsContent value="departments" className="m-0 h-full">
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="부서명/코드 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-input-background"
                    />
                  </div>
                  <Button onClick={() => setShowDeptDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    부서 추가
                  </Button>
                </div>

                <div className="bg-card border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>부서명</TableHead>
                        <TableHead>코드</TableHead>
                        <TableHead>상위부서</TableHead>
                        <TableHead>사용자수</TableHead>
                        <TableHead>활성</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDepartments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell>{dept.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{dept.code}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {dept.parent}
                          </TableCell>
                          <TableCell className="text-sm">{dept.userCount}명</TableCell>
                          <TableCell>
                            <Badge className={dept.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
                              {dept.isActive ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4 mr-1" />
                              수정
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 추가</DialogTitle>
            <DialogDescription>새로운 시스템 사용자를 등록합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                placeholder="이름 입력"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-input-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">아이디 *</Label>
              <Input
                id="username"
                placeholder="아이디 입력"
                value={userUsername}
                onChange={(e) => setUserUsername(e.target.value)}
                className="bg-input-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">권한 *</Label>
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger id="role" className="bg-input-background">
                  <SelectValue placeholder="권한 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">처리 담당자</SelectItem>
                  <SelectItem value="admin">운영 관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept">부서 *</Label>
              <Select value={userDepartment} onValueChange={setUserDepartment}>
                <SelectTrigger id="dept" className="bg-input-background">
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mockDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.code}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddUser}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>부서 추가</DialogTitle>
            <DialogDescription>새로운 부서를 등록합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-code">부서 코드 *</Label>
              <Input
                id="dept-code"
                placeholder="예: WELFARE"
                value={deptCode}
                onChange={(e) => {
                  setDeptCode(e.target.value);
                  setDeptError('');
                }}
                className="bg-input-background"
              />
              {deptError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {deptError}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-name">부서명 *</Label>
              <Input
                id="dept-name"
                placeholder="부서명 입력"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="bg-input-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-parent">상위부서 *</Label>
              <Input
                id="dept-parent"
                placeholder="예: 복지국"
                value={deptParent}
                onChange={(e) => setDeptParent(e.target.value)}
                className="bg-input-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeptDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddDepartment}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>권한 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.name} 사용자의 권한을 변경합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>현재 권한</Label>
              <div className="p-3 bg-muted rounded">
                <Badge className={roleMap[selectedUser?.role as keyof typeof roleMap]?.color}>
                  {roleMap[selectedUser?.role as keyof typeof roleMap]?.label}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">새 권한 *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="new-role" className="bg-input-background">
                  <SelectValue placeholder="권한 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">처리 담당자</SelectItem>
                  <SelectItem value="admin">운영 관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              취소
            </Button>
            <Button onClick={handleChangeRole}>변경</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Department Dialog */}
      <Dialog open={showDeptChangeDialog} onOpenChange={setShowDeptChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>부서 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.name} 사용자의 소속 부서를 변경합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>현재 부서</Label>
              <div className="p-3 bg-muted rounded text-sm">
                {selectedUser?.department}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-dept">새 부서 *</Label>
              <Select value={newDepartment} onValueChange={setNewDepartment}>
                <SelectTrigger id="new-dept" className="bg-input-background">
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mockDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.code}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeptChangeDialog(false)}>
              취소
            </Button>
            <Button onClick={handleChangeDepartment}>변경</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
