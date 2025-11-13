# Email Testing Guide - Task 1.9

## 🎯 Testing Checklist

Complete all tests to verify email notification functionality works correctly.

---

## ✅ **Test 1: Email Notification Types**

### 1.1 New Candidate Match Email (School)
**Trigger**: New candidate matched to a job posting

**Steps**:
1. Create a school account and post a job
2. Create a teacher account with matching archetype tags
3. Wait for matching system to create candidate match
4. Check email inbox

**Verify**:
- [ ] Email received within 1 minute
- [ ] Subject line: "X New Candidate(s) Matched to Your Job"
- [ ] Email contains:
  - [ ] School name
  - [ ] Job title
  - [ ] Candidate count
  - [ ] "View Candidates" button
  - [ ] Unsubscribe link
- [ ] Button links to `/school/dashboard`
- [ ] Email is responsive (test on mobile email client)

**Test Data**:
- School: `test-school@example.com`
- Job: "Elementary Math Teacher"
- Teacher: `test-teacher@example.com` with matching archetype

---

### 1.2 New Job Match Email (Teacher) - Single
**Trigger**: New job matched to teacher profile

**Steps**:
1. Create a teacher account with archetype tags
2. Post a job with matching archetype tags
3. Wait for matching system to create job match
4. Check email inbox

**Verify**:
- [ ] Email received within 1 minute
- [ ] Subject line: "1 New Job Match for You"
- [ ] Email contains:
  - [ ] Teacher name
  - [ ] Job title
  - [ ] School name
  - [ ] Location
  - [ ] Match score
  - [ ] Match reason
  - [ ] "View Job Details" button
- [ ] Button links to job detail page
- [ ] Email is responsive

---

### 1.3 New Job Match Email (Teacher) - Digest
**Trigger**: Multiple jobs matched (daily digest)

**Steps**:
1. Create a teacher account
2. Post multiple jobs with matching archetype tags
3. Wait for matching system to create matches
4. Wait for digest to be sent (or trigger manually)
5. Check email inbox

**Verify**:
- [ ] Email received
- [ ] Subject line: "X New Job Matches for You"
- [ ] Email contains:
  - [ ] Teacher name
  - [ ] List of all matched jobs
  - [ ] Each job shows: title, school, location, match score
  - [ ] "View All Matches" button
- [ ] Button links to `/teacher/dashboard`
- [ ] Email is responsive

---

### 1.4 Application Status Update Email (Teacher)
**Trigger**: School updates application status

**Steps**:
1. Teacher applies to a job
2. School updates application status (reviewed, contacted, shortlisted, hired, rejected)
3. Check email inbox

**Verify**:
- [ ] Email received
- [ ] Subject line: "Application Status Update"
- [ ] Email contains:
  - [ ] Teacher name
  - [ ] Job title
  - [ ] School name
  - [ ] New status (with appropriate color)
  - [ ] Optional message from school
  - [ ] "View Application" button
- [ ] Status-specific messaging is correct
- [ ] Button links to dashboard

**Test All Statuses**:
- [ ] Reviewed (blue)
- [ ] Contacted (blue)
- [ ] Shortlisted (green)
- [ ] Hired (green)
- [ ] Rejected (gray)

---

### 1.5 Welcome Email (New User)
**Trigger**: User completes registration

**Steps**:
1. Register a new user (teacher or school)
2. Check email inbox

**Verify**:
- [ ] Email received
- [ ] Subject line: "Welcome to Perfect Match Schools!"
- [ ] Email contains:
  - [ ] User name
  - [ ] Role-specific welcome message
  - [ ] "Complete Your Profile" button
- [ ] Button links to onboarding page
- [ ] Email is responsive

---

### 1.6 Daily/Weekly Digest Email
**Trigger**: Scheduled digest (daily at 9 AM or weekly on selected day)

**Steps**:
1. Set user preferences to receive digest
2. Wait for scheduled time OR trigger manually
3. Check email inbox

**Verify**:
- [ ] Email received at scheduled time
- [ ] Subject line: "Your Weekly/Daily Summary"
- [ ] Email contains:
  - [ ] User name
  - [ ] Summary of activity:
    - [ ] New matches (for teachers)
    - [ ] New candidates (for schools)
    - [ ] Application updates
    - [ ] New messages
  - [ ] "View Dashboard" button
