# Email Notification Setup Instructions

## ✅ Steps 1-3 Complete

### STEP 1: Environment Variables

**Action Required:** Update your `.env` file with the Resend API key:

```bash
# Add these to your .env file (create it if it doesn't exist)
RESEND_API_KEY=re_bkjgFFqF_BgGNYp26RLCgbL9gb6cGZcFt
VITE_RESEND_API_KEY=re_bkjgFFqF_BgGNYp26RLCgbL9gb6cGZcFt

# Email Configuration
VITE_FROM_EMAIL=noreply@perfectmatchschools.com
VITE_SUPPORT_EMAIL=support@perfectmatchschools.com
VITE_RESEND_FROM_EMAIL=noreply@perfectmatchschools.com
```

**Note:** The `.env` file is gitignored. A `.env.example` template has been created for reference.

### STEP 2: Resend Service Enhanced ✅

**File:** `client/src/lib/resendService.ts`

**Improvements Made:**
- ✅ Rate limiting (100 emails/minute)
- ✅ Retry logic with exponential backoff (max 3 attempts)
- ✅ Proper error handling and logging
- ✅ Support for plain text emails
- ✅ Email tags for tracking
- ✅ Reply-to support

**Key Functions:**
- `sendEmail(options: EmailOptions): Promise<EmailResult>` - Main email sending function
- `sendTemplateEmail(templateId, to, data)` - Template support (placeholder)

### STEP 3: Email Templates Complete ✅

**File:** `client/src/lib/emailTemplates.ts`

**Templates Created:**
1. ✅ **Application Submitted** - `applicationSubmittedTemplate()`
   - Teacher → School notification
   - Includes teacher details, match score, cover letter

2. ✅ **Application Status Update** - `applicationStatusUpdateTemplate()`
   - School → Teacher notification
   - Status-specific messaging (reviewed, contacted, shortlisted, hired, rejected)

3. ✅ **New Message** - `newMessageTemplate()`
   - Bidirectional notification
   - Message preview and conversation link

4. ✅ **Job Match** - `newJobMatchTemplate()` & `jobMatchDigestTemplate()`
   - System → Teacher
   - Single match or digest format

5. ✅ **Candidate Match** - `newCandidateMatchTemplate()`
   - System → School
   - Candidate recommendations

6. ✅ **Saved Search Alert** - `savedSearchAlertTemplate()`
   - System → Teacher
   - Matching jobs from saved search

**Template Features:**
- ✅ Mobile-responsive HTML
- ✅ Inline CSS (email client compatible)
- ✅ Updated brand colors (Indigo/Purple theme)
- ✅ Plain text fallback support
- ✅ Unsubscribe and preferences links

### STEP 4: Email Notification Service Enhanced ✅

**File:** `client/src/lib/emailNotificationService.ts`

**Trigger Functions Added:**
1. ✅ `sendApplicationSubmittedEmail(applicationId)` - When teacher applies
2. ✅ `sendApplicationStatusEmail(applicationId, newStatus)` - When status changes
3. ✅ `sendNewMessageEmail(messageId)` - When new message sent
4. ✅ `sendJobMatchEmail(teacherId, jobIds)` - Job matches (via digest)
5. ✅ `sendCandidateMatchEmail(schoolId, teacherIds)` - Candidate matches (via digest)
6. ✅ `sendSavedSearchAlertEmail(searchId, newJobIds)` - Saved search alerts

---

## 🧪 Testing Instructions

### 1. Local Testing Setup

1. **Add API Key to .env:**
   ```bash
   # In project root, create/update .env file
   VITE_RESEND_API_KEY=re_bkjgFFqF_BgGNYp26RLCgbL9gb6cGZcFt
   VITE_FROM_EMAIL=noreply@perfectmatchschools.com
   ```

2. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

### 2. Test Basic Email Sending

