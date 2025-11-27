# PerfectMatchSchools - Project Overview

## Executive Summary

**PerfectMatchSchools** is a two-sided education marketplace platform that connects passionate educators with outstanding schools. The platform enables schools to post teaching positions and teachers to discover, apply to, and communicate with schools through an intelligent matching system based on teaching archetypes, qualifications, and preferences.

### Core Value Proposition
- **For Teachers**: Find jobs that match their teaching style, qualifications, and career goals through intelligent matching
- **For Schools**: Discover qualified candidates who align with their school culture and teaching needs
- **Matching Intelligence**: Uses archetype-based matching system to connect compatible teachers and schools

### Current Status
- **Overall Progress**: ~75% complete
- **MVP Status**: Core functionality operational
- **Production Readiness**: Ready for pilot testing, needs PWA setup and email notification integration

---

## Tech Stack & Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Wouter** - Lightweight routing (alternative to React Router)
- **TanStack Query (React Query)** - Server state management, caching, and data fetching
- **Shadcn UI** - Component library built on Radix UI
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **date-fns** - Date formatting utilities
- **Framer Motion** - Animation library
- **Zod** - Schema validation

### Backend
- **Express.js** - Minimal server (primarily serves the built React app)
- **Supabase** - Backend-as-a-Service providing:
  - PostgreSQL database
  - Authentication (email-based)
  - Row Level Security (RLS) for data access control
  - Realtime subscriptions for live updates
  - Storage (for file uploads)

### Architecture Pattern
**Frontend-First with Direct Database Access**

```
User Action → React Component → TanStack Query → Supabase Client → Supabase DB
                ↓
         Query Cache Update → UI Re-render
```

**Key Design Decisions:**
1. Direct database access from frontend (no traditional REST API layer)
2. Row Level Security (RLS) handles data access control
3. TanStack Query manages caching, refetching, and loading states
4. TypeScript shared types between frontend and database
5. Mobile-first responsive design

### Development Tools
- **TypeScript** - Type checking
- **ESBuild** - Fast bundler for production builds
- **PostCSS** - CSS processing
- **Drizzle ORM** - Type-safe database queries (configured but Supabase client used directly)

---

## Core Features & Functionality

### 1. Authentication & User Management
- Email-based authentication via Supabase Auth
- Role-based access control (teacher vs school)
- Protected routes with role-specific dashboards
- Session management
- Onboarding flows for both user types

