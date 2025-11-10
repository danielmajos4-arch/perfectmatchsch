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
}

export interface Application {
  id: string;
  job_id: string;
  teacher_id: string;
  cover_letter: string;
  status: string;
  applied_at: string;
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
}

export interface InsertApplication {
  job_id: string;
  teacher_id: string;
  cover_letter: string;
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
