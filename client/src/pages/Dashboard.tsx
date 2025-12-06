import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Time to wait for role to load before showing error (ms) - increased for slow networks
const ROLE_WAIT_TIMEOUT = 10000; // 10 seconds
const RECOVERY_ATTEMPT_TIMEOUT = 3000; // 3 seconds for recovery attempts

type LoadingState = 'initial' | 'checking' | 'recovering' | 'error';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, role, loading, refreshRole } = useAuth();
  const redirectAttempted = useRef(false);
  const [showInvalidRole, setShowInvalidRole] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  // Auto-recovery function to attempt fixing missing role
  const attemptRoleRecovery = async (): Promise<boolean> => {
    if (!user) return false;

    console.log('[Dashboard] Attempting role recovery for user:', user.id);
    setLoadingState('recovering');

    try {
      // Try to fetch role from database
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      console.log('[Dashboard] Recovery attempt - DB fetch:', { data, error });

      // If found valid role in DB, return success
      if (data?.role && (data.role === 'teacher' || data.role === 'school' || data.role === 'admin')) {
        console.log('[Dashboard] Recovery successful - found role in DB:', data.role);
        return true;
      }

      // Check user_metadata for role
      const metadataRole = user.user_metadata?.role;
      if (metadataRole && (metadataRole === 'teacher' || metadataRole === 'school' || metadataRole === 'admin')) {
        console.log('[Dashboard] Recovery attempt - found role in metadata:', metadataRole);
        
        // Try to create/update user record
        if (!data) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              role: metadataRole,
              full_name: user.user_metadata?.full_name || '',
            });

          if (!insertError || insertError.code === '23505') {
            console.log('[Dashboard] Recovery successful - created user record with role:', metadataRole);
            return true;
          }
        } else {
          const { error: updateError } = await supabase
            .from('users')
            .update({ role: metadataRole })
            .eq('id', user.id);

          if (!updateError) {
            console.log('[Dashboard] Recovery successful - updated user record with role:', metadataRole);
            return true;
          }
        }
      }

      console.warn('[Dashboard] Recovery failed - no valid role found');
      return false;
    } catch (err) {
      console.error('[Dashboard] Recovery error:', err);
      return false;
    }
  };

  // Delayed check for invalid role with auto-recovery
  useEffect(() => {
    if (loading || !user || role) {
      // Reset if conditions change
      setShowInvalidRole(false);
      setLoadingState('initial');
      setIsRetrying(false);
      return;
    }

    // User exists but no role - wait and then attempt recovery
    let timeoutId: NodeJS.Timeout;
    let recoveryTimeoutId: NodeJS.Timeout;

    const checkAndRecover = async () => {
      console.log('[Dashboard] Starting role check and recovery process');
      setLoadingState('checking');

      // Wait for initial timeout
      timeoutId = setTimeout(async () => {
        // Double-check conditions are still the same
        if (!loading && user && !role) {
          console.log('[Dashboard] Role not found after initial wait, attempting recovery...');
          
          // Attempt recovery
          const recoveryPromise = attemptRoleRecovery();
          recoveryTimeoutId = setTimeout(() => {
            // Recovery timed out
            console.warn('[Dashboard] Recovery attempt timed out');
            setErrorMessage('Unable to load your account role. This might be a temporary network issue.');
            setShowInvalidRole(true);
            setLoadingState('error');
          }, RECOVERY_ATTEMPT_TIMEOUT);

          const recovered = await recoveryPromise;
          clearTimeout(recoveryTimeoutId);

          if (recovered) {
            console.log('[Dashboard] Recovery successful, refreshing role...');
            // Trigger role refresh in AuthContext
            if (refreshRole) {
              await refreshRole();
            } else {
              // Fallback: reload the page to trigger auth refresh
              window.location.reload();
            }
          } else {
            console.warn('[Dashboard] Recovery failed, showing error');
            setErrorMessage('Your account role is missing. Please try again or contact support if this persists.');
            setShowInvalidRole(true);
            setLoadingState('error');
          }
        }
      }, ROLE_WAIT_TIMEOUT);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(recoveryTimeoutId);
      };
    };

    checkAndRecover();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (recoveryTimeoutId) clearTimeout(recoveryTimeoutId);
    };
  }, [user, role, loading, refreshRole]);

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
    const loadingMessage = 
      loadingState === 'recovering' 
        ? 'Trying to fix your account...' 
        : loadingState === 'checking'
        ? 'Checking your account...'
        : 'Loading your profile...';

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // Handle retry
  const handleRetry = async () => {
    console.log('[Dashboard] User clicked retry button');
    setIsRetrying(true);
    setShowInvalidRole(false);
    setLoadingState('checking');
    setErrorMessage('');

    // Wait a moment then attempt recovery
    setTimeout(async () => {
      const recovered = await attemptRoleRecovery();
      if (recovered) {
        console.log('[Dashboard] Retry successful, refreshing role...');
        if (refreshRole) {
          await refreshRole();
        } else {
          window.location.reload();
        }
      } else {
        console.warn('[Dashboard] Retry failed');
        setErrorMessage('Unable to load your account role. This might be a temporary network issue.');
        setShowInvalidRole(true);
        setLoadingState('error');
      }
      setIsRetrying(false);
    }, 500);
  };

  // Show "Invalid User Role" error with retry option
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <p className="text-xl font-semibold text-foreground mb-2">Unable to Load Account Role</p>
        <p className="text-muted-foreground mb-6">
          {errorMessage || 'Your account role could not be loaded. This might be a temporary issue.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            data-testid="button-retry"
            className="min-w-[120px]"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Trying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              setLocation('/login');
            }}
            data-testid="button-logout"
            className="min-w-[120px]"
          >
            Sign Out
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          If this problem continues, please contact support or try signing up again.
        </p>
      </div>
    </div>
  );
}
