/**
 * Job Matching Service
 * 
 * Finds teachers that match a newly posted job
 */

import { supabase } from './supabaseClient';

export interface MatchingTeacher {
  user_id: string;
  teacher_id: string;
  full_name: string;
  match_score: number;
}

/**
 * Find teachers that match a job posting
 */
export async function findMatchingTeachers(job: {
  id: string;
  subject: string;
  grade_level: string;
  location: string;
  archetype_tags?: string[];
}): Promise<MatchingTeacher[]> {
  try {
    // Build query to find matching teachers with timeout
    const queryTimeout = 8000; // 8 seconds
    const queryController = new AbortController();
    const queryTimeoutId = setTimeout(() => queryController.abort(), queryTimeout);
    
    let query = supabase
      .from('teachers')
      .select('user_id, id, full_name, subjects, grade_levels, location, archetype, profile_complete')
      .eq('profile_complete', true)
      .abortSignal(queryController.signal);

    const queryPromise = query;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Teacher query timed out')), queryTimeout);
    });

    let teachers, error;
    try {
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      clearTimeout(queryTimeoutId);
      teachers = result.data;
      error = result.error;
    } catch (queryError: any) {
      clearTimeout(queryTimeoutId);
      if (queryError.name === 'AbortError' || queryError.message?.includes('timed out')) {
        console.warn('findMatchingTeachers: Query timed out, returning empty array');
        return [];
      }
      throw queryError;
    }

    if (error) {
      console.error('Error fetching teachers for matching:', error);
      return [];
    }

    if (!teachers || teachers.length === 0) {
      return [];
    }

    // Filter and score teachers
    const matchingTeachers: MatchingTeacher[] = [];

    for (const teacher of teachers) {
      let matchScore = 0;
      let matches = true;

      // Subject match (exact or contains)
      if (job.subject && teacher.subjects) {
        const subjectMatch = Array.isArray(teacher.subjects)
          ? teacher.subjects.includes(job.subject)
          : false;
        if (subjectMatch) {
          matchScore += 40;
        } else {
          matches = false; // Subject is required
        }
      }

      // Grade level match
      if (job.grade_level && teacher.grade_levels) {
        const gradeMatch = Array.isArray(teacher.grade_levels)
          ? teacher.grade_levels.includes(job.grade_level) || job.grade_level === 'All Grades'
          : false;
        if (gradeMatch) {
          matchScore += 30;
        } else if (job.grade_level !== 'All Grades') {
          matches = false; // Grade level is required (unless job is "All Grades")
        }
      }

      // Location match (fuzzy - same city/state)
      if (job.location && teacher.location) {
        const jobLocation = job.location.toLowerCase();
        const teacherLocation = teacher.location.toLowerCase();
        
        // Extract city/state from location strings
        const jobParts = jobLocation.split(',').map(s => s.trim());
        const teacherParts = teacherLocation.split(',').map(s => s.trim());
        
        // Check if any part matches (city or state)
        const locationMatch = jobParts.some(jp => 
          teacherParts.some(tp => tp.includes(jp) || jp.includes(tp))
        );
        
        if (locationMatch) {
          matchScore += 20;
        } else {
          // Location is nice to have but not required
          matchScore += 5;
        }
      }

      // Archetype match (if job specifies archetype_tags)
      if (job.archetype_tags && job.archetype_tags.length > 0 && teacher.archetype) {
        const archetypeMatch = job.archetype_tags.includes(teacher.archetype);
        if (archetypeMatch) {
          matchScore += 10;
        }
      }

      // Only include if subject and grade level match (minimum requirements)
      if (matches && matchScore >= 40) {
        matchingTeachers.push({
          user_id: teacher.user_id,
          teacher_id: teacher.id,
          full_name: teacher.full_name,
          match_score: Math.min(100, matchScore), // Cap at 100%
        });
      }
    }

    // Sort by match score (highest first) and limit to top 50
    return matchingTeachers
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 50);
  } catch (error) {
    console.error('Error in findMatchingTeachers:', error);
    return [];
  }
}

