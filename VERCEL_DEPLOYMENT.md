# Vercel Deployment Configuration

This document describes the Vercel deployment setup for PerfectMatchSchools.

## Files Created

### 1. `vercel.json`
- Configures Vercel build and routing
- Sets output directory to `dist/public` (Vite build output)
- Configures rewrites for SPA routing and API routes
- Sets CORS headers for API endpoints
- Configures serverless function timeout (10 seconds)

### 2. `api/send-email.js`
- Serverless function for sending emails via Resend
- Handles POST requests to `/api/send-email`
- Includes CORS support
- Uses environment variables for configuration

### 3. `.vercelignore`
- Excludes unnecessary files from deployment
- Reduces deployment size and build time

### 4. `package.json` Updates
- Added `vercel-build` script that runs `vite build`
- `resend` is already in dependencies (✅ verified)

## Environment Variables Required in Vercel

Set these in your Vercel project settings (Settings → Environment Variables):

### Required:
- `VITE_RESEND_API_KEY` - Your Resend API key
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional (with defaults):
- `VITE_FROM_EMAIL` or `VITE_RESEND_FROM_EMAIL` - Default: `onboarding@resend.dev`
- `VITE_SUPPORT_EMAIL` - Default: `delivered@resend.dev`

### Note on VITE_ Prefix
- Vite only exposes environment variables prefixed with `VITE_` to the client
- Vercel will inject these variables during build and runtime
- The serverless function can access both `VITE_*` and non-prefixed variables

## Deployment Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```

4. **Set environment variables** in Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add all required variables listed above

5. **Deploy**:
   ```bash
   vercel --prod
   ```

   Or push to your connected Git repository (Vercel will auto-deploy)

## How It Works

### Frontend
- Vite builds the React app to `dist/public`
- Vercel serves static files from this directory
- SPA routing is handled by the rewrite rule (`/*` → `/index.html`)

### API Endpoints
- Serverless functions in `/api` directory are automatically deployed
- `/api/send-email` is handled by `api/send-email.js`
- Function has 10-second timeout (configurable in `vercel.json`)

### Environment Variables
- Client-side code accesses `import.meta.env.VITE_*` variables
- Serverless functions access `process.env.VITE_*` or `process.env.*`
- Vercel injects variables at build time and runtime

## Testing After Deployment

1. **Frontend**: Visit your Vercel deployment URL
2. **API Endpoint**: Test `/api/send-email` endpoint
3. **Environment Variables**: Verify all variables are accessible
4. **CORS**: Check that API calls work from the frontend

## Troubleshooting

### Build Fails
- Check that all dependencies are in `dependencies` (not `devDependencies`)
- Verify `vercel-build` script exists in `package.json`
- Check build logs in Vercel dashboard

### API Endpoint Not Working
- Verify `api/send-email.js` exists
- Check function logs in Vercel dashboard
- Verify environment variables are set correctly

### Environment Variables Not Available
- Ensure variables are prefixed with `VITE_` for client-side
- Check that variables are set in Vercel project settings
- Redeploy after adding new environment variables

### CORS Issues
- CORS headers are configured in `vercel.json`
- API function also sets CORS headers
- Check browser console for specific CORS errors

## Local Development

The existing `server/index.ts` setup remains for local development:
- Run `npm run dev` for local development
- Express server handles `/api/send-email` locally
- Vercel serverless function handles it in production

Both implementations use the same logic and environment variables.

