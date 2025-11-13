import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { PublicLayout } from './PublicLayout';

interface LayoutProps {
  children: ReactNode;
  showMobileNav?: boolean;
}

/**
 * Layout Component
 * 
 * Conditionally renders AuthenticatedLayout or PublicLayout based on auth state
 * This is a wrapper that delegates to the appropriate layout
 */
export function Layout({ children, showMobileNav = false }: LayoutProps) {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Use AuthenticatedLayout for logged-in users
  if (isAuthenticated) {
    return <AuthenticatedLayout showMobileNav={showMobileNav}>{children}</AuthenticatedLayout>;
  }

  // Use PublicLayout for unauthenticated users
  return <PublicLayout>{children}</PublicLayout>;
}
