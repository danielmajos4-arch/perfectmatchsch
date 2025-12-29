# File Upload Verification Guide

## Overview

This guide helps verify that file upload functionality is working correctly in production.

## Prerequisites

1. Supabase project is set up
2. Storage buckets are created
3. RLS policies are configured

## Step 1: Verify Storage Buckets

### Check if buckets exist:

```sql
-- Run in Supabase SQL Editor
SELECT * FROM storage.buckets;
```

**Expected buckets:**
- `profile-images` (public: true)
- `documents` (public: true)
- `school-logos` (public: true)

### If buckets don't exist, run:

```sql
-- Run SUPABASE_STORAGE_SETUP.sql
-- Located at: /SUPABASE_STORAGE_SETUP.sql
```

## Step 2: Verify RLS Policies

### Check policies exist:

```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
```

**Expected policies for `profile-images`:**
- "Users can upload their own profile images" (INSERT)
- "Users can update their own profile images" (UPDATE)
- "Users can delete their own profile images" (DELETE)
- "Anyone can view profile images" (SELECT)

**Expected policies for `documents`:**
- "Users can upload their own documents" (INSERT)
- "Users can update their own documents" (UPDATE)
- "Users can delete their own documents" (DELETE)
- "Anyone can view documents" (SELECT)

## Step 3: Test Profile Photo Upload

1. Navigate to `/profile` as a teacher
2. Click on profile photo or upload button
3. Select an image file (JPG, PNG, WEBP)
4. Verify:
   - [ ] File uploads successfully
   - [ ] Progress indicator shows
   - [ ] Image displays after upload
   - [ ] Image URL is saved to `teachers.profile_photo_url`
   - [ ] Image is accessible via public URL

### Expected Behavior:
- File size limit: 2MB
- Allowed types: image/jpeg, image/png, image/webp
- File path format: `{user_id}/{filename}-{timestamp}-{random}.{ext}`

## Step 4: Test Resume Upload

1. Navigate to `/profile` as a teacher
2. Find Resume Upload section
3. Drag and drop or select a PDF/DOC/DOCX file
4. Verify:
   - [ ] File uploads successfully
   - [ ] Progress indicator shows
   - [ ] Resume URL is saved to `teachers.resume_url`
   - [ ] Resume is downloadable
   - [ ] Old resume is deleted when new one is uploaded

### Expected Behavior:
- File size limit: 5MB (per fileValidation.ts) or 10MB (per fileUploadService.ts)
- Allowed types: PDF, DOC, DOCX, TXT
- File path format: `{user_id}/resume-{timestamp}-{filename}`

## Step 5: Test Portfolio Upload

1. Navigate to `/profile` as a teacher
2. Find Portfolio Upload section
3. Upload multiple files (images, PDFs, etc.)
4. Verify:
   - [ ] Files upload successfully
   - [ ] Multiple files can be uploaded
   - [ ] Portfolio URL is saved as JSON array
   - [ ] Files are viewable/downloadable
   - [ ] Files can be deleted individually

### Expected Behavior:
- File size limit: 10MB (per fileValidation.ts) or 20MB (per fileUploadService.ts)
- Allowed types: PDF, DOC, DOCX, TXT, JPG, PNG, WEBP
- Portfolio stored as JSON array in `teachers.portfolio_url`

## Step 6: Verify File Access

### Check file URLs are accessible:

1. Get a file URL from database:
```sql
SELECT profile_photo_url, resume_url, portfolio_url 
FROM teachers 
WHERE user_id = '<test-user-id>';
```

2. Open URL in browser
3. Verify:
   - [ ] File loads correctly
   - [ ] No authentication required (public bucket)
   - [ ] File is not corrupted

## Step 7: Test Error Handling

### Test invalid files:

1. Try uploading file that's too large
   - [ ] Error message displays
   - [ ] Upload is rejected

2. Try uploading invalid file type
   - [ ] Error message displays
   - [ ] Upload is rejected

3. Try uploading with no internet
   - [ ] Error message displays
   - [ ] User can retry

## Troubleshooting

### Issue: Upload fails with "Bucket not found"
**Solution:** Run `SUPABASE_STORAGE_SETUP.sql` to create buckets

### Issue: Upload fails with "Permission denied"
**Solution:** Check RLS policies are created correctly

### Issue: File uploads but URL doesn't work
**Solution:** 
- Check bucket is set to public
- Verify file path is correct
- Check CORS settings in Supabase

### Issue: Old files not deleted
**Solution:** Check delete function in `storageService.ts` and verify it's called

## Files to Check

- `client/src/lib/storageService.ts` - Storage operations
- `client/src/lib/fileUploadService.ts` - Upload logic
- `client/src/lib/fileValidation.ts` - File validation
- `client/src/components/ResumeUpload.tsx` - Resume component
- `client/src/components/PortfolioUpload.tsx` - Portfolio component
- `SUPABASE_STORAGE_SETUP.sql` - Database setup

## Success Criteria

✅ All three upload types work (profile photo, resume, portfolio)
✅ Files are accessible via public URLs
✅ File validation works correctly
✅ Error handling works for invalid files
✅ Old files are deleted when replaced
✅ Multiple portfolio files can be uploaded