**Key Files:**
- `client/src/pages/Login.tsx`
- `client/src/pages/Register.tsx`
- `client/src/contexts/AuthContext.tsx`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/components/RoleProtectedRoute.tsx`

### 2. Job Marketplace
- Schools can post teaching positions with detailed requirements
- Teachers can browse and search jobs
- Advanced filtering by subject, location, grade level, job type, archetype
- Job detail pages with full information
- Application system with cover letters
- Job status management (active/inactive)

**Key Files:**
- `client/src/pages/Jobs.tsx`
- `client/src/pages/JobDetail.tsx`
- `client/src/components/JobCard.tsx`
- `client/src/components/AdvancedJobFilters.tsx`

### 3. Intelligent Matching System (Sprint 6)
- **Archetype-based matching**: Matches teachers to jobs based on teaching style archetypes
- **Automatic candidate discovery**: Schools automatically see matching candidates when posting jobs
- **Real-time match updates**: Matches update automatically when profiles change
- **Match scoring**: Calculates compatibility scores based on multiple factors
- **Teacher job recommendations**: Teachers see personalized job feed with match scores

**Matching Factors:**
- Archetype compatibility
- Subject/grade level alignment
- Location preferences
- Experience level
- Certifications

**Key Files:**
- `client/src/lib/matchingService.ts`
- `client/src/lib/jobMatchingService.ts`
- `shared/matching.ts` - Matching types and interfaces
- Database views: `candidate_matches`, `teacher_job_matches`

### 4. Application Management
- Teachers can apply to jobs with cover letters
- Application status tracking (pending, under_review, accepted, rejected)
- Schools can view and manage applications
- Application timeline/history
- Application wizard for multi-step applications
- Application analytics

**Key Files:**
- `client/src/components/ApplicationModal.tsx`
- `client/src/components/ApplicationWizard.tsx`
- `client/src/components/ApplicationTimeline.tsx`
- `client/src/components/ApplicationAnalytics.tsx`

### 5. Onboarding System
- **Teacher Onboarding**:
  - Profile creation (personal info, experience, qualifications)
  - Archetype quiz system (personality/teaching style assessment)
  - Profile completion tracking
  - Resume/portfolio upload (placeholder)
  
- **School Onboarding**:
  - School profile creation
  - School information and description
  - Logo upload (placeholder)

**Key Files:**
- `client/src/pages/onboarding/TeacherOnboarding.tsx`
- `client/src/pages/onboarding/SchoolOnboarding.tsx`
- `client/src/components/onboarding/ArchetypeQuiz.tsx`
- `client/src/components/onboarding/ArchetypeResults.tsx`

### 6. Messaging System
- Real-time chat between teachers and schools
- Conversation management
- Message history
- Message read status
- Mobile-responsive chat interface
- Conversation creation from job applications

**Key Files:**
- `client/src/pages/Messages.tsx`
- `client/src/lib/conversationService.ts`

### 7. Dashboard Features

#### Teacher Dashboard
- Application tracking and status
- Matched jobs feed with match scores
- Favorite/hide jobs functionality
- Recommended jobs based on profile
- Profile completion stepper
- Achievement badges (gamification)
- Statistics and analytics
- Quick apply functionality

**Key Files:**
- `client/src/pages/TeacherDashboard.tsx`
- `client/src/components/CandidateDashboard.tsx` (for viewing own applications)

#### School Dashboard
- Job posting management
- Candidate dashboard with filtering
- Application overview and management
- Candidate pipeline visualization
- Candidate comparison tool
- Statistics and analytics
- Email template management

**Key Files:**
- `client/src/pages/SchoolDashboard.tsx`
- `client/src/components/CandidateDashboard.tsx`
- `client/src/components/CandidatePipelineView.tsx`
- `client/src/components/CandidateComparison.tsx`

### 8. Profile Management
- Teacher profile editing
- School profile editing
- Profile completion tracking
- Profile strength indicators
- Resume/portfolio management (placeholder)
- Profile photo upload (placeholder)

**Key Files:**
- `client/src/pages/Profile.tsx`
- `client/src/components/TeacherProfileEditor.tsx`
- `client/src/components/ProfileCompletionStepper.tsx`
- `client/src/components/ProfileCompletionCircle.tsx`

### 9. Notifications & Communication
- In-app notification center
- Email notifications (Resend service integrated, needs trigger setup)
- Email template management for schools
- Notification preferences
- Real-time notification updates

**Key Files:**
- `client/src/pages/Notifications.tsx`
- `client/src/components/NotificationCenter.tsx`
- `client/src/lib/notificationService.ts`
- `client/src/lib/emailNotificationService.ts`
- `client/src/lib/resendService.ts`
- `client/src/pages/EmailTemplates.tsx`

### 10. Gamification & Achievements
- Achievement system for teachers
- Achievement badges and collections
- Achievement notifications
- Progress tracking
- Achievement categories: profile, application, matching, engagement, milestone

**Key Files:**
- `client/src/lib/achievementService.ts`
- `client/src/hooks/useAchievements.ts`
- `client/src/components/achievements/` (AchievementBadge, AchievementCollection, AchievementNotification)

### 11. Search & Discovery
- Advanced job search with multiple filters
- Saved searches with notifications
- Search history
- Search suggestions
- Archetype-based filtering

**Key Files:**
- `client/src/components/SavedSearches.tsx`
- `client/src/components/SearchSuggestions.tsx`
- `client/src/lib/savedSearchService.ts`

### 12. Additional Features
- Settings page for user preferences
- Email preferences management
- Mobile-optimized navigation
- PWA support (manifest created, service worker pending)
- Responsive design (mobile-first)
- Dark mode support (via next-themes)

---

## Project Structure

```
PerfectMatchSchools-1/
├── client/                          # Frontend React application
│   ├── public/                      # Static assets
│   │   ├── manifest.json            # PWA manifest
│   │   └── icons/                   # App icons (to be generated)
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── ui/                  # Shadcn UI components
│   │   │   ├── achievements/        # Achievement-related components
│   │   │   ├── onboarding/          # Onboarding components
│   │   │   ├── ApplicationModal.tsx
│   │   │   ├── ApplicationWizard.tsx
│   │   │   ├── CandidateDashboard.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── SchoolDashboard.tsx
│   │   │   ├── Jobs.tsx
│   │   │   ├── JobDetail.tsx
│   │   │   ├── Messages.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Notifications.tsx
│   │   │   ├── EmailTemplates.tsx
│   │   │   └── onboarding/          # Onboarding pages
│   │   ├── contexts/                # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAchievements.ts
│   │   │   ├── useServiceWorker.ts
│   │   │   └── ...
│   │   ├── lib/                     # Service libraries
│   │   │   ├── supabaseClient.ts    # Supabase client initialization
│   │   │   ├── queryClient.ts       # TanStack Query client
│   │   │   ├── matchingService.ts   # Matching logic
│   │   │   ├── jobMatchingService.ts
│   │   │   ├── conversationService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── emailNotificationService.ts
│   │   │   ├── resendService.ts      # Email service
│   │   │   ├── achievementService.ts
│   │   │   ├── savedSearchService.ts
│   │   │   ├── fileUploadService.ts
│   │   │   └── storageService.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── defaultTemplates.ts
│   │   │   ├── templateUtils.ts
│   │   │   └── ...
│   │   ├── App.tsx                  # Main app component with routing
│   │   └── main.tsx                 # Entry point
│   └── index.html
│
├── server/                          # Backend Express server
│   ├── index.ts                     # Server entry point
│   ├── routes.ts                    # API routes (minimal)
│   └── vite.ts                      # Vite integration
│
├── shared/                          # Shared TypeScript types
│   ├── schema.ts                    # Database type definitions
│   └── matching.ts                  # Matching-related types
│
├── docs/                            # Documentation
│   ├── DEVELOPER_GUIDE.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── USER_GUIDE_TEACHERS.md
│   ├── USER_GUIDE_SCHOOLS.md
│   ├── PERFORMANCE_OPTIMIZATION.md
│   └── ...
│
├── supabase-migrations/            # Database migrations
│
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
├── tailwind.config.ts               # TailwindCSS configuration
└── drizzle.config.ts                # Drizzle ORM configuration
```

---

## Database Schema Overview

### Core Tables

#### `users` (extends Supabase auth.users)
- `id` (UUID, primary key)
- `email` (string)
- `role` ('teacher' | 'school')
- `full_name` (string)
- `created_at` (timestamp)

#### `teachers`
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `full_name`, `email`, `phone`, `location`
- `bio`, `years_experience`
- `subjects` (array of strings)
- `grade_levels` (array of strings)
- `certifications` (array of strings, nullable)
- `archetype` (string, nullable) - Teaching archetype
- `archetype_tags` (array of strings, nullable) - For matching
- `quiz_result` (JSON, nullable) - Archetype quiz results
- `profile_complete` (boolean)
- `teaching_philosophy` (string, nullable)
- `resume_url`, `profile_photo_url`, `portfolio_url` (nullable)
- `created_at` (timestamp)

#### `schools`
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `school_name`, `school_type`, `location`, `description`
- `website`, `logo_url` (nullable)
- `profile_complete` (boolean)
- `created_at` (timestamp)

#### `jobs`
- `id` (UUID, primary key)
- `school_id` (UUID, foreign key to schools)
- `title`, `department`, `subject`, `grade_level`, `job_type`
- `location`, `salary`, `description`, `requirements`, `benefits`
- `school_name`, `school_logo` (nullable)
- `archetype_tags` (array of strings, nullable) - For matching
- `posted_at` (timestamp)
- `is_active` (boolean)

#### `applications`
- `id` (UUID, primary key)
- `job_id` (UUID, foreign key to jobs)
- `teacher_id` (UUID, foreign key to teachers)
- `cover_letter` (text)
- `status` ('pending' | 'under_review' | 'accepted' | 'rejected')
- `applied_at` (timestamp)

#### `conversations`
- `id` (UUID, primary key)
- `teacher_id` (UUID, foreign key to teachers)
- `school_id` (UUID, foreign key to schools)
- `job_id` (UUID, nullable, foreign key to jobs)
- `last_message_at` (timestamp)
- `created_at` (timestamp)

#### `messages`
- `id` (UUID, primary key)
- `conversation_id` (UUID, foreign key to conversations)
- `sender_id` (UUID, foreign key to users)
- `content` (text)
- `sent_at` (timestamp)
- `is_read` (boolean)

### Matching System Tables (Sprint 6)

#### `job_candidates`
- Stores candidate pools for jobs
- Auto-populated via triggers when jobs are posted

#### `teacher_job_matches`
- Stores matched jobs for teachers
- Auto-populated via triggers when teacher profiles are updated
- Includes match scores and reasons

#### `candidate_matches` (View)
- Combined view for easy querying of candidates
- Includes teacher info, job info, and match scores

### Additional Tables

#### `user_archetypes`
- Archetype definitions and descriptions
- Strengths, growth areas, ideal environments

#### `quiz_questions` & `quiz_options`
- Archetype quiz questions and answer options

#### `saved_searches`
- User saved search queries and filters

#### `email_templates`
- Customizable email templates for schools

#### `achievements` & `user_achievements`
- Achievement definitions and user progress

#### `notifications`
- In-app notifications

#### `email_preferences`
- User email notification preferences

### Row Level Security (RLS)
All tables have RLS policies to ensure:
- Users can only access their own data
- Teachers can only see their own applications
- Schools can only see applications for their jobs
- Proper data isolation between users

---

## Key Services & Libraries

### Data Access Pattern
All data access goes through Supabase client with TanStack Query:

```typescript
// Example pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['jobs', filters],
  queryFn: () => supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .order('posted_at', { ascending: false })
});
```

### Key Service Files

#### `lib/supabaseClient.ts`
- Supabase client initialization
- Environment variable configuration
- Singleton pattern

#### `lib/queryClient.ts`
- TanStack Query client configuration
- Default query options
- Error handling

#### `lib/matchingService.ts`
- `getJobCandidates()` - Get candidates for a job
- `getSchoolCandidates()` - Get all candidates for a school
- `getTeacherJobMatches()` - Get matched jobs for a teacher
- `updateCandidateStatus()` - Update candidate status
- `updateTeacherJobMatch()` - Favorite/hide jobs

#### `lib/jobMatchingService.ts`
- `findMatchingTeachers()` - Find teachers matching a job
- Matching algorithm implementation

#### `lib/conversationService.ts`
- Conversation and message management
- Real-time message subscriptions

#### `lib/notificationService.ts`
- In-app notification management
- Notification preferences

#### `lib/emailNotificationService.ts`
- Email notification logic
- Integration with Resend service

#### `lib/resendService.ts`
- Email sending via Resend API
- Template rendering
- Email delivery

#### `lib/achievementService.ts`
- Achievement checking and unlocking
- Progress tracking
- Circuit breaker for error handling

#### `lib/savedSearchService.ts`
- Saved search management
- Search notification triggers

#### `lib/fileUploadService.ts` & `lib/storageService.ts`
- File upload to Supabase Storage
- Resume, portfolio, photo management

---

## Current Status & Progress

### Overall Completion: ~75%

### Completed Features ✅

#### Epic 1-4 (MVP) - 100% Complete
- Authentication system
- Job posting and browsing
- Application system
- Basic dashboards
- Onboarding flows
- Messaging foundation

#### Sprint 6: Cross-Platform Integration - 85% Complete
- ✅ Matching system functional
- ✅ Candidate dashboard working
- ✅ Teacher job matches working
- ✅ Real-time matching triggers
- ⚠️ Email notifications (service exists, needs trigger integration)

#### Sprint 7: School Candidate Dashboard - 70% Complete
- ✅ Candidate Dashboard component
- ✅ Filtering and status management
- ✅ Match score display
- ⚠️ Resume/portfolio upload (placeholder)
- ⚠️ Bulk actions missing

#### Sprint 8: Teacher Dashboard Refinement - 50% Complete
- ✅ Real-time job feed
- ✅ Favorite/hide functionality
- ✅ Mobile responsive design
- ❌ Gamified feedback (badges exist but need integration)
- ⚠️ Profile completion visualization needs enhancement

#### Sprint 10: Mobile Optimization - 60% Complete
- ✅ Mobile-first responsive design
- ✅ Touch targets optimized
- ✅ Responsive typography
- ❌ PWA manifest (created but icons missing)
- ❌ Service worker / offline caching

### Incomplete Features ⚠️

1. **PWA Setup**
   - Manifest created but icons need generation
   - Service worker not implemented
   - Offline caching missing

2. **Email Notifications**
   - Resend service integrated
   - Email templates exist
   - Needs trigger integration for automatic emails

3. **File Uploads**
   - Supabase Storage integration ready
   - UI components exist (placeholders)
   - Needs full implementation

4. **Gamification**
   - Achievement system exists
   - Needs better integration and visualization
   - Badge animations missing

5. **Advanced Features**
   - Bulk candidate actions
   - Analytics dashboard
   - Advanced search features
   - Profile viewing pages

---

## Development Workflow

### Setup
1. Install dependencies: `npm install`
2. Configure environment variables (`.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY` (for email)
3. Run database migrations in Supabase SQL Editor
4. Start dev server: `npm run dev`

### Development
- **Dev Server**: Runs on `http://127.0.0.1:5000` (or fallback port 3000)
- **Hot Reload**: Vite provides instant HMR
- **Type Checking**: `npm run check` (TypeScript)
- **Build**: `npm run build` (creates production build)