**Option A: Use Browser Console**
```javascript
// In browser console after logging in
import { sendEmail } from './lib/resendService';

await sendEmail({
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: '<h1>Test</h1><p>This is a test email from PerfectMatchSchools.</p>',
  text: 'Test - This is a test email from PerfectMatchSchools.'
});
```

**Option B: Create Test Component**
Create a temporary test button in a page to trigger email sending.

### 3. Test Email Templates

**Test Application Submitted Email:**
```javascript
import { applicationSubmittedTemplate, replaceTemplateVariables } from './lib/emailTemplates';
import { sendEmail } from './lib/resendService';

const html = applicationSubmittedTemplate({
  schoolName: 'Test School',
  teacherName: 'John Doe',
  jobTitle: 'Math Teacher',
  teacherEmail: 'john@example.com',
  matchScore: 85,
  dashboardUrl: 'http://localhost:5000/school/dashboard'
});

await sendEmail({
  to: 'test@example.com',
  subject: 'New Application: John Doe for Math Teacher',
  html: replaceTemplateVariables(html, {
    unsubscribe_url: 'http://localhost:5000/settings?tab=email',
    preferences_url: 'http://localhost:5000/settings?tab=email'
  })
});
```

### 4. Test Trigger Functions

**Test Application Submitted:**
```javascript
import { sendApplicationSubmittedEmail } from './lib/emailNotificationService';

// After creating an application
await sendApplicationSubmittedEmail('application-id-here');
```

**Test Application Status:**
```javascript
import { sendApplicationStatusEmail } from './lib/emailNotificationService';

// After updating application status
await sendApplicationStatusEmail('application-id-here', 'under_review');
```

### 5. Verify Email Delivery

1. Check your inbox (and spam folder)
2. Verify email renders correctly in:
   - Gmail (web and mobile)
   - Outlook
   - Apple Mail
3. Test links work correctly
4. Verify unsubscribe link works

---

## 📋 Next Steps (Steps 4-10)

After verifying Steps 1-3 work correctly:

1. **Step 4:** Create database triggers for automatic emails
2. **Step 5:** Build email testing dashboard
3. **Step 6:** Implement email queue system
4. **Step 7:** Add email logs table
5. **Step 8:** Update Settings page with email preferences
6. **Step 9:** Add error handling and monitoring
7. **Step 10:** Create comprehensive documentation

---

## 🔧 Configuration

### Rate Limits

Current settings:
- **Max emails per minute:** 100 (Resend free tier)
- **Retry attempts:** 3
- **Retry delay:** Exponential backoff (1s, 2s, 4s)

To adjust, edit `client/src/lib/resendService.ts`:
```typescript
const MAX_EMAILS_PER_MINUTE = 100; // Adjust as needed
const MAX_RETRY_ATTEMPTS = 3; // Adjust as needed
```

### Email From Address

Update in `.env`:
```bash
VITE_FROM_EMAIL=noreply@perfectmatchschools.com
```

**Important:** You must verify this domain in Resend dashboard before sending emails.

---

## 🐛 Troubleshooting

### Email Not Sending

1. **Check API Key:**
   - Verify `VITE_RESEND_API_KEY` is set in `.env`
   - Restart dev server after adding key

2. **Check Console:**
   - Look for `[Resend]` log messages
   - Check for error messages

3. **Verify Domain:**
   - Domain must be verified in Resend dashboard
   - Use verified domain in `VITE_FROM_EMAIL`

### Rate Limit Errors

- Reduce email sending frequency
- Implement queue system (Step 6)
- Upgrade Resend plan if needed

### Email in Spam

- Verify domain in Resend
- Use proper SPF/DKIM records
- Avoid spam trigger words
- Include unsubscribe link

---

## ✅ Verification Checklist

- [ ] API key added to `.env`
- [ ] Dev server restarted
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] Email renders correctly
- [ ] Links work properly
- [ ] Unsubscribe link works
- [ ] Templates look good in multiple email clients

---

**Status:** Steps 1-3 Complete ✅  
**Ready for:** Testing and verification before proceeding to Steps 4-10

