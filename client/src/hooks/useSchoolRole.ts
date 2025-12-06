import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface SchoolRole {
    role: 'admin' | 'hiring_manager' | 'reviewer' | 'observer' | null;
    canViewSalary: boolean;
    canMakeOffer: boolean;
    canComment: boolean;
    canRate: boolean;
}

/**
 * Hook to determine the current user's role and permissions for a specific job
 * @param jobId - The ID of the job to check permissions for
 * @returns SchoolRole object with role and permission flags
 */
export function useSchoolRole(jobId?: string): SchoolRole {
    const { user } = useAuth();

    const { data: teamMember } = useQuery({
        queryKey: ['hiring-team-member', jobId, user?.id],
        queryFn: async () => {
            if (!jobId || !user?.id) return null;

            const { data, error } = await supabase
                .from('hiring_team_members')
                .select('role')
                .eq('job_id', jobId)
                .eq('user_id', user.id)
                .single();

            if (error) {
                // User is not a team member, check if they're the job owner (school admin)
                const { data: job } = await supabase
                    .from('jobs')
                    .select('school_id')
                    .eq('id', jobId)
                    .single();

                if (job && job.school_id === user.id) {
                    return { role: 'admin' };
                }

                return null;
            }

            return data;
        },
        enabled: !!jobId && !!user?.id,
    });

    // Determine role
    const role = teamMember?.role || null;

    // Determine permissions based on role
    const canViewSalary = role === 'admin' || role === 'hiring_manager';
    const canMakeOffer = role === 'admin' || role === 'hiring_manager';
    const canComment = role !== null; // All team members can comment
    const canRate = role !== null; // All team members can rate

    return {
        role,
        canViewSalary,
        canMakeOffer,
        canComment,
        canRate,
    };
}
