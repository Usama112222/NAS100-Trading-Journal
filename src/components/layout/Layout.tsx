'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auth pages
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // Handle redirects in useEffect to prevent React warning
  useEffect(() => {
    if (!loading) {
      // Redirect to login if not authenticated and not on auth page
      if (!user && !isAuthPage) {
        router.push('/login');
      }
      
      // Redirect to dashboard if authenticated and on auth page
      if (user && isAuthPage) {
        router.push('/');
      }
    }
  }, [user, loading, router, isAuthPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth pages - render without sidebar
  if (isAuthPage) {
    return <>{children}</>;
  }

  // No user - don't render protected content (wait for redirect)
  if (!user) {
    return null;
  }

  // Protected pages - render with sidebar and header
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}