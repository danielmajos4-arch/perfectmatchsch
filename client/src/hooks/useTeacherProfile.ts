import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Teacher } from '@shared/schema';

export function useTeacherProfile(userId: string | undefined) {
    return useQuery({
        queryKey: ['teacher-profile', userId],
        queryFn: async () => {
            if (!userId) return null;

            const { data, error } = await supabase
                .from('teachers')
                .select(`
                  id,
                  user_id,
                  full_name,
                  email,
                  phone,
                  location,
                  bio,
                  years_experience,
                  subjects,
                  grade_levels,
                  teaching_philosophy,
                  certifications,
                  archetype,
                  quiz_result,
                  profile_complete,
                  profile_photo_url,
                  resume_url,
                  portfolio_url,
                  created_at,
                  updated_at
                `)
                .eq('user_id', userId)
                .maybeSingle(); // Use maybeSingle() to handle not found

            if (error && error.code !== 'PGRST116') throw error;
            return data as Teacher | null;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
