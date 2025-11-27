# Phase 5: Comprehensive Testing Guide

## Pre-Testing Setup

### Prerequisites
- [ ] Database schema deployed to Supabase
- [ ] Environment variables configured
- [ ] Development server running (`npm run dev`)
- [ ] Production build created (`npm run build`)
- [ ] Test accounts created (teacher and school)

### Test Accounts
Create these test accounts for consistent testing:
- **Teacher**: `teacher@test.com` / `TestTeacher123!`
- **School**: `school@test.com` / `TestSchool123!`

---

## 1. End-to-End Testing

### Teacher Flow

#### Registration & Onboarding
- [ ] Navigate to `/register`
- [ ] Select "Teacher" role
- [ ] Fill registration form (name, email, password)
- [ ] Submit and verify account creation
- [ ] Check redirect to `/onboarding/teacher`
- [ ] Complete teacher profile form
- [ ] Complete archetype quiz (all 8 questions)
- [ ] Verify profile saved to database
- [ ] Check redirect to `/teacher/dashboard`

#### Dashboard
- [ ] View teacher dashboard
- [ ] Verify stats display correctly (applications, matches, favorites)
- [ ] Check empty states show when no data
- [ ] Test navigation tabs:
  - [ ] Applications tab
  - [ ] Matched Jobs tab
  - [ ] Favorites tab
- [ ] Test sidebar navigation:
  - [ ] Dashboard link
  - [ ] Browse Jobs link
  - [ ] My Applications link (hash route)
  - [ ] Saved Jobs link (hash route)
  - [ ] Messages link
  - [ ] Profile link
  - [ ] Settings link

#### Job Browsing
- [ ] Navigate to `/jobs`
- [ ] Verify job listings display
- [ ] Test search functionality:
  - [ ] Search by job title
  - [ ] Search by school name
  - [ ] Search by location
- [ ] Test filters:
  - [ ] Subject filter
  - [ ] Grade level filter
  - [ ] Job type filter
  - [ ] Location filter
  - [ ] Salary range filter
  - [ ] Date posted filter
- [ ] Test sort options:
  - [ ] Date Posted (Newest)
  - [ ] Salary (High to Low)
  - [ ] Salary (Low to High)
  - [ ] Relevance
- [ ] Test pagination:
  - [ ] Navigate between pages
  - [ ] Verify correct jobs displayed
- [ ] Click job to view details
- [ ] Save job (favorite button)
- [ ] Apply to job:
  - [ ] Click "Quick Apply" or "Apply" button
  - [ ] Fill cover letter
  - [ ] Add portfolio links (optional)
  - [ ] Submit application
  - [ ] Verify success message
  - [ ] Check application appears in dashboard

#### Application Tracking
- [ ] Navigate to Applications tab in dashboard
- [ ] Verify submitted applications display
- [ ] Check application status (Applied, Reviewed, etc.)
- [ ] Verify application timeline displays correctly
- [ ] Test "Browse Jobs" CTA when no applications

#### Profile Management
- [ ] Navigate to `/profile`
- [ ] View profile information
- [ ] Edit profile information:
  - [ ] Update bio
  - [ ] Update experience
  - [ ] Update education
  - [ ] Update certifications
- [ ] Upload resume:
  - [ ] Select file
  - [ ] Verify upload success
  - [ ] Check resume displays
- [ ] Upload portfolio:
  - [ ] Add portfolio links
  - [ ] Verify portfolio displays
- [ ] Verify changes save correctly

#### Messages
- [ ] Navigate to `/messages`
- [ ] View conversation list
- [ ] Start new conversation (if applicable)
- [ ] Send message
- [ ] Verify real-time message updates
- [ ] Test message notifications

### School Flow

#### Registration & Onboarding
- [ ] Navigate to `/register`
- [ ] Select "School" role
- [ ] Fill registration form
- [ ] Submit and verify account creation
- [ ] Check redirect to `/onboarding/school`
- [ ] Complete school profile form
- [ ] Verify profile saved
- [ ] Check redirect to `/school/dashboard`

