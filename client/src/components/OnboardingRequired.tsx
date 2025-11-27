import { ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingRequiredProps {
  children: ReactNode;
}

export function OnboardingRequired({ children }: OnboardingRequiredProps) {
  const { user } = useAuth();
  const [rawLocation, navigate] = useLocation();
  const location = rawLocation || '';

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher-onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('profile_complete')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user && user.user_metadata?.role === 'teacher',
  });

  useEffect(() => {
    if (!user || user.user_metadata?.role !== 'teacher' || isLoading) return;

    if (!teacher || !teacher.profile_complete) {
      if (!location.startsWith('/onboarding/teacher')) {
        navigate('/onboarding/teacher');
      }
    }
  }, [teacher, isLoading, user, navigate, location]);

  if (user?.user_metadata?.role !== 'teacher') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Checking onboarding status...
      </div>
    );
  }

  if (!teacher?.profile_complete && !location.startsWith('/onboarding/teacher')) {
    return null;
  }

  return <>{children}</>;
}


