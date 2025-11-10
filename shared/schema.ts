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