### Code Organization
- **Components**: Reusable UI components in `client/src/components/`
- **Pages**: Route components in `client/src/pages/`
- **Services**: Business logic in `client/src/lib/`
- **Types**: Shared types in `shared/`
- **Hooks**: Custom React hooks in `client/src/hooks/`

### Data Fetching Pattern
```typescript
// Standard pattern using TanStack Query
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

// Query example
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
});

// Mutation example
const mutation = useMutation({
  mutationFn: async (newData) => {
    const { data, error } = await supabase
      .from('table')
      .insert(newData);
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  }
});
```

### Routing
Uses Wouter (lightweight router):
```typescript
// Route definition in App.tsx
<Route path="/teacher/dashboard">
  <RoleProtectedRoute allowedRole="teacher">
    <TeacherDashboard />
  </RoleProtectedRoute>
</Route>
```

### Styling
- TailwindCSS utility classes
- Shadcn UI components (customizable)
- Mobile-first responsive design
- Dark mode support via `next-themes`

---

## Known Issues & Limitations

### Technical Debt
1. **No API abstraction layer**: Direct Supabase calls scattered throughout
2. **Inconsistent error handling**: Some components handle errors, others don't
3. **No query key constants**: Magic strings used for query keys
4. **Missing TypeScript strictness**: Some `any` types used
5. **Server routes unused**: `server/routes.ts` is empty (minimal backend)

