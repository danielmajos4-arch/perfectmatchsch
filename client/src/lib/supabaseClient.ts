import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("VITE_SUPABASE_ANON_KEY");

  const errorMessage = `
❌ Missing Supabase environment variables: ${missingVars.join(", ")}

To fix this:

1. Create a .env file in the project root (if it doesn't exist)
2. Add the following variables:
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

3. Get these values from your Supabase project:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to Settings → API
   - Copy the "Project URL" and "anon public" key

4. Restart your development server after adding the variables

Note: Vite requires environment variables to be prefixed with VITE_ to be exposed to the client.
  `.trim();

  throw new Error(errorMessage);
}

/**
 * Supabase client with PWA-optimized configuration
 * 
 * Auth options:
 * - persistSession: true - Keeps session in localStorage for offline/PWA access
 * - autoRefreshToken: true - Automatically refreshes tokens before expiry
 * - detectSessionInUrl: true - Handles OAuth callback URLs
 * - flowType: 'pkce' - More secure flow that works better with PWAs
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Use localStorage for session storage (works in PWA)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'perfectmatch-auth',
  },
  // Global fetch options for better error handling
  global: {
    fetch: async (url, options) => {
      try {
        const response = await fetch(url, {
          ...options,
          // Add timeout signal if not already present
          signal: options?.signal || AbortSignal.timeout(15000),
        });
        return response;
      } catch (error) {
        // Log fetch errors for debugging
        console.error('[Supabase] Fetch error:', error);
        throw error;
      }
    },
  },
});
