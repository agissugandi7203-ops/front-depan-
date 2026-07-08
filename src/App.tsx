import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminGuard } from '@/components/AdminGuard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ToastProvider } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// Lazy loaded page components
const HomePage = React.lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const ChatPage = React.lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })));
const ChatUser = React.lazy(() => import('@/pages/ChatUser').then(m => ({ default: m.ChatUser })));
const AboutPage = React.lazy(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const AllReports = React.lazy(() => import('@/pages/AllReports').then(m => ({ default: m.AllReports })));
const AdminDashboard = React.lazy(() => import('@/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
// Auth modal — lazy loaded (only appears after user interaction, not needed at initial paint)
const AuthModal = React.lazy(() => import('@/components/AuthModal').then(m => ({ default: m.AuthModal })));
const VerifyEmail = React.lazy(() => import('@/pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const AuthCallback = React.lazy(() => import('@/pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage'));

// Custom loading component for smooth page transitions
const PageLoader = () => (
  <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-sans">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden p-2.5 mb-4 animate-pulse">
      <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-full w-full object-contain onError={(e) => e.currentTarget.style.display = 'none'}" />
    </div>
    <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
    <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 animate-pulse">Memuat Halaman...</p>
  </div>
);

import { useSmoothScroll } from '@/hooks/useSmoothScroll';

function App() {
  useSmoothScroll();
  const { checkMe, isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && !user) {
      checkMe()
    }
  }, [isAuthenticated, user, checkMe])

  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/konsultasi" element={
              <ProtectedRoute>
                <ChatUser />
              </ProtectedRoute>
            } />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/all-reports" element={
              <ProtectedRoute>
                <AllReports />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin/login" element={<Navigate to="/" replace />} />
            <Route path="/admin" element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* AuthModal: lazily rendered, own Suspense so it doesn't block page load */}
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
        </Suspense>
      </Router>
    </ToastProvider>
  );
}

export default App;
