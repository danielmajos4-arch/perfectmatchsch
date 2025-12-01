/**
 * Email Trigger Initializer
 * 
 * Initializes email notification triggers when user is authenticated
 * This component doesn't render anything - it just manages the email triggers lifecycle
 * 
 * NOTE: Only runs in production to prevent sending test emails during development
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initializeEmailTriggers, cleanupEmailTriggers } from '@/lib/emailTriggers';

export function EmailTriggerInitializer() {
  const { user, loading } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    // Don't initialize in development mode to prevent sending test emails
    if (!import.meta.env.PROD) {
      if (!initialized.current) {
        console.log('[EmailTriggers] Disabled in development mode');
        initialized.current = true; // Prevent repeated logs
      }
      return;
    }

    // Only initialize when user is authenticated and auth is done loading
    if (!loading && user && !initialized.current) {
      console.log('[EmailTriggers] Initializing for authenticated user (production)');
      initializeEmailTriggers();
      initialized.current = true;
    }

    // Cleanup when user logs out
    if (!loading && !user && initialized.current) {
      console.log('[EmailTriggers] Cleaning up - user logged out');
      cleanupEmailTriggers();
      initialized.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (initialized.current && import.meta.env.PROD) {
        cleanupEmailTriggers();
        initialized.current = false;
      }
    };
  }, [user, loading]);

  // This component doesn't render anything
  return null;
}

