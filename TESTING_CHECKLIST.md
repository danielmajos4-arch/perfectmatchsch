# MVP Testing Checklist

## Pre-Testing Setup

1. ✅ Environment variables configured in `.env`
2. ⏳ Run `supabase-schema.sql` in Supabase SQL Editor
3. ⏳ Verify all tables exist in Supabase dashboard
4. ⏳ Start dev server: `npm run dev`

## Phase 1: Authentication Testing

### Registration
- [ ] Navigate to `/register`
- [ ] Fill in form: name, email, password, role (teacher/school)
- [ ] Submit registration
- [ ] Verify user is created in `auth.users` table
- [ ] Verify user profile is auto-created in `users` table (via trigger)
- [ ] Check redirect to dashboard works

### Login
- [ ] Navigate to `/login`
- [ ] Enter registered email/password
- [ ] Submit login
- [ ] Verify session is created
- [ ] Check redirect to appropriate dashboard based on role

### Auth Context
- [ ] Verify `AuthContext` loads user on page refresh
- [ ] Test logout functionality
- [ ] Verify protected routes redirect to login when not authenticated

## Phase 2: Job Posting & Browsing

### School: Post Job
- [ ] Login as school user
- [ ] Navigate to `/school/dashboard`
- [ ] Click "Post Job" button
- [ ] Fill in job form (title, subject, grade, type, location, salary, description, requirements, benefits)
- [ ] Submit job
- [ ] Verify job appears in school dashboard
- [ ] Verify job is in `jobs` table in Supabase
- [ ] Check RLS policy allows school to create their own jobs

### Teacher: Browse Jobs
- [ ] Login as teacher user (or view as guest)
- [ ] Navigate to `/jobs`
- [ ] Verify active jobs are displayed
- [ ] Test search functionality (by title, school, location)
- [ ] Test subject filter
- [ ] Click on a job to view details
- [ ] Verify job detail page shows all information

### Job Management
- [ ] School can view their posted jobs
- [ ] Verify job status (active/inactive) is displayed
- [ ] Check job count in stats

## Phase 3: Applications System

### Teacher: Apply to Job
- [ ] Login as teacher
- [ ] Navigate to `/jobs` and find a job
- [ ] Click "Apply for this Position"
- [ ] Fill in cover letter
- [ ] Submit application
- [ ] Verify application is created in `applications` table
- [ ] Check duplicate application prevention (try applying twice)

### Teacher: View Applications
- [ ] Navigate to `/teacher/dashboard`
- [ ] Verify applications are listed
- [ ] Check application status badges (pending, under_review, accepted, rejected)
- [ ] Verify application shows job title and school name
- [ ] Check "Applied X time ago" timestamp

### School: View Applications
- [ ] Login as school
- [ ] Navigate to `/school/dashboard`
- [ ] Verify applications count shows for each job
- [ ] Check that applications are visible for school's jobs only
- [ ] Verify RLS policy works (school can't see other schools' applications)

## Phase 4: Onboarding (Optional for MVP)

### Teacher Onboarding
- [ ] Register as teacher
- [ ] Complete teacher profile form
- [ ] Verify profile is saved to `teachers` table
- [ ] (Optional) Complete archetype quiz if tables exist

### School Onboarding
- [ ] Register as school
- [ ] Complete school profile form
- [ ] Verify profile is saved to `schools` table
- [ ] Check redirect to school dashboard after completion

## Phase 5: Security & RLS Testing

### Row Level Security
- [ ] Teachers can only see their own applications
- [ ] Schools can only see applications for their jobs
- [ ] Schools can only manage their own jobs
- [ ] Users can only update their own profiles
- [ ] Verify unauthorized access attempts are blocked

### Data Isolation
- [ ] Create two school accounts
- [ ] Each school posts a job
- [ ] Verify schools can only see their own jobs in dashboard
- [ ] Verify teachers see all active jobs

## Phase 6: Error Handling

### Connection Errors
- [ ] Test with invalid Supabase URL
- [ ] Verify error message is user-friendly
- [ ] Test with invalid credentials

### Validation Errors
- [ ] Try submitting forms with missing required fields
- [ ] Test password length validation
- [ ] Test email format validation
- [ ] Verify error messages are clear

### Edge Cases
- [ ] Try applying to same job twice (should fail gracefully)
- [ ] Test with very long text inputs
- [ ] Test with special characters in inputs

## Success Criteria

All MVP features should:
- ✅ Work without console errors
- ✅ Persist data correctly in Supabase
- ✅ Respect RLS policies
- ✅ Show appropriate loading states
- ✅ Display user-friendly error messages
- ✅ Work on both desktop and mobile views

## Known Limitations (Post-MVP)

- Quiz tables (`quiz_with_options`, `user_archetypes`) not in schema - optional feature
- Real-time messaging not implemented yet
- File uploads not implemented yet
- Application status management UI for schools not implemented yet

