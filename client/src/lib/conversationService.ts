// Service for managing conversations
import { supabase } from './supabaseClient';
import type { Conversation, InsertConversation } from '@shared/schema';

/**
 * Get or create a conversation between a teacher and school
 */
export async function getOrCreateConversation(
  teacherId: string,
  schoolId: string,
  jobId?: string
): Promise<{ conversation: Conversation; isNew: boolean }> {
  // Prefer matching on job_id when available so each job can have its own thread
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId);

  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  const { data: existingWithJob, error: findError } = await query.maybeSingle();
  if (findError && findError.code !== 'PGRST116') {
    throw findError;
  }

  if (existingWithJob) {
    return { conversation: existingWithJob, isNew: false };
  }

  // Fallback: reuse any conversation between the two parties (no job filter)
  const { data: existingWithoutJob, error: fallbackError } = await supabase
    .from('conversations')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)
    .maybeSingle();

  if (fallbackError && fallbackError.code !== 'PGRST116') {
    throw fallbackError;
  }

  if (existingWithoutJob) {
    if (jobId && !existingWithoutJob.job_id) {
      const { data: updated } = await supabase
        .from('conversations')
        .update({ job_id: jobId })
        .eq('id', existingWithoutJob.id)
        .select()
        .single();

      if (updated) {
        return { conversation: updated, isNew: false };
      }
    }
    return { conversation: existingWithoutJob, isNew: false };
  }

  // Create new conversation
  const insertData: InsertConversation = {
    teacher_id: teacherId,
    school_id: schoolId,
    job_id: jobId || null,
  };

  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert(insertData)
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  return { conversation: newConversation, isNew: true };
}

/**
 * Get conversation by teacher and school (and optionally job)
 */
export async function getConversation(
  teacherId: string,
  schoolId: string,
  jobId?: string
): Promise<Conversation | null> {
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId);

  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

async function getProfileIdForRole(userId: string, role: 'teacher' | 'school') {
  if (role === 'teacher') {
    const { data, error } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw error;
    }
    return data?.id || null;
  }

  const { data, error } = await supabase
    .from('schools')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }
  return data?.id || null;
}

export async function getConversations(userId: string, role: 'teacher' | 'school') {
  const profileId = await getProfileIdForRole(userId, role);

  if (!profileId) {
    throw new Error('Profile not found');
  }

  let query = supabase
    .from('conversations')
    .select(`
      id,
      teacher_id,
      school_id,
      job_id,
      last_message_at,
      created_at,
      messages(*),
      teacher:teachers!teacher_id(
        id,
        user_id,
        full_name,
        profile_photo_url
      ),
      school:schools!school_id(
        id,
        user_id,
        school_name,
        logo_url
      ),
      job:jobs(
        id,
        title,
        school_name
      )
    `)
    .order('last_message_at', { ascending: false });

  if (role === 'teacher') {
    query = query.eq('teacher_id', profileId);
  } else {
    query = query.eq('school_id', profileId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

