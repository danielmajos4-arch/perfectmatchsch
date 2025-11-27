# PerfectMatchSchools - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Data Access Patterns](#data-access-patterns)
6. [Authentication & Authorization](#authentication--authorization)
7. [Real-time Features](#real-time-features)
8. [File Uploads](#file-uploads)
9. [Deployment](#deployment)
10. [Development Workflow](#development-workflow)
11. [Code Standards](#code-standards)

---

## Architecture Overview

### Architecture Pattern
**Frontend-First with Direct Database Access**

PerfectMatchSchools uses a modern frontend-first architecture where:
- The React frontend communicates directly with Supabase
- Express server is minimal and primarily serves the built React app
- No traditional REST API layer
- Row Level Security (RLS) handles data access control
- Real-time features use Supabase Realtime subscriptions

### Data Flow
```
User Action → React Component → TanStack Query → Supabase Client → Supabase DB
                ↓
         Query Cache Update → UI Re-render
```

### Key Design Decisions
1. **Direct Database Access**: Reduces API layer complexity, leverages Supabase RLS
2. **TanStack Query**: Handles caching, refetching, and loading states
3. **TypeScript**: Shared types between frontend and database
4. **Mobile-First**: Responsive design with mobile navigation
5. **Component-Based**: Reusable UI components with Shadcn UI

---

## Tech Stack

### Frontend
- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Wouter**: Lightweight routing
- **TanStack Query**: Server state management
- **Shadcn UI**: Component library
- **TailwindCSS**: Styling
- **Lucide React**: Icons
- **date-fns**: Date formatting

### Backend
- **Express.js**: Minimal server (serves frontend)
- **Supabase**: Database, Auth, Storage, Realtime
- **PostgreSQL**: Database (via Supabase)

### Development Tools
- **TypeScript**: Type checking
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixes

---

## Project Structure

```
PerfectMatchSchools-1/
├── client/                    # Frontend React application
│   ├── public/               # Static assets
│   │   ├── manifest.json    # PWA manifest
│   │   ├── service-worker.js # Service worker
│   │   └── icons/           # App icons
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # Shadcn UI components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── AuthenticatedLayout.tsx
│   │   │   ├── PublicLayout.tsx
│   │   │   ├── NotificationCenter.tsx
│   │   │   └── ...
│   │   ├── pages/          # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── SchoolDashboard.tsx
│   │   │   ├── Jobs.tsx
│   │   │   ├── Messages.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── Settings.tsx
│   │   ├── contexts/        # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/          # Custom hooks
│   │   │   ├── useAchievements.ts
│   │   │   └── use-toast.ts
│   │   ├── lib/            # Utilities and services
│   │   │   ├── supabaseClient.ts
│   │   │   ├── queryClient.ts
│   │   │   ├── achievementService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── matchingService.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx         # Main app component
│   │   └── index.tsx       # Entry point
│   ├── index.html
│   └── vite.config.ts
├── server/                  # Express server
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # Route definitions
│   └── storage.ts         # Storage interface
├── shared/                 # Shared code
│   ├── schema.ts          # TypeScript types
│   └── matching.ts        # Matching types
├── docs/                   # Documentation
├── .env                    # Environment variables (not in git)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Database Schema

### Core Tables

#### `users`
Extends Supabase `auth.users` with role information.
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'school')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `teachers`
Detailed teacher profiles.
```sql
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
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
  archetype_tags TEXT[],  -- For matching
  quiz_result JSONB,
  profile_complete BOOLEAN DEFAULT FALSE,
  teaching_philosophy TEXT,
  resume_url TEXT,
  profile_photo_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `schools`
School profiles.
```sql
CREATE TABLE public.schools (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  school_name TEXT NOT NULL,
  school_type TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `jobs`
Job postings.
```sql
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
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
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  archetype_tags TEXT[]  -- For matching
);
```

#### `applications`
Job applications.
```sql
CREATE TABLE public.applications (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  teacher_id UUID REFERENCES users(id),
  cover_letter TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected', 'interview')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, teacher_id)
);
```

#### `conversations`
Message conversations.
```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES users(id),
  school_id UUID REFERENCES users(id),
  job_id UUID REFERENCES jobs(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, school_id)
);
```

#### `messages`
Individual messages.
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);
```

### Supporting Tables

- `in_app_notifications`: In-app notifications
- `email_preferences`: Email notification preferences
- `teacher_job_matches`: Matching system data
- `job_candidates`: Candidate matching
- `saved_searches`: Saved search queries
- `search_history`: Search history
- `user_archetypes`: Archetype definitions
- `archetype_quiz_questions`: Quiz questions
- `archetype_quiz_options`: Quiz answer options
- `user_achievements`: Achievement tracking

### Relationships

```
users (1) ──< (1) teachers
users (1) ──< (1) schools
users (1) ──< (*) jobs (school_id)
jobs (1) ──< (*) applications
users (1) ──< (*) applications (teacher_id)
users (1) ──< (*) conversations (teacher_id)
users (1) ──< (*) conversations (school_id)
conversations (1) ──< (*) messages
```

---

## Data Access Patterns

### Using TanStack Query

All data fetching uses TanStack Query for caching and state management.

#### Example: Fetching Jobs
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const { data: jobs, isLoading } = useQuery({
  queryKey: ['/api/jobs'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('posted_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
});
```

#### Example: Mutations
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const createJobMutation = useMutation({
  mutationFn: async (jobData: InsertJob) => {
    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
  },
});
```

### Query Key Patterns

Use consistent query keys:
- `['/api/jobs']` - All jobs
- `['/api/jobs', jobId]` - Single job
- `['/api/jobs/school', schoolId]` - School's jobs
- `['/api/applications', userId]` - User's applications
- `['/api/conversations', userId]` - User's conversations

---

## Authentication & Authorization

### Authentication Flow

1. User registers/logs in via Supabase Auth
2. `AuthContext` manages auth state
3. Protected routes check authentication
4. Role-based routes check user role

### AuthContext

```typescript
// client/src/contexts/AuthContext.tsx
const { user, role, loading } = useAuth();
```

### Protected Routes

```typescript
// client/src/components/ProtectedRoute.tsx
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

### Role-Based Routes

```typescript
// client/src/components/RoleProtectedRoute.tsx
<RoleProtectedRoute allowedRole="teacher">
  <TeacherDashboard />
</RoleProtectedRoute>
```

### Row Level Security (RLS)

RLS policies in Supabase enforce data access:

- Users can only see their own data
- Schools can only see applications for their jobs
- Teachers can only see their own applications
- Messages only visible to conversation participants

---

## Real-time Features

### Supabase Realtime Subscriptions

#### Notifications
```typescript
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'in_app_notifications',
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      // Handle new notification
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

#### Messages
```typescript
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  )
  .subscribe();
```

---

## File Uploads

### Supabase Storage

Files are uploaded to Supabase Storage buckets:

#### Upload Resume
```typescript
const file = event.target.files[0];
const fileExt = file.name.split('.').pop();
const fileName = `${userId}/${Date.now()}.${fileExt}`;

const { data, error } = await supabase.storage
  .from('resumes')
  .upload(fileName, file);

if (error) throw error;

const { data: { publicUrl } } = supabase.storage
  .from('resumes')
  .getPublicUrl(fileName);
```

### Storage Buckets

- `resumes`: Teacher resumes/CVs
- `profile-photos`: User profile photos
- `school-logos`: School logos
- `portfolios`: Portfolio files

---

## Deployment

### Environment Variables

Required environment variables:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RESEND_API_KEY=your_resend_api_key (optional, for emails)
VITE_RESEND_FROM_EMAIL=noreply@perfectmatchschools.com (optional)
```

### Build Process

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

### Database Setup

1. Run `supabase-schema-fixed.sql` in Supabase SQL Editor
2. Run `sprint6-matching-schema.sql` (if using matching)
3. Run any additional schema files in order
4. Verify RLS policies are enabled
5. Verify triggers are created

### Production Checklist

- [ ] Environment variables set
- [ ] Database schema deployed
- [ ] RLS policies enabled
- [ ] Storage buckets created
- [ ] CORS configured in Supabase
- [ ] Build completes without errors
- [ ] Production server starts
- [ ] Health checks pass

---

## Development Workflow

### Getting Started

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd PerfectMatchSchools-1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Set up database**
   - Run `supabase-schema-fixed.sql` in Supabase SQL Editor

5. **Start development server**
   ```bash
   npm run dev
   ```

### Code Organization

#### Components
- **UI Components**: Reusable Shadcn components in `components/ui/`
- **Feature Components**: Feature-specific components in `components/`
- **Layout Components**: Layout wrappers in `components/`

#### Pages
- One file per route
- Use `AuthenticatedLayout` or `PublicLayout` as wrapper
- Keep pages focused on composition

#### Services
- Database queries in service files (`lib/*Service.ts`)
- Reusable business logic
- Error handling

#### Hooks
- Custom React hooks for reusable logic
- Data fetching hooks use TanStack Query

### Code Standards

#### TypeScript
- Use TypeScript for all files
- Define types in `shared/schema.ts`
- Use interfaces for component props
- Avoid `any` type

#### Naming Conventions
- **Components**: PascalCase (`JobCard.tsx`)
- **Files**: Match component name
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (`Job`, `InsertJob`)

#### File Structure
- One component per file
- Co-locate related files
- Use index files for exports (if needed)

#### Component Structure
```typescript
// 1. Imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Types/Interfaces
interface ComponentProps {
  // ...
}

// 3. Component
export function Component({ prop }: ComponentProps) {
  // 4. Hooks
  const [state, setState] = useState();
  
  // 5. Queries/Mutations
  const { data } = useQuery({...});
  
  // 6. Handlers
  const handleClick = () => {...};
  
  // 7. Render
  return <div>...</div>;
}
```

---

## API Reference

### Data Access (Supabase Client)

Since the app uses direct Supabase access, there's no traditional REST API. Data access patterns:

#### Select (Read)
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value')
  .order('created_at', { ascending: false });
```

#### Insert (Create)
```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column: 'value' }])
  .select()
  .single();
```

#### Update
```typescript
const { data, error } = await supabase
  .from('table_name')
  .update({ column: 'new_value' })
  .eq('id', id)
  .select()
  .single();
```

#### Delete
```typescript
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);
```

### RPC Functions

Some operations use Supabase RPC functions:
```typescript
const { data, error } = await supabase.rpc('function_name', {
  param1: value1,
  param2: value2,
});
```

---

## Error Handling

### Query Errors
```typescript
const { data, error, isError } = useQuery({
  queryKey: ['key'],
  queryFn: async () => {
    const { data, error } = await supabase.from('table').select();
    if (error) throw error;
    return data;
  },
  onError: (error) => {
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
  },
});
```

### Mutation Errors
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    // ...
  },
  onError: (error) => {
    toast({
      title: 'Failed',
      description: error.message,
      variant: 'destructive',
    });
  },
});
```

---

## Testing

### Manual Testing
- Use the comprehensive testing checklist in `docs/PHASE_5_COMPREHENSIVE_TESTING.md`
- Test all user flows
- Test on multiple browsers
- Test on mobile devices

### Performance Testing
- Run Lighthouse audits
- Test with slow network
- Monitor bundle size
- Check Core Web Vitals

---

## Troubleshooting

### Common Issues

#### "Cannot read property of undefined"
- Check if data is loaded before accessing
- Use optional chaining: `data?.property`
- Add loading states

#### "RLS policy violation"
- Check RLS policies in Supabase
- Verify user is authenticated
- Check user role matches policy

#### "Service worker not registering"
- Check HTTPS (required for service workers)
- Verify service worker file exists
- Check browser console for errors

#### "Real-time not working"
- Verify Supabase Realtime is enabled
- Check channel subscription
- Verify RLS policies allow reads

---

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **TanStack Query**: https://tanstack.com/query
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **TailwindCSS**: https://tailwindcss.com/docs

---

## Contributing

### Before Making Changes
1. Read this guide
2. Understand the architecture
3. Check existing code patterns
4. Test your changes

### Making Changes
1. Create a feature branch
2. Make focused, small changes
3. Test thoroughly
4. Update documentation if needed
5. Submit for review

---

**Last Updated**: Phase 5 Implementation
**Version**: 1.0.0

