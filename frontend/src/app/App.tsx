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
import HeatmapPage from './components/HeatMap';
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
  | { type: 'settings' }
  | { type: 'heatmap' };

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
  const [departmentName, setDepartmentName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'login' });
  const [isLoading, setIsLoading] = useState(true);
  const [savedIncidentPage, setSavedIncidentPage] = useState(1);

  useEffect(() => {
    const restoreSession = async () => {
      if (!isApplicantPath) {
        try {
          const userData = await AgentComplaintApi.getMe();
          const serverRole = (userData as any).role;
          const serverName = (userData as any).displayName;
          const serverDept = (userData as any).departmentName;

          if (serverRole) {
            const roleLower = serverRole.toLowerCase() as 'agent' | 'admin';
            setUserRole(roleLower);
            setUserName(serverName || '알 수 없음');
            setDepartmentName(serverDept || '소속 없음');

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
      setIsLoading(false);
    };

    restoreSession();
  }, [isApplicantPath]);

  const handleLogout = async () => {
    try {
      await AgentComplaintApi.logout();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    } finally {
      setUserRole(null);
      setUserName('');
      setCurrentPage({ type: 'login' });
    }
  };

  const handleLogin = (role: 'agent' | 'admin') => {
    setUserRole(role);
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
    } else if (page === 'heatmap') {
      setCurrentPage({ type: 'heatmap' });
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

  if (isLoading && !isApplicantPath) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (isApplicantPath) {
    return (
      <Routes>
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
      <Route path="/agent/*" element={
        !userRole ? (
          <LoginPage onLogin={(role) => {
            setUserRole(role);
            AgentComplaintApi.getMe().then(u => {
              setUserName((u as any).displayName);
              setDepartmentName((u as any).departmentName);
            });

            if (role === 'admin') setCurrentPage({ type: 'dashboard' });
            else setCurrentPage({ type: 'complaints' });
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
            departmentName={departmentName}
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
              <IncidentListPage
                onViewDetail={handleViewIncidentDetail}
                savedPage={savedIncidentPage}
                onSavePage={setSavedIncidentPage}
              />
            )}

            {currentPage.type === 'incident-detail' && (
              <IncidentDetailPage
                incidentId={currentPage.id}
                onBack={() => handleBackToList('incidents')}
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
            {currentPage.type === 'heatmap' && (
              <HeatmapPage />
            )}
          </Layout>
        )
      } />
    </Routes>
  );
}