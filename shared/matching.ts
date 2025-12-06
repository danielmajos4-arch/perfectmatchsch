import { Job } from './schema';

export interface JobCandidate {
  id: string;
  job_id: string;
  teacher_id: string;
  match_score: number;
  match_reason: string | null;
  status: string; // Changed from union to string for dynamic pipeline stages
  school_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherJobMatch {
  id: string;
  teacher_id: string;
  job_id: string;
  match_score: number;
  match_reason: string | null;
  is_favorited: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface CandidateMatchView {
  id: string;
  job_id: string;
  teacher_id: string;
  match_score: number;
  match_reason: string | null;
  status: string;
  school_notes: string | null;
  created_at: string;
  updated_at: string;
  job_title: string;
  school_name: string;
  job_subject: string;
  job_grade_level: string;
  job_location: string;
  teacher_name: string;
  teacher_email: string;
  teacher_archetype: string | null;
  teacher_subjects: string[];
  teacher_grade_levels: string[];
  years_experience: string;
  teacher_location: string;
  profile_photo_url: string | null;
  resume_url: string | null;
  portfolio_url: string | null;
  application_id?: string; // Optional: ID of the application if this candidate came from an application
}

export interface JobWithMatches extends Job {
  candidates?: CandidateMatchView[];
  candidate_count?: number;
}

export interface TeacherWithMatches {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  archetype: string | null;
  archetype_tags: string[];
  subjects: string[];
  grade_levels: string[];
  location: string;
  profile_photo_url: string | null;
  resume_url: string | null;
  portfolio_url: string | null;
  matches?: TeacherJobMatch[];
}