- [ ] Button links to appropriate dashboard
- [ ] Email is responsive

---

## ✅ **Test 2: Email Preferences**

### 2.1 Master Toggle
**Test**: Enable/disable all email notifications

**Steps**:
1. Go to Settings → Email tab
2. Toggle "Email Notifications" OFF
3. Trigger a notification (post job, match candidate, etc.)
4. Check email inbox

**Verify**:
- [ ] No email received
- [ ] Notification created in database but marked as cancelled
- [ ] Toggle back ON
- [ ] New notifications are received

---

### 2.2 Individual Notification Types
**Test**: Enable/disable specific notification types

**Steps**:
1. Go to Settings → Email tab
2. Disable "New Candidate Matches" (for schools)
3. Trigger candidate match
4. Check email inbox
5. Re-enable and verify it works

**Verify Each Type**:
- [ ] New Candidate Matches (schools)
- [ ] New Job Matches (teachers)
- [ ] Application Updates (teachers)
- [ ] Digest (both roles)

---

### 2.3 Digest Scheduling
**Test**: Digest frequency and timing

**Steps**:
1. Go to Settings → Email tab
2. Enable "Email Digest"
3. Set frequency to "Daily"
4. Set time to current time + 1 minute (for testing)
5. Wait and check email

**Verify**:
- [ ] Daily digest sent at specified time
- [ ] Weekly digest sent on specified day at specified time
- [ ] "Never" option disables digest

**Test Frequencies**:
- [ ] Daily
- [ ] Weekly (test different days)
- [ ] Never

---

## ✅ **Test 3: Unsubscribe Functionality**

### 3.1 Unsubscribe from Email Link
**Test**: One-click unsubscribe from email footer

**Steps**:
1. Receive an email notification
2. Click "Unsubscribe" link in email footer
3. Verify redirect to settings page
4. Check email preferences

**Verify**:
- [ ] Redirected to `/settings?tab=email&action=unsubscribe`
- [ ] All email notifications disabled
- [ ] Success message displayed
- [ ] No more emails received

---

### 3.2 Unsubscribe by Token
**Test**: Direct unsubscribe via token

**Steps**:
1. Get unsubscribe token from database:
   ```sql
   SELECT unsubscribe_token FROM user_email_preferences WHERE user_id = '...';
   ```
2. Visit: `/settings?tab=email&action=unsubscribe&token=TOKEN`
3. Verify unsubscribe

**Verify**:
- [ ] Unsubscribe successful
- [ ] All notifications disabled
- [ ] Token is valid (not expired)

---

### 3.3 Resubscribe
**Test**: Re-enable email notifications

**Steps**:
1. After unsubscribing, go to Settings
2. Toggle "Email Notifications" ON
3. Verify preferences saved
4. Trigger a notification

**Verify**:
- [ ] Preferences saved
- [ ] Email notifications re-enabled
- [ ] New emails received

---

## ✅ **Test 4: Email Delivery & Spam**

### 4.1 Email Delivery
**Test**: Emails are actually sent

**Steps**:
1. Trigger a notification
2. Check email inbox (including spam folder)
3. Check Resend dashboard for delivery status

**Verify**:
- [ ] Email appears in inbox
- [ ] Not in spam folder
- [ ] Delivery status shows "delivered"
- [ ] No bounce errors

---

### 4.2 Email Client Compatibility
**Test**: Emails render correctly in different clients

**Test Clients**:
- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Outlook (web)
- [ ] Outlook (desktop)
- [ ] Apple Mail (iOS)
- [ ] Apple Mail (macOS)
- [ ] Yahoo Mail

**Verify for Each**:
- [ ] Email renders correctly
- [ ] Images display (if added)
- [ ] Buttons are clickable
- [ ] Links work
- [ ] Responsive on mobile

---

### 4.3 Email Template Rendering
**Test**: Templates render correctly

**Verify**:
- [ ] Brand colors display correctly
- [ ] Gradient header renders
- [ ] Text is readable
- [ ] Buttons are styled correctly
- [ ] Footer links work
- [ ] No broken HTML

---

