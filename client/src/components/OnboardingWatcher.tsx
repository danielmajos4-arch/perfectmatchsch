import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function OnboardingWatcher() {
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
  }, [user, teacher, isLoading, location, navigate]);

  return null;
}


