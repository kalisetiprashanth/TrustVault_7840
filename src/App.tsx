import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { VerifyChainModal } from './components/VerifyChainModal.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';

import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { MyDocumentsPage } from './pages/MyDocumentsPage.tsx';
import { SharedWithMePage } from './pages/SharedWithMePage.tsx';
import { SharedByMePage } from './pages/SharedByMePage.tsx';
import { DocumentDetailsPage } from './pages/DocumentDetailsPage.tsx';
import { AuditPage } from './pages/AuditPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { NotificationsPage } from './pages/NotificationsPage.tsx';
import { SecurityTestPage } from './pages/SecurityTestPage.tsx';
import { ExternalInvitePage } from './pages/ExternalInvitePage.tsx';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [shareDocTarget, setShareDocTarget] = useState<{ id: string; title: string } | null>(null);
  const [externalInviteToken, setExternalInviteToken] = useState<string>('');

  useEffect(() => {
    // Check if URL has invite parameter
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    if (inviteParam) {
      setExternalInviteToken(inviteParam);
      setCurrentPage('external-portal');
    }
  }, []);

  const handleOpenShare = (docId: string, docTitle: string) => {
    setShareDocTarget({ id: docId, title: docTitle });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30 animate-pulse">
          <span className="text-white font-bold text-lg font-mono">TV</span>
        </div>
        <p className="text-xs text-slate-400 font-mono">Initializing TrustVault Cryptographic Environment...</p>
      </div>
    );
  }

  // If user is not authenticated and is on login/register/external portal
  if (!user) {
    if (currentPage === 'register') {
      return <RegisterPage onNavigate={setCurrentPage} />;
    }
    if (currentPage === 'external-portal') {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
          <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
            <span className="font-bold text-lg text-white">TrustVault Guest Portal</span>
            <button
              onClick={() => setCurrentPage('login')}
              className="text-xs text-cyan-400 hover:underline"
            >
              Member Login &rarr;
            </button>
          </div>
          <ExternalInvitePage
            initialToken={externalInviteToken}
            onNavigate={setCurrentPage}
          />
        </div>
      );
    }
    return <LoginPage onNavigate={setCurrentPage} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Top Header Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenChainModal={() => setIsChainModalOpen(true)}
      />

      {/* Main Body Layout: Sidebar + Page Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <Sidebar
          currentPage={currentPage.startsWith('document-') ? 'my-documents' : currentPage}
          onNavigate={setCurrentPage}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {currentPage === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentPage}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onOpenChainModal={() => setIsChainModalOpen(true)}
            />
          )}

          {currentPage === 'my-documents' && (
            <MyDocumentsPage
              onNavigate={setCurrentPage}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onOpenShare={handleOpenShare}
            />
          )}

          {currentPage === 'shared-with-me' && (
            <SharedWithMePage onNavigate={setCurrentPage} />
          )}

          {currentPage === 'shared-by-me' && (
            <SharedByMePage
              onNavigate={setCurrentPage}
              onOpenShare={handleOpenShare}
            />
          )}

          {currentPage.startsWith('document-') && (
            <DocumentDetailsPage
              documentId={currentPage.replace('document-', '')}
              onNavigate={setCurrentPage}
              onOpenShare={handleOpenShare}
            />
          )}

          {currentPage === 'audit' && (
            <AuditPage onOpenChainModal={() => setIsChainModalOpen(true)} />
          )}

          {currentPage === 'admin' && <AdminPage />}

          {currentPage === 'profile' && <ProfilePage />}

          {currentPage === 'notifications' && (
            <NotificationsPage onNavigate={setCurrentPage} />
          )}

          {currentPage === 'security-tests' && <SecurityTestPage />}

          {currentPage === 'external-portal' && (
            <ExternalInvitePage
              initialToken={externalInviteToken}
              onNavigate={setCurrentPage}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <VerifyChainModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          // Re-trigger view if on documents
          setCurrentPage('my-documents');
        }}
      />

      {shareDocTarget && (
        <ShareModal
          isOpen={Boolean(shareDocTarget)}
          onClose={() => setShareDocTarget(null)}
          documentId={shareDocTarget.id}
          documentTitle={shareDocTarget.title}
          onShareSuccess={() => {
            setShareDocTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
