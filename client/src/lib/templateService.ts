/**
 * Application Template Service
 */

import { supabase } from './supabaseClient';
import type { ApplicationTemplate } from '@shared/schema';

/**
 * Get all application templates
 */
export async function getApplicationTemplates(filters?: {
  archetype?: string;
  subject?: string;
}): Promise<ApplicationTemplate[]> {
  let query = supabase
    .from('application_templates')
    .select('*')
    .order('usage_count', { ascending: false });

  if (filters?.archetype) {
    query = query.eq('archetype', filters.archetype);
  }

  if (filters?.subject) {
    query = query.eq('subject', filters.subject);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ApplicationTemplate[];
}

/**
 * Get default template for archetype
 */
export async function getDefaultTemplate(archetype?: string): Promise<ApplicationTemplate | null> {
  let query = supabase
    .from('application_templates')
    .select('*')
    .eq('is_default', true);

  if (archetype) {
    query = query.eq('archetype', archetype);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data?.[0] as ApplicationTemplate) || null;
}

/**
 * Personalize template with user data
 */
export function personalizeTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let personalized = template;
  
  // Replace {{variable}} with actual values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    personalized = personalized.replace(regex, value);
  }

  return personalized;
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_usage', {
    p_template_id: templateId,
  });

  if (error) {
    // If function doesn't exist, update manually
    const { data } = await supabase
      .from('application_templates')
      .select('usage_count')
      .eq('id', templateId)
      .single();

    if (data) {
      await supabase
        .from('application_templates')
        .update({ usage_count: (data.usage_count || 0) + 1 })
        .eq('id', templateId);
    }
  }
}
