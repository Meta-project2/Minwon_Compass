import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Layout } from './components/Layout';
import { ComplaintListPage } from './components/ComplaintListPage';
import { ComplaintDetailPage } from './components/ComplaintDetailPage';
import { IncidentListPage } from './components/IncidentListPage';
import { IncidentDetailPage } from './components/IncidentDetailPage';
import { AdminDashboard } from './components/AdminDashboard';
import { RerouteRequestsPage } from './components/RerouteRequestsPage';
import { KnowledgeBaseListPage } from './components/KnowledgeBaseListPage';
import { KnowledgeBaseDetailPage } from './components/KnowledgeBaseDetailPage';
import { UserManagementPage } from './components/UserManagementPage';
import { Toaster } from './components/ui/sonner';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ApplicantLoginPage from './components/applicant/ApplicantLoginPage';
import ApplicantMainPage from './components/applicant/ApplicantMainPage';
import LoginSuccess from './components/applicant/LoginSuccess';
import ApplicantLogout from './components/applicant/ApplicantLogout';
import ApplicantComplaintCreatePage from './components/applicant/ApplicantComplaintCreatePage';
import ApplicantSignUpPage from './components/applicant/ApplicantSignUpPage';
import ApplicantFindIdPage from './components/applicant/ApplicantFindIdPage';
import ApplicantResetPwPage from './components/applicant/ApplicantResetPwPage';
import ComplaintDetail from './components/applicant/ComplaintDetail';
import PastComplaintsPage from './components/applicant/ComplaintListPage';
import { AgentComplaintApi } from '../api/AgentComplaintApi';

type Page =
  | { type: 'login' }
  | { type: 'complaints' }
  | { type: 'complaint-detail'; id: string }
  | { type: 'incidents' }
  | { type: 'incident-detail'; id: string }
  | { type: 'dashboard' }
  | { type: 'reroute-requests' }
  | { type: 'knowledge-base' }
  | { type: 'knowledge-base-detail'; id: string }
  | { type: 'user-management' }
  | { type: 'settings' };

