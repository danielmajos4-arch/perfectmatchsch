import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { School } from '@shared/schema';

export function useSchoolProfile(userId: string | undefined) {
    return useQuery({
        queryKey: ['school-profile', userId],
        queryFn: async () => {
            if (!userId) return null;
            const { data, error } = await supabase
                .from('schools')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;
            return data as School | null;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
