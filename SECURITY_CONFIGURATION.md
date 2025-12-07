# Security Configuration Guide

This document outlines the security measures implemented in Perfect Match Schools and provides configuration instructions.

## Security Features Implemented

### 1. CORS Configuration
**Files:** `vercel.json`, `api/send-email.js`

CORS is now restricted to specific origins instead of using wildcards.

**Configuration:**
Set these environment variables in Vercel:
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PRODUCTION_URL=https://yourdomain.com
```

The system automatically includes:
- `localhost:5173` and `localhost:3000` for development
- Your Vercel deployment URL (`VERCEL_URL`)

### 2. Security Headers
**File:** `vercel.json`

The following security headers are applied to all routes:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Prevents clickjacking attacks |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Enforces HTTPS |
| X-XSS-Protection | 1; mode=block | Legacy XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer info |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Restricts browser features |

### 3. API Authentication
**File:** `api/send-email.js`

The email API endpoint requires Supabase JWT authentication.

**Required Environment Variables:**
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** Never expose the service role key to the client. It should only be used server-side.

### 4. Rate Limiting
**File:** `api/send-email.js`

Email API is rate limited to prevent abuse:
- **Limit:** 10 requests per minute per user
- **Response Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

For production with high traffic, consider upgrading to Upstash Redis for persistent rate limiting.

### 5. Admin RLS Policies
**File:** `supabase-migrations/admin_rls_policies.sql`

Database-level admin access control using Row Level Security.

**To apply:**
1. Go to Supabase Dashboard > SQL Editor
2. Run the `admin_rls_policies.sql` script
3. Verify policies were created successfully

**Creating Admin Users:**
Admin users must have `role = 'admin'` in the `users` table. Only create admin accounts through secure processes.

## Environment Variables Checklist

### Required for Production

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only service role key |
| `VITE_RESEND_API_KEY` or `RESEND_API_KEY` | Resend email API key |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins |
| `PRODUCTION_URL` | Your production domain URL |

### Optional

| Variable | Description |
|----------|-------------|
| `VITE_FROM_EMAIL` | Email sender address |
| `VITE_SUPPORT_EMAIL` | Support reply-to address |

## Security Best Practices

### Do
- Keep all dependencies updated
- Use environment variables for secrets
- Enable RLS on all Supabase tables
- Regularly audit user permissions
- Monitor rate limit violations
- Use HTTPS everywhere

### Don't
- Expose service role keys to the client
- Store sensitive data in localStorage
- Log sensitive information in production
- Use wildcard CORS in production
- Disable security headers

## Monitoring Recommendations

1. **Rate Limit Monitoring**: Watch for 429 responses in your logs
2. **Auth Failures**: Monitor 401 responses for potential attacks
3. **Admin Actions**: Consider adding audit logging for admin operations
4. **Error Rates**: Track 500 errors for potential security issues

## Updating Security Configuration

### Adding a New Allowed Origin
1. Update `ALLOWED_ORIGINS` in Vercel environment variables
2. Redeploy the application

### Adjusting Rate Limits
Edit `api/send-email.js`:
```javascript
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // Window in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window
```

### Adding New Admin Policies
Add to `supabase-migrations/admin_rls_policies.sql` and run in Supabase SQL Editor.

## Incident Response

If you suspect a security breach:

1. **Rotate Keys**: Generate new Supabase and Resend API keys
2. **Review Logs**: Check Vercel and Supabase logs for suspicious activity
3. **Audit Users**: Review admin accounts and recent user registrations
4. **Update Origins**: Ensure CORS is properly configured
5. **Notify Users**: If user data was affected, follow data breach protocols
