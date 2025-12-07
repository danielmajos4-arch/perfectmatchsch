/**
 * Salary Insights Service
 */

import { supabase } from './supabaseClient';
import type { SalaryData } from '@shared/schema';

export interface SalaryInsight {
  salaryMin: number;
  salaryMax: number;
  salaryMedian: number;
  sampleSize: number;
}

/**
 * Get salary insights for a teacher profile
 */
export async function getSalaryInsights(params: {
  subject: string;
  gradeLevel: string;
  location: string;
  yearsExperience: string;
}): Promise<SalaryInsight | null> {
  try {
    const { data, error } = await supabase.rpc('get_salary_insights', {
      p_subject: params.subject,
      p_grade_level: params.gradeLevel,
      p_location: params.location,
      p_years_experience: params.yearsExperience,
    });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return {
      salaryMin: data[0].salary_min,
      salaryMax: data[0].salary_max,
      salaryMedian: data[0].salary_median,
      sampleSize: data[0].sample_size,
    };
  } catch (error) {
    console.error('[Salary] Failed to get insights:', error);
    return null;
  }
}

/**
 * Get all salary data (for admin/analytics)
 */
export async function getAllSalaryData(): Promise<SalaryData[]> {
  const { data, error } = await supabase
    .from('salary_data')
    .select('*')
    .order('subject', { ascending: true });

  if (error) throw error;
  return data as SalaryData[];
}

/**
 * Update or insert salary data (admin function)
 */
export async function updateSalaryData(salaryData: Omit<SalaryData, 'id' | 'last_updated'>): Promise<void> {
  const { error } = await supabase
    .from('salary_data')
    .upsert({
      ...salaryData,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'subject,grade_level,location,years_experience',
    });

  if (error) throw error;
}
