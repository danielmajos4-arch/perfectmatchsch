# PerfectMatchSchools - Deployment Guide

## Overview
This guide covers deploying PerfectMatchSchools to production.

---

## Prerequisites

### Required Accounts
- [ ] Supabase account and project
- [ ] Hosting provider account (Vercel, Netlify, Railway, etc.)
- [ ] Domain name (optional but recommended)

### Required Information
- Supabase Project URL
- Supabase Anon Key
- Resend API Key (for email notifications, optional)

---

## Pre-Deployment Checklist

### Code
- [ ] All features tested
- [ ] No TypeScript errors (`npm run check`)
- [ ] No linter errors
- [ ] Build succeeds (`npm run build`)
- [ ] All environment variables documented

### Database
- [ ] Database schema deployed
- [ ] RLS policies enabled
- [ ] Triggers created
- [ ] Functions created
- [ ] Indexes created
- [ ] Test data removed (if any)

### Configuration
- [ ] Environment variables set
- [ ] CORS configured in Supabase
- [ ] Storage buckets created
- [ ] Email service configured (if using)

---

## Step 1: Database Setup

### 1.1 Deploy Schema

1. Go to Supabase Dashboard → SQL Editor
2. Run schema files in this order:
   - `supabase-schema-fixed.sql` (core tables)
   - `sprint6-matching-schema.sql` (matching tables, if using)
   - `ACHIEVEMENTS_SCHEMA.sql` (achievements, if using)
   - `EMAIL_NOTIFICATIONS_SCHEMA.sql` (email notifications)
   - `IN_APP_NOTIFICATIONS_SCHEMA.sql` (in-app notifications)
   - `SAVED_SEARCHES_SCHEMA.sql` (saved searches)

3. Verify all tables created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

### 1.2 Verify RLS Policies

1. Go to Supabase Dashboard → Authentication → Policies
2. Verify RLS is enabled on all tables
3. Test policies with test queries

### 1.3 Create Storage Buckets

1. Go to Supabase Dashboard → Storage
2. Create buckets:
   - `resumes` (public: false)
   - `profile-photos` (public: true)
   - `school-logos` (public: true)
   - `portfolios` (public: true)

3. Set bucket policies:
   - Users can upload to their own folder
   - Public can read profile photos and logos
   - Only authenticated users can read resumes

---

## Step 2: Environment Configuration

### 2.1 Supabase Configuration

1. Get your Supabase credentials:
   - Go to Supabase Dashboard → Settings → API
   - Copy **Project URL**
   - Copy **anon public** key

2. Configure CORS:
   - Go to Settings → API
   - Add your production domain to allowed origins
   - Add `https://yourdomain.com` and `https://www.yourdomain.com`

### 2.2 Environment Variables

Set these in your hosting provider:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email (Optional)
VITE_RESEND_API_KEY=your-resend-key
VITE_RESEND_FROM_EMAIL=noreply@perfectmatchschools.com

# Environment
NODE_ENV=production
PORT=5000
```

---

## Step 3: Build Application

### 3.1 Local Build Test

```bash
# Install dependencies
npm install

# Run type check
npm run check

# Build for production
npm run build

# Test production build locally
npm start
```

### 3.2 Verify Build

- [ ] Build completes without errors
- [ ] No console errors in browser
- [ ] All pages load
- [ ] Assets load correctly
- [ ] Service worker registers (if PWA)

---

## Step 4: Deploy to Hosting

### Option A: Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required variables

4. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist/public`
   - Install Command: `npm install`

### Option B: Netlify

1. **Create `netlify.toml`**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist/public"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy**
   - Connect repository to Netlify
   - Set environment variables
   - Deploy

### Option C: Railway

1. **Create `railway.json`**
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Deploy**
   - Connect repository
   - Set environment variables
   - Deploy

### Option D: Custom Server

1. **Build**
   ```bash
   npm run build
   ```

2. **Upload Files**
   - Upload `dist/` directory to server
   - Upload `package.json`
   - Upload `node_modules` or run `npm install --production`

3. **Start Server**
   ```bash
   npm start
   ```

4. **Set Up Process Manager**
   - Use PM2: `pm2 start dist/index.js`
   - Or systemd service
   - Or Docker container

---

## Step 5: Post-Deployment Verification

### 5.1 Basic Checks

- [ ] Application loads
- [ ] No console errors
- [ ] Authentication works
- [ ] Database connection works
- [ ] Real-time features work

### 5.2 Feature Testing

- [ ] User registration
- [ ] User login
- [ ] Job posting (schools)
- [ ] Job browsing (teachers)
- [ ] Application submission
- [ ] Messaging
- [ ] Notifications

### 5.3 Performance Checks

