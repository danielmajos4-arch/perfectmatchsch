# User Information Not Saving - Fix Guide

## Problem

User information is not being saved to the database. This can happen if:
1. The database trigger wasn't set up when users registered
2. The webapp was running before the trigger was created
3. RLS policies are blocking saves
4. The trigger function has errors

## Root Causes

### 1. Missing Trigger
- The `handle_new_user()` trigger should automatically create a user record in `public.users` when someone signs up
- If this trigger wasn't set up, users in `auth.users` won't have corresponding records in `public.users`

### 2. RLS Policy Issues
- Row Level Security policies might be blocking inserts/updates
- Policies need to allow users to insert/update their own records

### 3. Webapp Running Before Schema Setup
- If users registered before the trigger was created, their records won't exist
- Need to backfill missing user records

## Solution

### Step 1: Run Diagnostic Script

First, run `VERIFY_USER_SAVING.sql` to check:
- ✅ If trigger exists and is enabled
- ✅ If RLS policies are correct
- ✅ How many users are missing from `public.users`

### Step 2: Run Fix Script

Run `FIX_USER_SAVING.sql` which will:
1. **Recreate the trigger** - Ensures `handle_new_user()` function and trigger are active
2. **Backfill missing users** - Creates `public.users` records for any users in `auth.users` that don't have records
3. **Fix RLS policies** - Ensures all necessary policies exist and allow saves
4. **Show summary** - Reports how many users were fixed

### Step 3: Verify Fix

After running the fix script, check:
1. All users in `auth.users` should have records in `public.users`
2. New registrations should automatically create user records
3. Profile saves (teacher/school) should work

## Files Created

1. **VERIFY_USER_SAVING.sql** - Diagnostic script to check what's wrong
2. **FIX_USER_SAVING.sql** - Fix script that repairs the issues
3. **USER_SAVING_FIX.md** - This documentation

## How to Use

### Quick Fix (Recommended)
```sql
-- Just run this in Supabase SQL Editor:
-- Copy and paste the entire FIX_USER_SAVING.sql file
```

### Diagnostic First (If you want to see what's wrong)
```sql
-- 1. Run VERIFY_USER_SAVING.sql to see the issues
-- 2. Then run FIX_USER_SAVING.sql to fix them
```

## What Gets Fixed

### Trigger Fix
- ✅ Recreates `handle_new_user()` function with better error handling
- ✅ Recreates `on_auth_user_created` trigger
- ✅ Uses `ON CONFLICT` to handle duplicate inserts gracefully

### User Records
- ✅ Backfills all missing user records from `auth.users` to `public.users`
- ✅ Preserves existing data if records already exist
- ✅ Extracts role and full_name from user metadata

### RLS Policies
- ✅ Ensures RLS is enabled on users, teachers, and schools tables
- ✅ Recreates all necessary policies for viewing, inserting, and updating
- ✅ Policies allow users to manage their own records

## Expected Results

After running `FIX_USER_SAVING.sql`, you should see:

```
✅ User saving fix complete!
auth_users_count: X
public_users_count: X
sync_status: ✅ All users synced
```

If there are still missing users, the script will list them.

## Testing

After running the fix:

1. **Test Registration**:
   - Register a new user
   - Check if user record appears in `public.users` automatically

2. **Test Profile Save**:
   - Complete teacher or school onboarding
   - Check if profile saves successfully
   - Verify data appears in `teachers` or `schools` table

3. **Check Existing Users**:
   - Run: `SELECT * FROM public.users;`
   - Should see all users from `auth.users`

## Troubleshooting

### If users still can't save:
1. Check browser console for specific error messages
2. Verify RLS policies are correct (run VERIFY_USER_SAVING.sql)
3. Check if user is authenticated (should see user in auth context)
4. Verify user record exists in `public.users` before trying to save profile

### If trigger still doesn't work:
1. Check Supabase logs for trigger errors
2. Verify function has `SECURITY DEFINER` (allows it to bypass RLS)
3. Check if trigger is enabled (not disabled)

### If RLS is blocking:
1. Verify policies allow `INSERT` and `UPDATE` operations
2. Check that `auth.uid() = user_id` condition is correct
3. Ensure user is authenticated when trying to save

## Next Steps

After fixing:
1. ✅ All existing users should have records in `public.users`
2. ✅ New registrations should automatically create user records
3. ✅ Profile saves should work for both teachers and schools
4. ✅ No more "user not found" or "permission denied" errors

If issues persist, check the browser console for specific error messages and share them for further debugging.

