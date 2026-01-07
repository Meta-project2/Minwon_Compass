import { useState } from 'react';
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
  const [userRole, setUserRole] = useState<'agent' | 'admin' | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'login' });

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

  if (!userRole || currentPage.type === 'login') {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
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
          <RerouteRequestsPage />
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
      <Toaster />
    </>
  );
}