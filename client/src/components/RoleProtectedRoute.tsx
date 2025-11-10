import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRole: 'teacher' | 'school';
}

export function RoleProtectedRoute({ children, allowedRole }: RoleProtectedRouteProps) {
  const { user, role, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkProfile() {
      if (authLoading || !user) return;

      if (!isMounted) return;
      setProfileComplete(false);

      if (!role) {
        if (isMounted) {
          setProfileChecked(true);
          setLocation('/dashboard');
        }
        return;
      }

      if (role !== allowedRole) {
        if (isMounted) {
          setProfileChecked(true);
          setLocation('/dashboard');
        }
        return;
      }

      try {
        if (allowedRole === 'teacher') {
          const { data, error } = await supabase
            .from('teachers')
            .select('profile_complete, archetype')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isMounted) return;

          if (error) {
            console.error('Error fetching teacher profile:', error);
            setLocation('/');
            setProfileChecked(true);
            return;
          }

          if (!data || !data.profile_complete || !data.archetype) {
            setLocation('/onboarding/teacher');
            setProfileChecked(true);
            return;
          }
          setProfileComplete(true);
        } else if (allowedRole === 'school') {
          const { data, error } = await supabase
            .from('schools')
            .select('profile_complete')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isMounted) return;

          if (error) {
            console.error('Error fetching school profile:', error);
            setLocation('/');
            setProfileChecked(true);
            return;
          }

          if (!data || !data.profile_complete) {
            setLocation('/onboarding/school');
            setProfileChecked(true);
            return;
          }
          setProfileComplete(true);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        if (isMounted) {
          setLocation('/');
          setProfileChecked(true);
        }
      } finally{
        if (isMounted) {
          setProfileChecked(true);
        }
      }
    }

    if (!authLoading) {
      if (!user) {
        setLocation('/login');
      } else {
        checkProfile();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, authLoading, allowedRole, setLocation]);

  if (authLoading || !profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" data-testid="spinner-loading" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !role || role !== allowedRole || !profileComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" data-testid="spinner-redirecting" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
