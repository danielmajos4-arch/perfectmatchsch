# PerfectMatchSchools

A two-sided education marketplace connecting passionate educators with outstanding schools.

## Project Overview

PerfectMatchSchools is a React + Express.js application integrated with Supabase for authentication, database, and real-time chat functionality. The platform enables schools to post teaching positions and teachers to browse, apply, and communicate directly with schools.

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend**: Express.js (minimal - serving frontend only)
- **Database & Auth**: Supabase (PostgreSQL, Authentication, Realtime)
- **Styling**: TailwindCSS with Inter font, Material Design principles
- **Design System**: Mobile-first, responsive, professional marketplace UI

## Architecture

The application uses a modern frontend-first architecture where:
- Frontend communicates directly with Supabase for all data operations
- Express.js serves the Vite-built React application
- Supabase handles authentication, database operations, and real-time subscriptions
- Row Level Security (RLS) policies ensure data privacy and security

## Key Features

### Authentication
- Email-based login and registration
- Role-based access (Teacher vs School)
- Secure session management via Supabase Auth

### For Teachers
- Browse and search teaching positions
- Filter jobs by subject, location, and other criteria
- Apply to positions with cover letters
- Track application status
- Direct messaging with schools
- Personal dashboard with application tracking

### For Schools
- Post and manage teaching positions
- Review and manage applications
- Communication with applicants via chat
- Dashboard with job posting analytics

### Chat System
- Real-time messaging between teachers and schools
- Conversation history
- Message read status
- Desktop and mobile-optimized interfaces

## Database Schema

### Users
- Extends Supabase auth.users
- Fields: id, email, role, full_name, created_at

### Jobs
- Fields: id, school_id, title, subject, grade_level, job_type, location, salary, description, requirements, benefits, school_name, school_logo, posted_at, is_active

### Applications
- Fields: id, job_id, teacher_id, cover_letter, status, applied_at
- Status: pending, under_review, accepted, rejected

### Conversations
- Fields: id, teacher_id, school_id, job_id, last_message_at, created_at

### Messages
- Fields: id, conversation_id, sender_id, content, sent_at, is_read

## Setup Instructions

### 1. Supabase Configuration

See `SUPABASE_SETUP.md` for detailed instructions on:
- Creating database tables
- Configuring RLS policies
- Enabling realtime subscriptions
- Setting up authentication

### 2. Environment Variables

Required secrets (already configured in Replit):
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key

### 3. Running the Application

```bash
npm install
npm run dev
```

The application runs on port 5000 by default.

## Project Structure

```
client/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Shadcn UI primitives
│   │   ├── Layout.tsx    # Main layout wrapper
│   │   ├── MobileNav.tsx # Mobile bottom navigation
│   │   ├── JobCard.tsx   # Job listing card
│   │   └── ApplicationModal.tsx
│   ├── pages/            # Route components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── TeacherDashboard.tsx
│   │   ├── SchoolDashboard.tsx
│   │   ├── Jobs.tsx
│   │   ├── JobDetail.tsx
│   │   ├── Messages.tsx
│   │   └── Profile.tsx
│   ├── lib/
│   │   ├── supabaseClient.ts  # Supabase client config
│   │   └── queryClient.ts     # TanStack Query config
│   ├── App.tsx           # Main app component with routing
│   └── index.css         # Global styles and design tokens
server/
├── routes.ts             # Express routes (minimal)
└── storage.ts            # Storage interface (unused - using Supabase)
shared/
└── schema.ts             # TypeScript types and Drizzle schema
```

## Design Guidelines

The application follows Material Design principles with:
- **Typography**: Inter font family (400, 500, 600, 700 weights)
- **Colors**: Professional blue primary (#4A90E2), neutral grays
- **Spacing**: Consistent 4px-based spacing system (2, 4, 6, 8, 12, 16)
- **Components**: Shadcn UI for consistency and accessibility
- **Responsive**: Mobile-first with breakpoints at 768px (md) and 1024px (lg)

See `design_guidelines.md` for detailed design specifications.

## Mobile-First Features

- Sticky bottom navigation on mobile devices
- Responsive layouts that adapt from mobile to desktop
- Touch-friendly tap targets (minimum 44px)
- Optimized chat interface for both mobile and desktop

## Security

- Row Level Security (RLS) policies on all Supabase tables
- Authentication required for all protected routes
- Role-based access control (teachers vs schools)
- Secure password hashing via Supabase Auth
- HTTPS-only communication with Supabase

## Development Workflow

1. Frontend components are built in `client/src/`
2. Supabase handles all backend operations
3. Types are shared via `shared/schema.ts`
4. TanStack Query manages data fetching and caching
5. Real-time updates via Supabase Realtime subscriptions

## Future Enhancements

Potential features for future development:
- Resume upload and management
- Advanced job search filters
- School profile pages
- Email notifications
- Video interview integration
- Application document uploads
- Job recommendations algorithm
- Review and rating system
