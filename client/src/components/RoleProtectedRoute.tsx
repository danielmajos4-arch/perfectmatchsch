import { ReactNode, useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useTeacherProfile } from '@/hooks/useTeacherProfile';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';

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

  // Use hooks for cached data
  const { data: teacherProfile, isLoading: teacherLoading } = useTeacherProfile(user?.id);
  const { data: schoolProfile, isLoading: schoolLoading } = useSchoolProfile(user?.id);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout - if profile check takes too long, proceed anyway
    const timeoutId = setTimeout(() => {
      if (!checkCompleted.current && isMounted) {
        console.warn('[RoleProtectedRoute] Profile check timed out - proceeding with current state');
        checkCompleted.current = true;
        setProfileComplete(true);
        setProfileChecked(true);
      }
    }, PROFILE_CHECK_TIMEOUT_MS);

    const checkProfile = () => {
      if (authLoading || !user) return;
      if (!isMounted || checkCompleted.current) return;

      // If role doesn't match, redirect to dashboard
      if (!role || role !== allowedRole) {
        checkCompleted.current = true;
        setProfileChecked(true);
        setLocation('/dashboard');
        return;
      }

      // Check based on role
      if (allowedRole === 'teacher') {
        if (teacherLoading) return; // Wait for data

        if (!teacherProfile || !teacherProfile.profile_complete || !teacherProfile.archetype) {
          checkCompleted.current = true;
          setProfileChecked(true);
          setLocation('/onboarding/teacher');
          return;
        }
      } else if (allowedRole === 'school') {
        if (schoolLoading) return; // Wait for data

        if (!schoolProfile || !schoolProfile.profile_complete) {
          checkCompleted.current = true;
          setProfileChecked(true);
          setLocation('/onboarding/school');
          return;
        }
      }

      // If we got here, profile is complete
      checkCompleted.current = true;
      setProfileComplete(true);
      setProfileChecked(true);
    };

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
  }, [
    user,
    role,
    authLoading,
    allowedRole,
    setLocation,
    teacherProfile,
    schoolProfile,
    teacherLoading,
    schoolLoading
  ]);

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