### Feature Gaps
1. **Real-time messaging**: Infrastructure exists but not fully implemented
2. **File uploads**: Placeholders exist, needs full implementation
3. **Email triggers**: Service exists but automatic triggers not set up
4. **PWA features**: Manifest created but service worker missing
5. **Analytics**: No tracking or analytics dashboard
6. **Bulk actions**: Missing for candidate management
7. **Profile viewing**: No public profile pages

### Performance Considerations
1. **No code splitting**: All code in single bundle
2. **No pagination**: Some lists load all data at once
3. **Image optimization**: No lazy loading or WebP conversion
4. **Query optimization**: Some queries could be more efficient

### Security Considerations
1. **RLS policies**: Need verification for all tables
2. **Input validation**: Some forms lack Zod validation
3. **File upload security**: Needs file type/size validation
4. **Rate limiting**: No protection against spam

---

## Next Steps & Roadmap

### Immediate Priorities (Week 1-2)

1. **Complete PWA Setup**
   - Generate app icons (all required sizes)
   - Implement service worker for offline caching
   - Test PWA install experience
   - Audit Core Web Vitals

2. **Integrate Email Notifications**
   - Set up database triggers for automatic emails
   - Test email delivery
   - Configure email templates

3. **Enhance UX**
   - Improve profile completion visualization
   - Add match score visualizations
   - Integrate achievement badges better

