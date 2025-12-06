import { supabase } from './supabaseClient';
import type { Offer, InsertOffer } from '@shared/schema';

/**
 * Create a new job offer
 */
export async function createOffer(data: Omit<InsertOffer, 'id' | 'created_at' | 'updated_at'>) {
    const { data: offer, error } = await supabase
        .from('offers')
        .insert(data)
        .select()
        .single();

    if (error) throw error;
    return offer as Offer;
}

/**
 * Update an existing offer
 */
export async function updateOffer(id: string, data: Partial<InsertOffer>) {
    const { data: offer, error } = await supabase
        .from('offers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return offer as Offer;
}

/**
 * Get all offers for a specific job
 */
export async function getOffersByJob(jobId: string) {
    const { data, error } = await supabase
        .from('offers')
        .select(`
      *,
      application:applications(
        id,
        teacher:teachers(
          id,
          full_name,
          email
        )
      )
    `)
        .eq('application.job_id', jobId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any[];
}

/**
 * Get all offers for a school (across all jobs)
 */
export async function getOffersBySchool(schoolId: string) {
    const { data, error } = await supabase
        .from('offers')
        .select(`
      *,
      application:applications(
        id,
        job:jobs(
          id,
          title,
          school_id
        ),
        teacher:teachers(
          id,
          full_name,
          email
        )
      )
    `)
        .eq('application.job.school_id', schoolId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any[];
}

/**
 * Get offer by application ID
 */
export async function getOfferByApplication(applicationId: string) {
    const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data as Offer | null;
}

/**
 * Respond to an offer (candidate side)
 */
export async function respondToOffer(offerId: string, status: 'accepted' | 'declined') {
    const { data, error } = await supabase
        .from('offers')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', offerId)
        .select()
        .single();

    if (error) throw error;
    return data as Offer;
}

/**
 * Check if an offer is expired
 */
export function isOfferExpired(offer: Offer): boolean {
    if (!offer.expiration_date) return false;
    return new Date(offer.expiration_date) < new Date();
}

/**
 * Get offer status display info
 */
export function getOfferStatusInfo(offer: Offer) {
    const expired = isOfferExpired(offer);

    if (expired && offer.status === 'extended') {
        return {
            status: 'expired',
            label: 'Expired',
            variant: 'destructive' as const,
        };
    }

    const statusMap = {
        draft: { label: 'Draft', variant: 'secondary' as const },
        extended: { label: 'Pending', variant: 'default' as const },
        accepted: { label: 'Accepted', variant: 'success' as const },
        declined: { label: 'Declined', variant: 'destructive' as const },
    };

    return {
        status: offer.status,
        ...statusMap[offer.status as keyof typeof statusMap],
    };
}
