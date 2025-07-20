import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import DebugInfo from './DebugInfo';
import LoadingSpinner from './LoadingSpinner';

const Layout = () => {
  const { user, profile, loading } = useAuth();

  // Show loading spinner with timeout
  if (loading) {
    return <LoadingSpinner message="Memuat..." timeout={15000} />;
  }

  // If no user, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile, show loading with timeout
  if (!profile) {
    return <LoadingSpinner message="Memuat profil..." timeout={8000} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b border-gray-200 bg-white shadow-sm flex items-center px-4 gap-4">
            <SidebarTrigger className="h-8 w-8 text-gray-600 hover:text-gray-900" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">
                Sistem Manajemen Inventaris
              </h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Debug Info */}
      <DebugInfo />
    </SidebarProvider>
  );
};

export default Layout;