#### Dashboard
- [ ] View school dashboard
- [ ] Verify stats display (Open Positions, Total Applications)
- [ ] Check empty state when no jobs posted
- [ ] Test navigation:
  - [ ] Dashboard link
  - [ ] Post Job link (hash route)
  - [ ] My Jobs (same as dashboard)
  - [ ] Applications link (hash route)
  - [ ] Messages link
  - [ ] Settings link

#### Job Posting
- [ ] Click "Post Job" button
- [ ] Fill job posting form:
  - [ ] Job Title *
  - [ ] School Name *
  - [ ] Department *
  - [ ] Subject *
  - [ ] Grade Level *
  - [ ] Job Type *
  - [ ] Location *
  - [ ] Salary Range *
  - [ ] Job Description *
  - [ ] Requirements *
  - [ ] Benefits *
  - [ ] Teaching Archetypes (optional)
- [ ] Submit job
- [ ] Verify success message
- [ ] Check job appears in dashboard
- [ ] Verify job is active

#### Viewing Applications
- [ ] Navigate to Candidates/Applications tab
- [ ] View candidate list
- [ ] Test filters:
  - [ ] Status filter
  - [ ] Archetype filter
  - [ ] Grade level filter
- [ ] Test search functionality
- [ ] View candidate profile:
  - [ ] Click on candidate
  - [ ] View full profile
  - [ ] View resume
  - [ ] View portfolio
- [ ] Update candidate status:
  - [ ] Accept application
  - [ ] Reject application
  - [ ] Mark as reviewed
  - [ ] Schedule interview
- [ ] Verify status updates correctly

#### Job Management
- [ ] View posted jobs
- [ ] Edit job (if implemented)
- [ ] Deactivate job (if implemented)
- [ ] View job applications count

---

## 2. Cross-Browser Testing

### Chrome (Desktop)
- [ ] All pages load correctly
- [ ] All features work
- [ ] No console errors
- [ ] PWA install prompt appears
- [ ] Offline mode works

### Safari (Desktop & iOS)
- [ ] All pages load correctly
- [ ] All features work
- [ ] No console errors
- [ ] PWA install works (iOS)
- [ ] Touch interactions work

### Firefox (Desktop)
- [ ] All pages load correctly
- [ ] All features work
- [ ] No console errors
- [ ] Forms work correctly

### Edge (Desktop)
- [ ] All pages load correctly
- [ ] All features work
- [ ] No console errors

### Browser-Specific Issues to Check
- [ ] Date pickers work
- [ ] File uploads work
- [ ] CSS animations work
- [ ] JavaScript features work
- [ ] Service worker registration

---

## 3. Mobile Device Testing

### iOS Safari
- [ ] iPhone SE (320px width)
- [ ] iPhone 12/13 (390px width)
- [ ] iPad (768px+ width)
- [ ] All pages responsive
- [ ] Touch targets adequate (44px minimum)
- [ ] Forms usable
- [ ] Sidebar hamburger menu works
- [ ] Modals display correctly
- [ ] PWA install prompt
- [ ] Offline mode

### Android Chrome
- [ ] Small phone (360px width)
- [ ] Medium phone (375px width)
- [ ] Large phone (414px width)
- [ ] Tablet (768px+ width)
- [ ] All pages responsive
- [ ] Touch interactions work
- [ ] Forms usable
- [ ] PWA install
- [ ] Offline mode

### Mobile-Specific Tests
- [ ] Sidebar slides in/out smoothly
- [ ] Backdrop closes sidebar
- [ ] Hash routes scroll correctly
- [ ] Modals don't overflow viewport
- [ ] Input fields don't zoom on focus (if desired)
- [ ] Bottom navigation accessible
- [ ] Keyboard doesn't cover inputs

---

## 4. Performance Testing

