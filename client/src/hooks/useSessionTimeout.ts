import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_DURATION = 5 * 60 * 1000; // 5 minutes before timeout

export function useSessionTimeout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }
  };

  const resetTimer = useCallback(() => {
    clearTimers();

    warningRef.current = window.setTimeout(() => {
      toast({
        title: 'Session expiring soon',
        description: 'Your session will expire in 5 minutes due to inactivity.',
      });
    }, TIMEOUT_DURATION - WARNING_DURATION);

    timeoutRef.current = window.setTimeout(async () => {
      await supabase.auth.signOut();
      toast({
        title: 'Session expired',
        description: 'You have been logged out due to inactivity.',
        variant: 'destructive',
      });
      setLocation('/login');
    }, TIMEOUT_DURATION);
  }, [setLocation, toast]);

  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => document.addEventListener(event, handleActivity));
    resetTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      clearTimers();
    };
  }, [resetTimer]);

  return { resetTimer };
}
