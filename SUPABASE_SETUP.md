# Supabase Setup Instructions for PerfectMatchSchools

## Prerequisites
1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Setup Steps

### 1. Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar
3. Create a new query
4. Copy the entire contents of `supabase-schema.sql` and paste it into the SQL Editor
5. Click **Run** to execute the SQL and create all tables, indexes, RLS policies, and triggers

### 2. Configure Environment Variables

The following environment variables are already set in your Replit Secrets:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

These are automatically loaded from your Supabase project settings (Settings → API).

### 3. Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Configure email templates if desired (Authentication → Email Templates)

### 4. Enable Realtime (Optional but Recommended)

Realtime is already enabled for the `messages` and `conversations` tables in the SQL schema. This allows instant message updates in the chat interface.

To verify:
1. Go to **Database** → **Replication** in your Supabase dashboard
2. Ensure `messages` and `conversations` tables are checked

### 5. Test the Connection

The app is now ready to use! The database schema includes:

- **Users**: Stores user profiles (teachers and schools)
- **Jobs**: Teaching position postings by schools
- **Applications**: Teacher applications to jobs
- **Conversations**: Chat conversations between teachers and schools
- **Messages**: Individual chat messages

### 6. Row Level Security (RLS)

All tables have RLS policies configured to ensure:
- Users can only see and modify their own data
- Schools can only manage their own job postings
- Teachers can only apply to jobs and view their applications
- Both parties can only see conversations they're part of

### 7. Sample Data (Optional)

To test the application, you can insert sample data:

```sql
-- This will be done through the application UI by:
-- 1. Registering as a School user
-- 2. Creating job postings
-- 3. Registering as a Teacher user
-- 4. Browsing and applying to jobs
```

## Database Schema Overview

### Users Table
- Extends Supabase auth.users
- Stores role (teacher/school) and profile information
- Automatically created via trigger on user signup

### Jobs Table
- Created by school users
- Contains job details, requirements, benefits
- Supports active/inactive status

### Applications Table
- Links teachers to jobs
- Tracks application status (pending, under_review, accepted, rejected)
- Prevents duplicate applications

### Conversations Table
- Creates chat channels between teachers and schools
- One unique conversation per teacher-school pair
- Optionally linked to a specific job

### Messages Table
- Stores individual chat messages
- Supports read/unread status
- Realtime-enabled for instant updates

## Troubleshooting

### "relation does not exist" errors
- Make sure you ran the entire SQL schema in the SQL Editor
- Check that all tables were created successfully in Database → Tables

### Authentication issues
- Verify that Email provider is enabled in Authentication → Providers
- Check that environment variables are correctly set in Replit Secrets

### Permission denied errors
- RLS policies are configured - users can only access their own data
- Make sure you're logged in as the correct user type (teacher vs school)

### Messages not appearing in real-time
- Verify Realtime is enabled for messages and conversations tables
- Check browser console for connection errors

## Support

For Supabase-specific issues, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