### Lighthouse Audit
Run Lighthouse audit and verify:
- [ ] Performance: 90+
- [ ] Accessibility: 90+
- [ ] Best Practices: 90+
- [ ] SEO: 90+
- [ ] PWA: All checks pass

### Load Time Testing
- [ ] Initial page load: < 3s
- [ ] Time to Interactive: < 3.5s
- [ ] First Contentful Paint: < 1.8s
- [ ] Largest Contentful Paint: < 2.5s

### Network Testing
- [ ] Test on 3G connection
- [ ] Test on throttled connection
- [ ] Verify loading states show
- [ ] Verify error handling works
- [ ] Test offline mode

### Bundle Size
- [ ] Main bundle: < 500KB (gzipped)
- [ ] Total bundle: < 1MB (gzipped)
- [ ] Images optimized
- [ ] Code splitting working

---

## 5. Security Testing

### Authentication
- [ ] Login requires valid credentials
- [ ] Invalid credentials show error
- [ ] Session persists on refresh
- [ ] Logout clears session
- [ ] Protected routes redirect when not authenticated

### Authorization
- [ ] Teachers can't access school dashboard
- [ ] Schools can't access teacher dashboard
- [ ] Users can only see their own data
- [ ] RLS policies prevent unauthorized access

### Input Validation
- [ ] Forms validate required fields
- [ ] Email format validated
- [ ] Password strength enforced
- [ ] XSS attempts blocked
- [ ] SQL injection attempts blocked

### File Upload Security
- [ ] Only allowed file types accepted
- [ ] File size limits enforced
- [ ] Malicious files rejected
- [ ] Uploaded files stored securely

### RLS Policy Testing
- [ ] Teachers can only see their own applications
- [ ] Schools can only see applications for their jobs
- [ ] Users can only update their own profiles
- [ ] Messages only visible to participants

---

## 6. Real-Time Features Testing

### Notifications
- [ ] New notification appears in real-time
- [ ] Notification badge updates
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Notification click navigates correctly

### Messages
- [ ] New messages appear in real-time
- [ ] Message sent successfully
- [ ] Unread indicators work
- [ ] Conversation list updates

### Job Matches
- [ ] New matches appear automatically
- [ ] Match scores update
- [ ] Favorite status syncs

---

## 7. Error Handling Testing

### Network Errors
- [ ] Offline mode works
- [ ] Network error messages display
- [ ] Retry functionality works
- [ ] Graceful degradation

### Form Errors
- [ ] Validation errors display
- [ ] Required field errors
- [ ] Format errors (email, etc.)
- [ ] Server errors display

### 404/500 Errors
- [ ] 404 page displays for invalid routes
- [ ] 500 errors handled gracefully
- [ ] Error messages user-friendly

---

## Testing Results Template

### Test Date: __________
### Tester: __________
### Browser/Device: __________

#### End-to-End Tests
- Teacher Flow: [ ] Pass [ ] Fail [ ] Notes: __________
- School Flow: [ ] Pass [ ] Fail [ ] Notes: __________

#### Cross-Browser Tests
- Chrome: [ ] Pass [ ] Fail [ ] Notes: __________
- Safari: [ ] Pass [ ] Fail [ ] Notes: __________
- Firefox: [ ] Pass [ ] Fail [ ] Notes: __________
- Edge: [ ] Pass [ ] Fail [ ] Notes: __________

#### Mobile Tests
- iOS Safari: [ ] Pass [ ] Fail [ ] Notes: __________
- Android Chrome: [ ] Pass [ ] Fail [ ] Notes: __________

#### Performance
- Lighthouse Score: __________
- Load Time: __________
- Bundle Size: __________

#### Security
- Authentication: [ ] Pass [ ] Fail
- Authorization: [ ] Pass [ ] Fail
- Input Validation: [ ] Pass [ ] Fail

#### Issues Found
1. __________
2. __________
3. __________

---

## Next Steps After Testing

1. Document all issues found
2. Prioritize fixes (Critical, High, Medium, Low)
3. Fix critical issues first
4. Re-test after fixes
5. Update documentation with findings