### Short-term (Week 3-4)

4. **File Upload Implementation**
   - Complete Supabase Storage integration
   - Resume/portfolio upload
   - Profile photo upload
   - School logo upload

5. **Advanced Features**
   - Bulk candidate actions
   - Candidate comparison enhancements
   - Advanced search improvements
   - Analytics dashboard

6. **Performance Optimization**
   - Code splitting by route
   - Image optimization
   - Query pagination
   - Bundle size optimization

### Medium-term (Month 2-3)

7. **Real-time Features**
   - Complete real-time messaging
   - Real-time notification updates
   - Live match updates

8. **Testing Infrastructure**
   - Unit tests (Vitest)
   - Integration tests
   - E2E tests (Playwright)

9. **Production Readiness**
   - Error reporting (Sentry)
   - Monitoring and analytics
   - Performance monitoring
   - Security audit

### Long-term

10. **Advanced Matching**
    - Machine learning recommendations
    - Improved matching algorithm
    - Compatibility scoring enhancements

11. **Additional Features**
    - Interview scheduling
    - Video interviews
    - Reference checking
    - Background checks integration

---

## Key Files Reference

### Entry Points
- `client/src/main.tsx` - React app entry
- `client/src/App.tsx` - Main app component with routing
- `server/index.ts` - Express server entry

