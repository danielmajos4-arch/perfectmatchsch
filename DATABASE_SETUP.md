# Database Setup & Verification Guide

## Quick Setup Instructions

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: potoqeqztxztlnbdkdaf
3. **Navigate to SQL Editor** (left sidebar)
4. **Copy and paste the entire contents of `supabase-schema-fixed.sql`**
   - ⚠️ **Use `supabase-schema-fixed.sql`** (not the original) - this version handles existing tables safely
5. **Click "Run"** to execute

**Note**: If you get a "column user_id does not exist" error, use `supabase-schema-fixed.sql` which drops and recreates tables with the correct structure.

## Verify Tables Exist

After running the schema, verify these tables exist in the **Table Editor**:

### Required Tables (MVP):
- ✅ `users` - User profiles (extends auth.users)
- ✅ `teachers` - Detailed teacher profiles
- ✅ `schools` - Detailed school profiles
- ✅ `jobs` - Job postings
- ✅ `applications` - Job applications

### Optional Tables (for later):
- `conversations` - Chat conversations
- `messages` - Chat messages
- `quiz_with_options` - Quiz questions (for teacher archetype quiz)
- `user_archetypes` - Archetype definitions (for teacher quiz)

## Verify RLS Policies

In **Authentication → Policies**, check that RLS is enabled on:
- `users`
- `jobs`
- `applications`
- `conversations` (if created)
- `messages` (if created)

## Verify Trigger

Check that the `on_auth_user_created` trigger exists:
1. Go to **Database → Functions**
2. Verify `handle_new_user()` function exists
3. Go to **Database → Triggers**
4. Verify `on_auth_user_created` trigger is active on `auth.users`

## Test Connection

After setup, test by:
1. Starting the dev server: `npm run dev`
2. Try registering a new user
3. Check if user appears in `users` table automatically

## Troubleshooting

### If tables already exist:
- The schema uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run again
- Policies will be created/updated as needed

### If you get permission errors:
- Verify RLS policies are correctly set
- Check that the anon key has proper permissions
- Ensure trigger function has `SECURITY DEFINER`

### If user profile isn't created on signup:
- Check trigger is active
- Verify function `handle_new_user()` exists
- Check function has correct permissions

