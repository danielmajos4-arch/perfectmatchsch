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
  // First, try to find existing conversation
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)
    .maybeSingle();

  if (findError && findError.code !== 'PGRST116') {
    throw findError;
  }

  if (existing) {
    // Update job_id if provided and not set
    if (jobId && !existing.job_id) {
      await supabase
        .from('conversations')
        .update({ job_id: jobId })
        .eq('id', existing.id);
    }
    return { conversation: existing, isNew: false };
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

