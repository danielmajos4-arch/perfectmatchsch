import { ReactNode, useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

// Timeout for profile check (5 seconds) - if exceeded, assume profile is complete
const PROFILE_CHECK_TIMEOUT_MS = 5000;

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRole: 'teacher' | 'school';
}

export function RoleProtectedRoute({ children, allowedRole }: RoleProtectedRouteProps) {
  const { user, role, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const checkCompleted = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout - if profile check takes too long, proceed anyway
    // This prevents getting stuck on "Loading..." in PWA/offline mode
    const timeoutId = setTimeout(() => {
      if (!checkCompleted.current && isMounted) {
        console.warn('[RoleProtectedRoute] Profile check timed out - proceeding with current state');
        checkCompleted.current = true;
        setProfileComplete(true); // Assume complete if we can't check
        setProfileChecked(true);
      }
    }, PROFILE_CHECK_TIMEOUT_MS);

    async function checkProfile() {
      if (authLoading || !user) return;
      if (!isMounted || checkCompleted.current) return;

      // If role doesn't match, redirect to dashboard (which will redirect to correct dashboard)
      if (!role) {
        checkCompleted.current = true;
        setProfileChecked(true);
        setLocation('/dashboard');
        return;
      }

      if (role !== allowedRole) {
        checkCompleted.current = true;
        setProfileChecked(true);
        setLocation('/dashboard');
        return;
      }

      try {
        if (allowedRole === 'teacher') {
          const { data, error } = await supabase
            .from('teachers')
            .select('profile_complete, archetype')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isMounted || checkCompleted.current) return;

          if (error) {
            console.error('Error fetching teacher profile:', error);
            // On error, assume profile is complete to avoid blocking user
            checkCompleted.current = true;
            setProfileComplete(true);
            setProfileChecked(true);
            return;
          }

          if (!data || !data.profile_complete || !data.archetype) {
            checkCompleted.current = true;
            setProfileChecked(true);
            setLocation('/onboarding/teacher');
            return;
          }
          checkCompleted.current = true;
          setProfileComplete(true);
          setProfileChecked(true);
        } else if (allowedRole === 'school') {
          const { data, error } = await supabase
            .from('schools')
            .select('profile_complete')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isMounted || checkCompleted.current) return;

          if (error) {
            console.error('Error fetching school profile:', error);
            // On error, assume profile is complete to avoid blocking user
            checkCompleted.current = true;
            setProfileComplete(true);
            setProfileChecked(true);
            return;
          }

          if (!data || !data.profile_complete) {
            checkCompleted.current = true;
            setProfileChecked(true);
            setLocation('/onboarding/school');
            return;
          }
          checkCompleted.current = true;
          setProfileComplete(true);
          setProfileChecked(true);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        if (isMounted && !checkCompleted.current) {
          // On error, assume profile is complete to avoid blocking user
          checkCompleted.current = true;
          setProfileComplete(true);
          setProfileChecked(true);
        }
      }
    }

    if (!authLoading) {
      if (!user) {
        setLocation('/login');
        setProfileChecked(true);
      } else {
        checkProfile();
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user, role, authLoading, allowedRole, setLocation]);

  // Show loading only briefly while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" data-testid="spinner-loading" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, return null (redirect to login is happening)
  if (!user) {
    return null;
  }

  // If role doesn't match, return null (redirect is happening)
  if (role && role !== allowedRole) {
    return null;
  }

  // If still checking profile, show brief loading
  if (!profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" data-testid="spinner-loading" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If profile check completed but profile not complete, return null (redirect happening)
  if (!profileComplete) {
    return null;
  }

  return <>{children}</>;
}
