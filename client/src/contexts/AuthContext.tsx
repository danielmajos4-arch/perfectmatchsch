import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

// Timeout duration for auth initialization (prevents infinite loading in PWA offline mode)
const AUTH_TIMEOUT_MS = 5000;

// Valid role types
type UserRole = 'teacher' | 'school' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  refreshRole: async () => { },
});

// Helper to validate if a role is valid
const isValidRole = (role: unknown): role is UserRole => {
  return role === 'teacher' || role === 'school' || role === 'admin';
};

// Helper to extract role from user metadata
const getRoleFromMetadata = (user: User): UserRole | null => {
  // Try multiple possible locations for role in user_metadata
  const metadataRole = user.user_metadata?.role;

  console.log('[AuthContext] Checking user_metadata for role:', {
    user_metadata: user.user_metadata,
    metadataRole,
  });

  if (isValidRole(metadataRole)) {
    return metadataRole;
  }

  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const initCompleted = useRef(false);
  const isInitializing = useRef(false); // Prevent race condition with onAuthStateChange

  // Fetch role from public.users table, create record if missing
  const fetchOrCreateUserRole = async (currentUser: User): Promise<UserRole | null> => {
    const userId = currentUser.id;

    try {
      // First, try to fetch from users table
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to not error if no record

      console.log('[AuthContext] Fetched user role from DB:', { data, error });

      // If we found a role in the database, return it
      if (data?.role && isValidRole(data.role)) {
        console.log('[AuthContext] Found valid role in users table:', data.role);
        return data.role;
      }

      // No record in users table - check user_metadata for role
      const metadataRole = getRoleFromMetadata(currentUser);

      if (metadataRole) {
        console.log('[AuthContext] Found role in user_metadata:', metadataRole);
        console.log('[AuthContext] User record will be created during onboarding');
        // Skip creating user record here - it will be created when they save their profile
        // This avoids RLS policy conflicts during auth initialization

        return metadataRole;
      }

      console.warn('[AuthContext] No valid role found in database or user_metadata');
      return null;
    } catch (err) {
      console.error('[AuthContext] Error in fetchOrCreateUserRole:', err);

      // Last resort: try to get role from metadata even if DB operation failed
      const fallbackRole = getRoleFromMetadata(currentUser);
      if (fallbackRole) {
        console.log('[AuthContext] Using fallback role from metadata:', fallbackRole);
        return fallbackRole;
      }

      return null;
    }
  };

  // Function to manually refresh the role (for retry functionality)
  const refreshRole = async () => {
    if (!user) {
      console.log('[AuthContext] refreshRole called but no user');
      return;
    }

    console.log('[AuthContext] Manually refreshing role for user:', user.id);
    try {
      const userRole = await fetchOrCreateUserRole(user);
      console.log('[AuthContext] Role refreshed:', userRole);
      setRole(userRole);
    } catch (err) {
      console.error('[AuthContext] Error refreshing role:', err);
    }
  };

  useEffect(() => {
    // Safety timeout to prevent infinite loading (e.g., PWA offline mode)
    const timeoutId = setTimeout(() => {
      if (!initCompleted.current) {
        console.warn('[AuthContext] Auth initialization timed out - proceeding without session');
        isInitializing.current = false;
        initCompleted.current = true;
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    // Initialize auth session with error handling
    const initializeAuth = async () => {
      // Mark that we're initializing to prevent race with onAuthStateChange
      isInitializing.current = true;

      try {
        console.log('[AuthContext] Starting auth initialization...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          // Continue without session on error
          isInitializing.current = false;
          initCompleted.current = true;
          setLoading(false);
          return;
        }

        console.log('[AuthContext] Got session:', { hasSession: !!session, hasUser: !!session?.user });

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('[AuthContext] Fetching role for user:', session.user.id);
          const userRole = await fetchOrCreateUserRole(session.user);
          console.log('[AuthContext] Role fetched:', userRole);
          setRole(userRole);
        }

        isInitializing.current = false;
        initCompleted.current = true;
        setLoading(false);
        console.log('[AuthContext] Auth initialization complete');
      } catch (err) {
        // Handle network errors, offline mode, etc.
        console.error('[AuthContext] Failed to initialize auth:', err);
        isInitializing.current = false;
        initCompleted.current = true;
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] onAuthStateChange:', { event, hasSession: !!session });

      // Skip if we're still in the initial auth phase to prevent race condition
      if (isInitializing.current) {
        console.log('[AuthContext] Skipping onAuthStateChange - still initializing');
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userRole = await fetchOrCreateUserRole(session.user);
        setRole(userRole);
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, role, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
