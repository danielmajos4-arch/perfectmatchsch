# Sprint 6-10 Testing Guide

## Prerequisites

1. **Database Setup**
   - Run `supabase-schema-fixed.sql` in Supabase SQL Editor (if not already done)
   - Run `sprint6-matching-schema.sql` in Supabase SQL Editor
   - Verify tables: `job_candidates`, `teacher_job_matches`, `candidate_matches` view

2. **Environment Variables**
   - Add to `.env` file:
     ```
     VITE_RESEND_API_KEY=your_resend_api_key_here
     VITE_RESEND_FROM_EMAIL=noreply@perfectmatchschools.com
     ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Testing Sprint 6: Matching Logic

### Test 1: Job Posting with Archetype Tags
1. Log in as a school
2. Click "Post a New Job"
3. Fill in all required fields
4. **Select archetype tags** (e.g., "The Guide", "The Connector")
5. Submit the job
6. **Expected**: Job is created with `archetype_tags` array populated

### Test 2: Teacher Profile Completion
1. Log in as a teacher
2. Complete the archetype quiz
3. **Expected**: `archetype_tags` should be auto-populated based on archetype
4. Check teacher profile in Supabase - verify `archetype_tags` column

### Test 3: Automatic Candidate Matching
1. As a school, post a job with archetype tags: ["The Guide", "The Connector"]
2. As a teacher, complete profile with archetype "The Guide"
3. **Expected**: 
   - Teacher should appear in `job_candidates` table
   - Match score should be calculated
   - Teacher should see job in "Matched Jobs" tab

### Test 4: School Candidate Dashboard
1. Log in as a school
2. Navigate to "Candidates" tab
3. **Expected**:
   - See all candidates matched to your jobs
   - Filter by status, archetype, grade level
   - Search functionality works
   - View candidate profile modal

### Test 5: Teacher Matched Jobs Feed
1. Log in as a teacher with completed profile
2. Navigate to "Matched Jobs" tab
3. **Expected**:
   - See jobs matched to your archetype
   - Match scores displayed
   - Favorite/hide buttons work
   - Jobs appear in real-time when new jobs are posted

### Test 6: Candidate Status Management
1. As a school, view candidates
2. Change candidate status (e.g., "New" → "Shortlisted")
3. Add notes
4. **Expected**: Status and notes are saved and displayed

## Testing Sprint 7: Candidate Dashboard Features

### Test 7: Filters
1. As a school, go to Candidates tab
2. Test filters:
   - Status filter (new, reviewed, contacted, etc.)
   - Archetype filter
   - Grade level filter
3. **Expected**: Candidates are filtered correctly

### Test 8: Search
1. As a school, use search bar
2. Search by teacher name, email, or job title
3. **Expected**: Results update in real-time

### Test 9: Teacher Profile Modal
1. As a school, click "View" (eye icon) on a candidate
2. **Expected**:
   - Modal opens with full teacher profile
   - Shows subjects, grade levels, archetype
   - Links to resume/portfolio if available
   - Contact email button works

## Testing Sprint 8: Teacher Dashboard Features

### Test 10: Profile Completion Stepper
1. As a teacher, view dashboard
2. **Expected**: 
   - Profile completion progress bar visible
   - Steps show completion status
   - Progress percentage accurate

### Test 11: Favorite Jobs
1. As a teacher, go to "Matched Jobs" tab
2. Click heart icon to favorite a job
3. Navigate to "Favorites" tab
4. **Expected**: Favorited job appears in Favorites tab

### Test 12: Hide Jobs
1. As a teacher, click "X" icon to hide a job
2. **Expected**: Job disappears from Matched Jobs feed

## Testing Email Notifications (Sprint 6)

### Test 13: School Notification
1. Configure Resend API key in `.env`
2. Post a new job as a school
3. Have a matching teacher complete their profile
4. **Expected**: School receives email notification about new candidates

### Test 14: Teacher Digest (Manual)
1. Call `sendTeacherJobDigest()` function manually or via API
2. **Expected**: Teacher receives email with job matches

## Testing Realtime Updates

### Test 15: Real-time Candidate Updates
1. Open school dashboard in two browser windows
2. In one window, post a new job
3. In another window, have a matching teacher sign up
4. **Expected**: School dashboard updates automatically with new candidate

### Test 16: Real-time Job Matches
1. Open teacher dashboard
2. Have a school post a matching job
3. **Expected**: Job appears in Matched Jobs tab automatically

## Common Issues & Solutions

### Issue: No candidates appearing
- **Check**: Teacher has completed archetype quiz
- **Check**: Job has archetype_tags populated
- **Check**: Teacher archetype_tags overlap with job archetype_tags
- **Solution**: Verify database triggers are active

### Issue: Match scores are 0
- **Check**: Teacher subjects match job subject
- **Check**: Teacher grade levels match job grade level
- **Solution**: Verify `calculate_match_score()` function is working

### Issue: Realtime not working
- **Check**: Supabase realtime is enabled for tables
- **Check**: Network connection
- **Solution**: Verify `ALTER PUBLICATION supabase_realtime ADD TABLE` statements ran

### Issue: Email not sending
- **Check**: `VITE_RESEND_API_KEY` is set in `.env`
- **Check**: API key is valid
- **Solution**: Check browser console for errors

## Performance Testing

### Test 17: Large Candidate Lists
1. Create 50+ matching candidates for a job
2. **Expected**: Dashboard loads and filters quickly

### Test 18: Multiple Jobs
1. Post 10+ jobs as a school
2. **Expected**: Candidate dashboard shows all candidates across jobs

## Mobile Testing (Sprint 10 - Partial)

### Test 19: Responsive Design
1. Open dashboard on mobile device
2. Test all tabs and filters
3. **Expected**: UI is usable on mobile

## Next Steps After Testing

1. Fix any bugs found
2. Complete remaining Sprint 9-10 features
3. Deploy to production
4. Set up monitoring for matching algorithm performance
5. Collect user feedback