## ✅ **Test 5: Database Integration**

### 5.1 Notification Queue
**Test**: Notifications are created in queue

**Steps**:
1. Trigger a notification event
2. Check `email_notifications` table:
   ```sql
   SELECT * FROM email_notifications 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

**Verify**:
- [ ] Notification created with correct type
- [ ] Recipient email is correct
- [ ] Template data is correct
- [ ] Status is "pending"

---

### 5.2 Notification Processing
**Test**: Notifications are processed and sent

**Steps**:
1. Create a notification in queue
2. Wait for processor to run (or trigger manually)
3. Check notification status

**Verify**:
- [ ] Status changes from "pending" to "sent"
- [ ] `sent_at` timestamp is set
- [ ] Email is actually sent
- [ ] Failed notifications have error message

---

### 5.3 Preference Checking
**Test**: Preferences are checked before sending

**Steps**:
1. Disable a notification type in preferences
2. Trigger that notification type
3. Check notification queue

**Verify**:
- [ ] Notification created
- [ ] Status is "cancelled" (not "pending")
- [ ] Email not sent
- [ ] Preference check works correctly

---

## 🛠️ **Testing Tools**

### Manual Testing
1. **Supabase SQL Editor**: Check database tables
2. **Resend Dashboard**: Check email delivery status
3. **Email Client**: Check inbox/spam
4. **Browser DevTools**: Check network requests

### Automated Testing (Future)
- Unit tests for email templates
- Integration tests for notification service
- E2E tests for unsubscribe flow

---

## 📊 **Test Results Template**

```
Date: ___________
Tester: ___________
Environment: ___________

Email Types:
- New Candidate Match: [ ] Pass [ ] Fail
- New Job Match (Single): [ ] Pass [ ] Fail
- New Job Match (Digest): [ ] Pass [ ] Fail
- Application Status Update: [ ] Pass [ ] Fail
- Welcome Email: [ ] Pass [ ] Fail
- Digest Email: [ ] Pass [ ] Fail

Email Preferences:
- Master Toggle: [ ] Pass [ ] Fail
- Individual Toggles: [ ] Pass [ ] Fail
- Digest Scheduling: [ ] Pass [ ] Fail

Unsubscribe:
- Email Link: [ ] Pass [ ] Fail
- Token Link: [ ] Pass [ ] Fail
- Resubscribe: [ ] Pass [ ] Fail

Email Delivery:
- Delivery Success: [ ] Pass [ ] Fail
- Spam Check: [ ] Pass [ ] Fail
- Client Compatibility: [ ] Pass [ ] Fail

Database:
- Queue Creation: [ ] Pass [ ] Fail
- Processing: [ ] Pass [ ] Fail
- Preference Checking: [ ] Pass [ ] Fail

Issues Found:
_______________________________________
_______________________________________
_______________________________________
```

---

## 🐛 **Common Issues & Solutions**

### Issue: Emails Not Sending
**Possible Causes**:
- Resend API key not configured
- Email processor not running
- Preferences disabled
- Invalid email addresses

**Solutions**:
- Check `.env` for `VITE_RESEND_API_KEY`
- Verify processor is running in production
- Check user preferences
- Verify email addresses are valid

### Issue: Emails in Spam
**Solutions**:
- Verify SPF/DKIM records for domain
- Use verified sender email
- Avoid spam trigger words
- Test with different email providers

### Issue: Templates Not Rendering
**Solutions**:
- Check HTML syntax
- Test in different email clients
- Verify inline styles
- Check for broken links

### Issue: Preferences Not Working
**Solutions**:
- Verify database functions exist
- Check RLS policies
- Verify preference checking in triggers
- Check notification service filtering

---

## ✅ **Success Criteria**

All tests should pass:
- [x] All email types send correctly
- [x] Email preferences work
- [x] Unsubscribe works
- [x] Emails deliver successfully
- [x] Templates render correctly
- [x] Database integration works

---

## 🚀 **Next Steps After Testing**

Once all tests pass:
- ✅ Task 1.9 Complete
- ⏭️ Phase 1.2 (Email Notifications) Complete
- ⏭️ Move to Phase 2: Engagement & Gamification

---

**Happy Testing! 📧🧪**