- [ ] Run Lighthouse audit
- [ ] Check load times
- [ ] Verify bundle size
- [ ] Test on mobile
- [ ] Test offline mode (PWA)

---

## Step 6: Monitoring Setup

### 6.1 Error Monitoring

Set up error tracking (optional but recommended):
- **Sentry**: Error tracking and monitoring
- **LogRocket**: Session replay and error tracking
- **Supabase Logs**: Built-in error logs

### 6.2 Analytics

Set up analytics (optional):
- **Google Analytics**: User behavior
- **Plausible**: Privacy-friendly analytics
- **Supabase Analytics**: Built-in analytics

### 6.3 Uptime Monitoring

Set up uptime monitoring:
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring
- **StatusCake**: Monitoring and alerts

---

## Step 7: Domain & SSL

### 7.1 Domain Configuration

1. **Add Domain to Hosting**
   - Configure DNS records
   - Point domain to hosting provider

2. **SSL Certificate**
   - Most hosting providers provide free SSL
   - Enable HTTPS redirect
   - Verify certificate is valid

### 7.2 Update Supabase CORS

1. Add production domain to Supabase CORS settings
2. Update allowed origins
3. Test API calls from production domain

---

## Step 8: Database Migrations

### 8.1 Migration Strategy

For future schema changes:

1. **Create Migration File**
   ```sql
   -- migrations/001_add_column.sql
   ALTER TABLE jobs ADD COLUMN new_column TEXT;
   ```

2. **Test Locally**
   - Run migration on local Supabase
   - Test application
   - Verify no breaking changes

3. **Deploy to Production**
   - Run migration in production Supabase SQL Editor
   - Verify migration succeeded
   - Test application

### 8.2 Rollback Plan

Always have a rollback plan:
- Keep previous schema file
- Document migration steps
- Test rollback procedure

---

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
VITE_SUPABASE_URL=your-dev-url
VITE_SUPABASE_ANON_KEY=your-dev-key
```

### Staging
```env
NODE_ENV=production
VITE_SUPABASE_URL=your-staging-url
VITE_SUPABASE_ANON_KEY=your-staging-key
```

### Production
```env
NODE_ENV=production
VITE_SUPABASE_URL=your-prod-url
VITE_SUPABASE_ANON_KEY=your-prod-key
```

---

## Troubleshooting

### Build Fails

**Issue**: Build errors
**Solution**:
- Check TypeScript errors: `npm run check`
- Check linter errors
- Verify all dependencies installed
- Check Node.js version compatibility

### Database Connection Fails

**Issue**: Can't connect to Supabase
**Solution**:
- Verify environment variables set correctly
- Check Supabase project is active
- Verify CORS settings
- Check network connectivity

### RLS Policy Errors

**Issue**: "RLS policy violation"
**Solution**:
- Verify RLS policies are enabled
- Check policy conditions
- Verify user is authenticated
- Check user role matches policy

### Real-time Not Working

**Issue**: Real-time updates not appearing
**Solution**:
- Verify Supabase Realtime is enabled
- Check channel subscriptions
- Verify RLS policies allow reads
- Check browser console for errors

### Service Worker Not Registering

**Issue**: PWA features not working
**Solution**:
- Verify HTTPS is enabled (required)
- Check service worker file exists
- Verify service worker path is correct
- Check browser console for errors

---

## Rollback Procedure

If deployment fails:

1. **Revert Code**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Revert Database** (if needed)
   - Run rollback migration
   - Or restore from backup

3. **Verify Rollback**
   - Test application
   - Verify features work
   - Check error logs

---

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **As needed**: Database backups

### Updates

1. **Test Locally**
   - Pull latest changes
   - Test features
   - Run tests

2. **Deploy to Staging** (if available)
   - Deploy changes
   - Test thoroughly
   - Get approval

3. **Deploy to Production**
   - Deploy during low-traffic period
   - Monitor for errors
   - Have rollback plan ready

---

## Security Checklist

- [ ] Environment variables secured
- [ ] API keys not in code
- [ ] RLS policies enabled
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Input validation in place
- [ ] File uploads secured
- [ ] Rate limiting (if applicable)
- [ ] Error messages don't leak sensitive info

---

## Performance Optimization

### Build Optimization
- [ ] Code splitting enabled
- [ ] Tree shaking working
- [ ] Images optimized
- [ ] Bundle size minimized

### Runtime Optimization
- [ ] Lazy loading components
- [ ] Query caching working
- [ ] Service worker caching
- [ ] CDN for static assets

---

## Support & Resources

### Documentation
- This deployment guide
- Developer guide
- User guides
- API documentation

### Support Channels
- GitHub Issues
- Email support
- Documentation site

---

**Last Updated**: Phase 5 Implementation
**Version**: 1.0.0

