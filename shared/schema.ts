import { z } from "zod";

// TypeScript interfaces matching Supabase snake_case schema
export interface User {
  id: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
}

export interface Job {
  id: string;
  school_id: string;
  title: string;
  department: string;
  subject: string;
  grade_level: string;
  job_type: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  benefits: string;
  school_name: string;
  school_logo: string | null;
  posted_at: string;
  is_active: boolean;
  archetype_tags?: string[]; // Added for Sprint 6 matching
  application_requirements?: Record<string, boolean>; // Added for configurable application fields
}

export interface Application {
  id: string;
  job_id: string;
  teacher_id: string;
  cover_letter: string;
  status: string;
  applied_at: string;
  desired_salary?: string; // Added for teacher's desired salary
}

export interface Conversation {
  id: string;
  teacher_id: string;
  school_id: string;
  job_id: string | null;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  is_read: boolean;
}

// Insert types (omit auto-generated fields)
export interface InsertUser {
  email: string;
  role: string;
  full_name: string;
}

export interface InsertJob {
  school_id: string;
  title: string;
  department: string;
  subject: string;
  grade_level: string;
  job_type: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  benefits: string;
  school_name: string;
  school_logo?: string | null;
  archetype_tags?: string[]; // Added for Sprint 6 matching
  application_requirements?: Record<string, boolean>; // Added for configurable application fields
}

export interface InsertApplication {
  job_id: string;
  teacher_id: string;
  cover_letter: string;
  desired_salary?: string; // Added for teacher's desired salary
}

export interface InsertConversation {
  teacher_id: string;
  school_id: string;
  job_id?: string | null;
}

export interface InsertMessage {
  conversation_id: string;
  sender_id: string;
  content: string;
}

// Teacher profile interfaces
export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  bio: string | null;
  years_experience: string;
  subjects: string[];
  grade_levels: string[];
  certifications: string[] | null;
  archetype: string | null;
  archetype_tags?: string[]; // Added for Sprint 6 matching
  quiz_result: Record<string, string> | null;
  profile_complete: boolean;
  teaching_philosophy: string | null;
  resume_url: string | null;
  profile_photo_url: string | null;
  portfolio_url: string | null;
  created_at: string;
}

export interface InsertTeacher {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  bio?: string | null;
  years_experience: string;
  subjects: string[];
  grade_levels: string[];
  certifications?: string[] | null;
  teaching_philosophy?: string | null;
  profile_complete?: boolean;
  profile_photo_url?: string | null;
  resume_url?: string | null;
  portfolio_url?: string | null;
}

// School profile interfaces
export interface School {
  id: string;
  user_id: string;
  school_name: string;
  school_type: string;
  location: string;
  description: string;
  website: string | null;
  logo_url: string | null;
  profile_complete: boolean;
  created_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  verification_notes?: string | null;
}

export interface InsertSchool {
  user_id: string;
  school_name: string;
  school_type: string;
  location: string;
  description: string;
  website?: string | null;
  logo_url?: string | null;
  profile_complete?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  verification_notes?: string | null;
}

// Quiz interfaces
export interface QuizQuestion {
  question_id: string;
  question: string;
  question_order: number;
}

export interface QuizOption {
  id: string;
  question_id: string;
  text: string;
  scores: Record<string, number>;
}

export interface QuizWithOptions {
  question_id: string;
  question: string;
  question_order: number;
  options: QuizOption[];
}

// User Archetype interfaces
export interface UserArchetype {
  id: string;
  user_id: string | null;
  archetype_name: string;
  archetype_description: string;
  strengths: string[];
  growth_areas: string[];
  ideal_environments: string[];
  teaching_style: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  search_query: string | null;
  filters: Record<string, any>;
  is_active: boolean;
  notify_on_match: boolean;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  search_query: string | null;
  filters: Record<string, any>;
  result_count: number;
  searched_at: string;
}

// Email Template interfaces
export interface EmailTemplate {
  id: string;
  school_id: string;
  name: string;
  subject: string;
  body: string;
  category: 'rejection' | 'interview' | 'offer' | 'general' | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsertEmailTemplate {
  school_id: string;
  name: string;
  subject: string;
  body: string;
  category?: 'rejection' | 'interview' | 'offer' | 'general' | null;
  is_default?: boolean;
}

// Export matching types
export * from './matching';

// ATS Interfaces

export interface PipelineStage {
  id: string;
  job_id: string | null; // null means default for school
  school_id: string;
  name: string;
  order_index: number;
  type: 'system' | 'custom';
  created_at: string;
}

export interface InsertPipelineStage {
  job_id?: string | null;
  school_id: string;
  name: string;
  order_index: number;
  type: 'system' | 'custom';
}

export interface HiringTeamMember {
  id: string;
  job_id: string;
  user_id: string;
  role: 'hiring_manager' | 'reviewer' | 'observer';
  created_at: string;
}

export interface InsertHiringTeamMember {
  job_id: string;
  user_id: string;
  role: 'hiring_manager' | 'reviewer' | 'observer';
}

export interface ApplicationComment {
  id: string;
  application_id: string;
  user_id: string;
  content: string;
  visibility: 'team' | 'private' | 'admin_only';
  created_at: string;
}

export interface InsertApplicationComment {
  application_id: string;
  user_id: string;
  content: string;
  visibility?: 'team' | 'private' | 'admin_only';
}

export interface ApplicationRating {
  id: string;
  application_id: string;
  user_id: string;
  category: 'skills' | 'culture' | 'overall';
  score: number;
  created_at: string;
}

export interface InsertApplicationRating {
  application_id: string;
  user_id: string;
  category: 'skills' | 'culture' | 'overall';
  score: number;
}

export interface Offer {
  id: string;
  application_id: string;
  created_by: string;
  status: 'draft' | 'approval_pending' | 'extended' | 'accepted' | 'declined';
  salary_amount: number | null;
  start_date: string | null;
  benefits_summary: string | null;
  additional_terms: string | null;
  expiration_date: string | null;
  offer_letter_url: string | null;
  created_at: string;
  updated_at: string;
}

export type InsertOffer = Omit<Offer, 'id' | 'created_at' | 'updated_at'>;