### Core Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - TailwindCSS configuration

### Type Definitions
- `shared/schema.ts` - Database type definitions
- `shared/matching.ts` - Matching system types

### Key Components
- `client/src/components/Sidebar.tsx` - Main navigation
- `client/src/components/CandidateDashboard.tsx` - Candidate management
- `client/src/components/ApplicationWizard.tsx` - Multi-step application
- `client/src/components/NotificationCenter.tsx` - Notifications UI

### Key Pages
- `client/src/pages/TeacherDashboard.tsx` - Teacher main dashboard
- `client/src/pages/SchoolDashboard.tsx` - School main dashboard
- `client/src/pages/Jobs.tsx` - Job browsing
- `client/src/pages/Messages.tsx` - Messaging interface

### Key Services
- `client/src/lib/matchingService.ts` - Matching logic
- `client/src/lib/achievementService.ts` - Achievement system
- `client/src/lib/notificationService.ts` - Notifications
- `client/src/lib/resendService.ts` - Email service

---

## Environment Variables

Required environment variables (`.env` file):

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key

# Server
PORT=5000
NODE_ENV=development
```

---

## Database Setup

1. Run `supabase-schema.sql` in Supabase SQL Editor
2. Verify all tables are created
3. Check RLS policies are active
4. Verify triggers are working (for matching system)
5. Test data access with test accounts

Key SQL files:
- `supabase-schema.sql` - Main schema
- `sprint6-matching-schema.sql` - Matching system additions
- Various migration files in `supabase-migrations/`

---

## Testing Status

### Current State
- No automated tests
- Manual testing checklists exist
- Testing documentation in `docs/`

### Recommended Testing
1. **Unit Tests**: Component and service functions
2. **Integration Tests**: Data flow and API interactions
3. **E2E Tests**: Critical user flows
4. **Performance Tests**: Load times and responsiveness

---

## Deployment

### Deployment Options
- **Vercel**: Frontend deployment (recommended)
- **Netlify**: Alternative frontend hosting
- **Railway**: Full-stack deployment
- **Custom**: VPS with Node.js

### Pre-deployment Checklist
1. Environment variables configured
2. Database migrations run
3. Build succeeds (`npm run build`)
4. Production build tested locally
5. Error tracking configured
6. Analytics configured
7. Domain and SSL configured

See `docs/DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## Documentation

### Available Documentation
- `docs/DEVELOPER_GUIDE.md` - Complete developer guide
- `docs/DEPLOYMENT_GUIDE.md` - Deployment instructions
- `docs/USER_GUIDE_TEACHERS.md` - Teacher user guide
- `docs/USER_GUIDE_SCHOOLS.md` - School user guide
- `docs/PERFORMANCE_OPTIMIZATION.md` - Performance guide
- `ARCHITECTURE_ANALYSIS.md` - Architecture details
- `CURRENT_PROJECT_STATUS.md` - Current progress

---

## Summary

PerfectMatchSchools is a modern, feature-rich education marketplace platform with:
- ✅ Solid foundation (MVP complete)
- ✅ Intelligent matching system
- ✅ Modern tech stack
- ✅ Mobile-optimized UI
- ⚠️ Needs PWA completion
- ⚠️ Needs email notification integration
- ⚠️ Needs file upload implementation
- 🎯 Ready for pilot testing with some polish needed

The platform is approximately **75% complete** and ready for production testing after completing PWA setup and email notification integration.

---

**Last Updated**: Based on current project state
**Version**: 1.0.0 (Pre-production)
**Status**: Active Development

