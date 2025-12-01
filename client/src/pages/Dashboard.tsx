import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

// Time to wait for role to load before showing error (ms)
const ROLE_WAIT_TIMEOUT = 3000;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, role, loading } = useAuth();
  const redirectAttempted = useRef(false);
  const [showInvalidRole, setShowInvalidRole] = useState(false);

  // Handle redirects based on role
  useEffect(() => {
    if (loading) return;

    // No user - redirect to login
    if (!user) {
      if (!redirectAttempted.current) {
        redirectAttempted.current = true;
        setLocation('/login');
      }
      return;
    }

    // User has valid role - redirect to appropriate dashboard
    if (role === 'admin') {
      redirectAttempted.current = true;
      setLocation('/admin/dashboard');
    } else if (role === 'teacher') {
      redirectAttempted.current = true;
      setLocation('/teacher/dashboard');
    } else if (role === 'school') {
      redirectAttempted.current = true;
      setLocation('/school/dashboard');
    }
    // If role is null, don't set redirectAttempted - wait for role to load
  }, [user, role, loading, setLocation]);

  // Delayed check for invalid role - give time for role to load
  useEffect(() => {
    if (loading || !user || role) {
      // Reset if conditions change
      setShowInvalidRole(false);
      return;
    }

    // User exists but no role - wait a bit before showing error
    const timeoutId = setTimeout(() => {
      // Double-check conditions are still the same
      if (!loading && user && !role) {
        console.warn('[Dashboard] No valid role found after waiting, showing error');
        setShowInvalidRole(true);
      }
    }, ROLE_WAIT_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [user, role, loading]);

  // Show loading while auth is loading
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

  // If no user, return null (redirect to login is happening)
  if (!user) {
    return null;
  }

  // If user has valid role, return null (redirect to role dashboard is happening)
  if (role === 'teacher' || role === 'school' || role === 'admin') {
    return null;
  }

  // Show loading while waiting for role to potentially load
  if (!showInvalidRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Only show "Invalid User Role" after timeout and role is still null
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <p className="text-xl font-semibold text-foreground mb-2">Invalid User Role</p>
        <p className="text-muted-foreground mb-6">
          Your account doesn't have a valid role assigned. Please contact support or try signing up again.
        </p>
        <Button
          onClick={async () => {
            await supabase.auth.signOut();
            setLocation('/login');
          }}
          data-testid="button-logout"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
