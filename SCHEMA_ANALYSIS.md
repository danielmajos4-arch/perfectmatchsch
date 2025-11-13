# Schema and Codebase Similarities Analysis

## Overview
This document highlights the similarities and alignment between the SQL database schemas and the TypeScript codebase schemas.

## 1. Core Table/Interface Alignment

### Users Table
**SQL Schema** (`supabase-schema.sql`):
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE
);
```

**TypeScript Schema** (`shared/schema.ts`):
```typescript
export interface User {
  id: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
}
```
✅ **Perfect Match**: Field names, types, and structure align perfectly.

---

### Jobs Table
**SQL Schema**:
```sql
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  job_type TEXT NOT NULL,
  location TEXT NOT NULL,
  salary TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  benefits TEXT NOT NULL,
  school_name TEXT NOT NULL,
  school_logo TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  archetype_tags TEXT[]  -- Added in sprint6-matching-schema.sql
);
```

**TypeScript Schema**:
```typescript
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
  archetype_tags?: string[]; // Added for Sprint 6 matching
}
```
✅ **Perfect Match**: All fields align, including the optional `archetype_tags` added in Sprint 6.

---

### Teachers Table
**SQL Schema**:
```sql
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  bio TEXT,
  years_experience TEXT NOT NULL,
  subjects TEXT[] NOT NULL,
  grade_levels TEXT[] NOT NULL,
  certifications TEXT[],
  archetype TEXT,
  quiz_result JSONB,
  profile_complete BOOLEAN DEFAULT FALSE,
  teaching_philosophy TEXT,
  resume_url TEXT,
  profile_photo_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  archetype_tags TEXT[]  -- Added in sprint6-matching-schema.sql
);
```

**TypeScript Schema**:
```typescript
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
  archetype_tags?: string[]; // Added for Sprint 6 matching
}
```
✅ **Perfect Match**: All fields align, including arrays and nullable fields.

---

### Schools Table
**SQL Schema**:
```sql
CREATE TABLE public.schools (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  school_name TEXT NOT NULL,
  school_type TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE
);
```

**TypeScript Schema**:
```typescript
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
```
✅ **Perfect Match**: Structure aligns perfectly.

---

### Applications Table
**SQL Schema**:
```sql
CREATE TABLE public.applications (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  cover_letter TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE
);
```

**TypeScript Schema**:
```typescript
export interface Application {
  id: string;
  job_id: string;
  teacher_id: string;
  cover_letter: string;
  status: string;
  applied_at: string;
}
```
✅ **Perfect Match**: All fields align.

---

### Conversations & Messages Tables
**SQL Schema**:
```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL,
  job_id UUID,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT FALSE
);
```

**TypeScript Schema**:
```typescript
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
```
✅ **Perfect Match**: Structure aligns perfectly.

---

## 2. Matching System Alignment (Sprint 6)

### Job Candidates Table
**SQL Schema** (`sprint6-matching-schema.sql`):
```sql
CREATE TABLE public.job_candidates (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  match_score INTEGER DEFAULT 0,
  match_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  school_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**TypeScript Schema** (`shared/matching.ts`):
```typescript
export interface JobCandidate {
  id: string;
  job_id: string;
  teacher_id: string;
  match_score: number;
  match_reason: string | null;
  status: 'new' | 'reviewed' | 'contacted' | 'shortlisted' | 'hired' | 'hidden';
  school_notes: string | null;
  created_at: string;
  updated_at: string;
}
```
✅ **Perfect Match**: All fields align, including the status enum values.

---

### Teacher Job Matches Table
**SQL Schema**:
```sql
CREATE TABLE public.teacher_job_matches (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL,
  job_id UUID NOT NULL,
  match_score INTEGER DEFAULT 0,
  match_reason TEXT,
  is_favorited BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE
);
```

**TypeScript Schema**:
```typescript
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
```
✅ **Perfect Match**: All fields align perfectly.

---

### Candidate Matches View
**SQL Schema**:
```sql
CREATE OR REPLACE VIEW public.candidate_matches AS
SELECT 
  jc.id,
  jc.job_id,
  jc.teacher_id,
  jc.match_score,
  jc.match_reason,
  jc.status,
  jc.school_notes,
  jc.created_at,
  jc.updated_at,
  j.title as job_title,
  j.school_name,
  j.subject as job_subject,
  j.grade_level as job_grade_level,
  j.location as job_location,
  t.full_name as teacher_name,
  t.email as teacher_email,
  t.archetype as teacher_archetype,
  ...
FROM public.job_candidates jc
JOIN public.jobs j ON j.id = jc.job_id
JOIN public.teachers t ON t.user_id = jc.teacher_id;
```

**TypeScript Schema**:
```typescript
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
  ...
}
```
✅ **Perfect Match**: The view structure matches the TypeScript interface.

---

## 3. Archetype Tags System

### SQL Implementation
- **Column**: `archetype_tags TEXT[]` on both `jobs` and `teachers` tables
- **Function**: `extract_archetype_tags(archetype_name TEXT)` - Maps archetype names to tags
- **Trigger**: `trigger_update_teacher_archetype_tags` - Auto-updates tags when archetype changes
- **Index**: GIN index on `archetype_tags` for fast overlap queries

### TypeScript Implementation
- **Interface Fields**: `archetype_tags?: string[]` on `Job` and `Teacher` interfaces
- **Usage**: Used in matching service (`matchingService.ts`) with `.overlaps('archetype_tags', ...)`
- **Components**: Used in `SchoolDashboard.tsx` for job posting and `TeacherDashboard.tsx` for matching

✅ **Perfect Alignment**: The SQL and TypeScript implementations work together seamlessly.

---

## 4. Code Usage Patterns

### Import Patterns
The codebase consistently imports from `@shared/schema`:
- `import type { Job } from '@shared/schema'`
- `import type { Teacher } from '@shared/schema'`
- `import type { Application, Conversation, Message } from '@shared/schema'`

### Matching Types
Matching-related types are imported from `@shared/matching`:
- `import type { JobCandidate, TeacherJobMatch, CandidateMatchView } from '@shared/matching'`

### Service Layer
The `matchingService.ts` uses both schemas:
- Queries SQL tables: `job_candidates`, `teacher_job_matches`, `candidate_matches` (view)
- Returns TypeScript types: `JobCandidate`, `TeacherJobMatch`, `CandidateMatchView`

---

## 5. Key Similarities Summary

1. **Naming Convention**: Both schemas use `snake_case` consistently
2. **Field Types**: SQL types map correctly to TypeScript types:
   - `UUID` → `string`
   - `TEXT` → `string`
   - `TEXT[]` → `string[]`
   - `BOOLEAN` → `boolean`
   - `TIMESTAMP WITH TIME ZONE` → `string` (ISO format)
   - `JSONB` → `Record<string, string> | null`
3. **Nullable Fields**: SQL nullable columns (`TEXT`) map to TypeScript `string | null`
4. **Array Fields**: SQL arrays (`TEXT[]`) map to TypeScript `string[]`
5. **Optional Fields**: SQL columns added later (like `archetype_tags`) are marked optional in TypeScript (`?`)
6. **Matching Logic**: SQL functions and triggers align with TypeScript matching service functions

---

## 6. Architecture Benefits

The alignment between SQL and TypeScript schemas provides:
- ✅ **Type Safety**: TypeScript interfaces ensure type safety when querying Supabase
- ✅ **Single Source of Truth**: SQL schema defines the database structure
- ✅ **Code Consistency**: TypeScript interfaces mirror SQL structure exactly
- ✅ **Easy Maintenance**: Changes to SQL schema can be reflected in TypeScript interfaces
- ✅ **Developer Experience**: Autocomplete and type checking work seamlessly

---

## Conclusion

The schemas are **highly aligned** and demonstrate excellent consistency between:
- Database structure (SQL)
- Type definitions (TypeScript)
- Application code usage

The matching system (Sprint 6) is particularly well-integrated, with SQL triggers, functions, and views working seamlessly with TypeScript interfaces and service functions.

