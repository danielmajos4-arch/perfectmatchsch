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
  console.log('[getOrCreateConversation] Starting with teacherId:', teacherId, 'schoolId:', schoolId, 'jobId:', jobId);

  // Prefer matching on job_id when available so each job can have its own thread
  // Query 1: Check for existing conversation with job_id (with timeout)
  const query1Controller = new AbortController();
  const query1TimeoutId = setTimeout(() => query1Controller.abort(), 5000);
  
  let existingWithJob = null;
  let findError = null;
  
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId);

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const result = await query.maybeSingle().abortSignal(query1Controller.signal);
    existingWithJob = result.data;
    findError = result.error;
    clearTimeout(query1TimeoutId);
    console.log('[getOrCreateConversation] Query 1 (with job_id) completed:', existingWithJob ? 'found' : 'not found');
  } catch (err: any) {
    clearTimeout(query1TimeoutId);
    if (err.name === 'AbortError') {
      console.error('[getOrCreateConversation] Query 1 timeout - checking for existing conversation with job_id');
      throw new Error('Database query timed out. Please try again.');
    }
    findError = err;
  }

  if (findError && findError.code !== 'PGRST116') {
    console.error('[getOrCreateConversation] Query 1 error:', findError);
    throw findError;
  }

  if (existingWithJob) {
    console.log('[getOrCreateConversation] Returning existing conversation with job_id');
    return { conversation: existingWithJob, isNew: false };
  }

  // Fallback: reuse any conversation between the two parties (no job filter)
  // Query 2: Check for existing conversation without job filter (with timeout)
  const query2Controller = new AbortController();
  const query2TimeoutId = setTimeout(() => query2Controller.abort(), 5000);
  
  let existingWithoutJob = null;
  let fallbackError = null;
  
  try {
    const result = await supabase
      .from('conversations')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .maybeSingle()
      .abortSignal(query2Controller.signal);
    existingWithoutJob = result.data;
    fallbackError = result.error;
    clearTimeout(query2TimeoutId);
    console.log('[getOrCreateConversation] Query 2 (without job_id) completed:', existingWithoutJob ? 'found' : 'not found');
  } catch (err: any) {
    clearTimeout(query2TimeoutId);
    if (err.name === 'AbortError') {
      console.error('[getOrCreateConversation] Query 2 timeout - checking for existing conversation without job_id');
      throw new Error('Database query timed out. Please try again.');
    }
    fallbackError = err;
  }

  if (fallbackError && fallbackError.code !== 'PGRST116') {
    console.error('[getOrCreateConversation] Query 2 error:', fallbackError);
    throw fallbackError;
  }

  if (existingWithoutJob) {
    // Update existing conversation if job_id is provided but not set
    if (jobId && !existingWithoutJob.job_id) {
      // Query 3: Update existing conversation (with timeout)
      const updateController = new AbortController();
      const updateTimeoutId = setTimeout(() => updateController.abort(), 5000);
      
      try {
        const result = await supabase
          .from('conversations')
          .update({ job_id: jobId })
          .eq('id', existingWithoutJob.id)
          .select()
          .single()
          .abortSignal(updateController.signal);
        clearTimeout(updateTimeoutId);
        
        if (result.data) {
          console.log('[getOrCreateConversation] Updated existing conversation with job_id');
          return { conversation: result.data, isNew: false };
        }
      } catch (err: any) {
        clearTimeout(updateTimeoutId);
        if (err.name === 'AbortError') {
          console.error('[getOrCreateConversation] Update timeout - continuing with existing conversation');
        } else {
          console.error('[getOrCreateConversation] Update error:', err);
        }
        // Continue with existing conversation even if update fails
      }
    }
    console.log('[getOrCreateConversation] Returning existing conversation without job_id');
    return { conversation: existingWithoutJob, isNew: false };
  }

  // Create new conversation
  // Query 4: Insert new conversation (with timeout)
  const insertController = new AbortController();
  const insertTimeoutId = setTimeout(() => insertController.abort(), 8000);
  
  const insertData: InsertConversation = {
    teacher_id: teacherId,
    school_id: schoolId,
    job_id: jobId || null,
  };

  try {
    const result = await supabase
      .from('conversations')
      .insert(insertData)
      .select()
      .single()
      .abortSignal(insertController.signal);
    clearTimeout(insertTimeoutId);
    
    if (result.error) {
      console.error('[getOrCreateConversation] Insert error:', result.error);
      throw result.error;
    }
    
    console.log('[getOrCreateConversation] Created new conversation');
    return { conversation: result.data, isNew: true };
  } catch (err: any) {
    clearTimeout(insertTimeoutId);
    if (err.name === 'AbortError') {
      console.error('[getOrCreateConversation] Insert timeout - conversation creation timed out');
      throw new Error('Creating conversation took too long. Please try again.');
    }
    console.error('[getOrCreateConversation] Insert error:', err);
    throw err;
  }
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

