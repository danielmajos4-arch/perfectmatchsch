import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, role, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLocation('/login');
      return;
    }

    if (role !== 'admin') {
      // Redirect non-admins to their appropriate dashboard
      if (role === 'teacher') {
        setLocation('/teacher/dashboard');
      } else if (role === 'school') {
        setLocation('/school/dashboard');
      } else {
        setLocation('/dashboard');
      }
      return;
    }

    setChecked(true);
  }, [user, role, authLoading, setLocation]);

  if (authLoading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authorized, return null to allow redirect to happen silently via useEffect
  if (!user || role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}