export default function App() {
  return (
    <Router>
      <AppContent />
      <Toaster />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isApplicantPath = location.pathname.startsWith('/applicant');

  const [userRole, setUserRole] = useState<'agent' | 'admin' | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [departmentName, setDepartmentName] = useState<string>(''); // [추가] 부서명 상태
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'login' });
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가 (깜빡임 방지)

  // 새로고침 시 세션 복구
  useEffect(() => {
    const restoreSession = async () => {
      // 민원인 페이지가 아닐 때만 수행
      if (!isApplicantPath) {
        try {
          // 1. 백엔드에 내 정보 요청 (/api/agent/me)
          const userData = await AgentComplaintApi.getMe();
          
          // 2. 데이터가 있으면 역할 복구 (userData에 role이 있다고 가정)
          // 백엔드는 "ADMIN", "AGENT" 대문자로 줌 -> 소문자로 변환 필요
          // (Typescript 에러가 난다면 any로 감싸거나 DTO를 수정해야 함)
          const serverRole = (userData as any).role;
          const serverName = (userData as any).displayName; 
          const serverDept = (userData as any).departmentName;

          if (serverRole) {
             const roleLower = serverRole.toLowerCase() as 'agent' | 'admin';
             setUserRole(roleLower);
             setUserName(serverName || '알 수 없음');
             setDepartmentName(serverDept || '소속 없음'); // [추가] 부서명 설정
             
             // 3. 로그인 페이지에 있었다면 대시보드나 목록으로 이동
             if (currentPage.type === 'login') {
                if (roleLower === 'admin') setCurrentPage({ type: 'dashboard' });
                else setCurrentPage({ type: 'complaints' });
             }
          }
        } catch (error) {
          console.log("세션 만료 또는 비로그인 상태");
          setUserRole(null);
        }
      }
      setIsLoading(false); // 로딩 끝
    };

    restoreSession();
  }, [isApplicantPath]); // 의존성 배열

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await AgentComplaintApi.logout(); // 1. 서버 세션 삭제
    } catch (error) {
      console.error("로그아웃 실패:", error);
    } finally {
      // 2. 프론트 상태 초기화
      setUserRole(null);
      setUserName('');
      setCurrentPage({ type: 'login' });
      // 필요하다면: window.location.href = '/agent/login'; 로 강제 이동
    }
  };

  const handleLogin = (role: 'agent' | 'admin') => {
    setUserRole(role);
    // Navigate to default page based on role
    if (role === 'admin') {
      setCurrentPage({ type: 'dashboard' });
    } else {
      setCurrentPage({ type: 'complaints' });
    }
  };

  const handleNavigate = (page: string) => {
    if (page === 'complaints') {
      setCurrentPage({ type: 'complaints' });
    } else if (page === 'incidents') {
      setCurrentPage({ type: 'incidents' });
    } else if (page === 'dashboard') {
      setCurrentPage({ type: 'dashboard' });
    } else if (page === 'reroute-requests') {
      setCurrentPage({ type: 'reroute-requests' });
    } else if (page === 'knowledge-base') {
      setCurrentPage({ type: 'knowledge-base' });
    } else if (page === 'user-management') {
      setCurrentPage({ type: 'user-management' });
    } else if (page === 'settings') {
      setCurrentPage({ type: 'settings' });
    }
  };

  const handleViewComplaintDetail = (id: string) => {
    setCurrentPage({ type: 'complaint-detail', id });
  };

  const handleViewIncidentDetail = (id: string) => {
    setCurrentPage({ type: 'incident-detail', id });
  };

  const handleViewKnowledgeBaseDetail = (id: string) => {
    setCurrentPage({ type: 'knowledge-base-detail', id });
  };

  const handleBackToList = (listType: 'complaints' | 'incidents' | 'knowledge-base') => {
    setCurrentPage({ type: listType });
  };

  // 로딩중 화면 가리기
  if (isLoading && !isApplicantPath) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // 민원인 페이지 처리
  if (isApplicantPath) {
    return (
      <Routes>
        {/* 1. 민원인(Applicant) 페이지 경로 */}
        <Route path="/applicant/login" element={<ApplicantLoginPage />} />
        <Route path="/applicant/logout" element={<ApplicantLogout />} />
        <Route path="/applicant/login-success" element={<LoginSuccess />} />
        <Route path="/applicant/main" element={<ApplicantMainPage />} />
        <Route path="/applicant/complaints/form" element={<ApplicantComplaintCreatePage />} />
        <Route path="/applicant/signup" element={<ApplicantSignUpPage />} />
        <Route path="/applicant/find-id" element={<ApplicantFindIdPage />} />
        <Route path="/applicant/find-password" element={<ApplicantResetPwPage />} />
        <Route path="/applicant/complaints/:id" element={<ComplaintDetail />} />
        <Route path="/applicant/complaints" element={<PastComplaintsPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* 2. 상담원(Agent) 및 관리자(Admin) 페이지 경로 */}
      <Route path="/agent/*" element={
        // 사용자 권한이 없으면 로그인 페이지로, 있으면 레이아웃과 해당 페이지로 이동
        !userRole ? (
          <LoginPage onLogin={(role) => {
             // 로그인 성공 시 로직도 업데이트(이름을 로그인 응답에서 받거나, getMe를 다시 호출)
             setUserRole(role);
             // 임시로 일단 getMe를 다시 호출해서 이름을 채움
             AgentComplaintApi.getMe().then(u => {
         setUserName((u as any).displayName);
         setDepartmentName((u as any).departmentName); // [추가]
       });
             
             if(role === 'admin') setCurrentPage({type:'dashboard'});
             else setCurrentPage({type:'complaints'});
          }} />
        ) : (
          <Layout
            currentPage={
              currentPage.type === 'complaints' || currentPage.type === 'complaint-detail'
                ? 'complaints'
                : currentPage.type === 'incidents' || currentPage.type === 'incident-detail'
                  ? 'incidents'
                  : currentPage.type === 'knowledge-base' || currentPage.type === 'knowledge-base-detail'
                    ? 'knowledge-base'
                    : currentPage.type
            }
            onNavigate={handleNavigate}
            userRole={userRole}
            userName={userName}     
            onLogout={handleLogout}
          >
            {currentPage.type === 'complaints' && (
              <ComplaintListPage onViewDetail={handleViewComplaintDetail} />
            )}
            {currentPage.type === 'complaint-detail' && (
              <ComplaintDetailPage
                complaintId={currentPage.id}
                onBack={() => handleBackToList('complaints')}
              />
            )}
            {currentPage.type === 'incidents' && (
              <IncidentListPage onViewDetail={handleViewIncidentDetail} />
            )}
            {currentPage.type === 'incident-detail' && (
              <IncidentDetailPage
                incidentId={currentPage.id}
                onBack={() => handleBackToList('incidents')}
                onViewComplaint={handleViewComplaintDetail}
              />
            )}
            {currentPage.type === 'dashboard' && (
              <AdminDashboard />
            )}
            {currentPage.type === 'reroute-requests' && (
              <RerouteRequestsPage userRole={userRole} />
            )}
            {currentPage.type === 'knowledge-base' && (
              <KnowledgeBaseListPage onViewDetail={handleViewKnowledgeBaseDetail} />
            )}
            {currentPage.type === 'knowledge-base-detail' && (
              <KnowledgeBaseDetailPage
                docId={currentPage.id}
                onBack={() => handleBackToList('knowledge-base')}
              />
            )}
            {currentPage.type === 'user-management' && (
              <UserManagementPage />
            )}
            {/* {currentPage.type === 'settings' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="mb-2">설정</h2>
                  <p className="text-muted-foreground">설정 페이지</p>
                </div>
              </div>
            )} */}
          </Layout>
        )
      } />
    </Routes>
  );
}