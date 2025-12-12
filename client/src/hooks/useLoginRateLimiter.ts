import { useEffect, useState } from 'react';

interface LoginAttempt {
  email: string;
  timestamp: number;
  count: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'login_attempts';

export function useLoginRateLimiter() {
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    checkLockStatus();

    if (isLocked && remainingTime > 0) {
      const timer = setInterval(() => {
        const remaining = getRemainingLockTime();
        if (remaining <= 0) {
          unlockAccount();
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLocked, remainingTime]);

  const getStoredAttempts = (): LoginAttempt | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const checkLockStatus = () => {
    const attempts = getStoredAttempts();
    if (!attempts) return;

    const timeSinceLastAttempt = Date.now() - attempts.timestamp;
    if (attempts.count >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION) {
      setIsLocked(true);
      setRemainingTime(LOCKOUT_DURATION - timeSinceLastAttempt);
    }
  };

  const getRemainingLockTime = (): number => {
    const attempts = getStoredAttempts();
    if (!attempts) return 0;

    const timeSinceLastAttempt = Date.now() - attempts.timestamp;
    const remaining = LOCKOUT_DURATION - timeSinceLastAttempt;
    return remaining > 0 ? remaining : 0;
  };

  const recordAttempt = (email: string, success: boolean) => {
    if (success) {
      localStorage.removeItem(STORAGE_KEY);
      setIsLocked(false);
      setRemainingTime(0);
      return;
    }

    const attempts = getStoredAttempts();
    const newCount = attempts?.email === email ? attempts.count + 1 : 1;

    const newAttempt: LoginAttempt = {
      email,
      timestamp: Date.now(),
      count: newCount,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAttempt));

    if (newCount >= MAX_ATTEMPTS) {
      setIsLocked(true);
      setRemainingTime(LOCKOUT_DURATION);
    }
  };

  const unlockAccount = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsLocked(false);
    setRemainingTime(0);
  };

  const formatRemainingTime = (): string => {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    isLocked,
    remainingTime,
    recordAttempt,
    formatRemainingTime,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - (getStoredAttempts()?.count || 0)),
  };
}
