import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

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
  const metadataRole = user.user_metadata?.role;

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
  const isInitializing = useRef(false);
  // Cache role lookups to avoid repeated database queries
  const roleCache = useRef<Map<string, UserRole | null>>(new Map());
  const { resetTimer } = useSessionTimeout();

  // Fetch role from public.users table, create record if missing
  const fetchOrCreateUserRole = async (currentUser: User): Promise<UserRole | null> => {
    const userId = currentUser.id;

    // Check cache first
    if (roleCache.current.has(userId)) {
      return roleCache.current.get(userId) || null;
    }

    try {
      // First, try to fetch from users table
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Database error - try fallback
        const metadataRole = getRoleFromMetadata(currentUser);
        return metadataRole;
      }

      // If we found a role in the database, cache and return it
      if (data?.role && isValidRole(data.role)) {
        roleCache.current.set(userId, data.role);
        return data.role;
      }

      // No record in users table - check user_metadata for role
      const metadataRole = getRoleFromMetadata(currentUser);

      if (metadataRole) {
        // User record will be created during onboarding
        roleCache.current.set(userId, metadataRole);
        return metadataRole;
      }

      roleCache.current.set(userId, null);
      return null;
    } catch (err) {
      // Last resort: try to get role from metadata even if DB operation failed
      const fallbackRole = getRoleFromMetadata(currentUser);
      roleCache.current.set(userId, fallbackRole);
      return fallbackRole;
    }
  };

  // Function to manually refresh the role (for retry functionality)
  const refreshRole = async () => {
    if (!user) {
      return;
    }

    try {
      const userRole = await fetchOrCreateUserRole(user);
      setRole(userRole);
    } catch (err) {
      // Silently handle error
    }
  };

  useEffect(() => {
    // Safety timeout to prevent infinite loading (e.g., PWA offline mode)
    const timeoutId = setTimeout(() => {
      if (!initCompleted.current) {
        isInitializing.current = false;
        initCompleted.current = true;
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    // Initialize auth session with error handling
    const initializeAuth = async () => {
      isInitializing.current = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          // Continue without session on error
          isInitializing.current = false;
          initCompleted.current = true;
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userRole = await fetchOrCreateUserRole(session.user);
          setRole(userRole);
        }

        isInitializing.current = false;
        initCompleted.current = true;
        setLoading(false);
      } catch (err) {
        // Handle network errors, offline mode, etc.
        isInitializing.current = false;
        initCompleted.current = true;
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip if we're still in the initial auth phase to prevent race condition
      if (isInitializing.current) {
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

  useEffect(() => {
    if (user) {
      resetTimer();
    }
  }, [user, resetTimer]);

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
