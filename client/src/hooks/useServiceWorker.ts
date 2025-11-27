/**
 * React Hook for Service Worker Management
 * 
 * Provides:
 * - Service worker registration status
 * - Update detection
 * - Update installation
 * - Offline status
 */

import { useState, useEffect, useCallback } from 'react';
import { getRegistration, checkForUpdates } from '@/lib/serviceWorker';

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  updateAvailable: boolean;
  isInstalling: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    updateAvailable: false,
    isInstalling: false,
    isOffline: !navigator.onLine,
    registration: null,
    error: null,
  });

  // Check for service worker registration
  useEffect(() => {
    if (!state.isSupported) {
      return;
    }

    async function checkRegistration() {
      try {
        const registration = await getRegistration();
        
        if (registration) {
          setState((prev) => ({
            ...prev,
            isRegistered: true,
            registration,
          }));

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              setState((prev) => ({
                ...prev,
                isInstalling: true,
              }));

              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New version available
                    setState((prev) => ({
                      ...prev,
                      updateAvailable: true,
                      isInstalling: false,
                    }));
                  } else {
                    // First install
                    setState((prev) => ({
                      ...prev,
                      isInstalling: false,
                    }));
                  }
                } else if (newWorker.state === 'activated') {
                  setState((prev) => ({
                    ...prev,
                    isInstalling: false,
                    updateAvailable: false,
                  }));
                }
              });
            }
          });

          // Check if update is already available
          if (registration.waiting) {
            setState((prev) => ({
              ...prev,
              updateAvailable: true,
            }));
          }
        } else {
          setState((prev) => ({
            ...prev,
            isRegistered: false,
          }));
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[useServiceWorker] Error checking registration:', err);
        setState((prev) => ({
          ...prev,
          error: err,
        }));
      }
    }

    checkRegistration();
  }, [state.isSupported]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for controller change (service worker update)
  useEffect(() => {
    if (!state.isSupported) {
      return;
    }

    const handleControllerChange = () => {
      // Service worker has been updated, reload to use new version
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [state.isSupported]);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    if (!state.registration || !state.registration.waiting) {
      return;
    }

    try {
      // Send message to waiting service worker to skip waiting
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      setState((prev) => ({
        ...prev,
        isInstalling: true,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[useServiceWorker] Error updating service worker:', err);
      setState((prev) => ({
        ...prev,
        error: err,
      }));
    }
  }, [state.registration]);

  // Check for updates manually
  const checkUpdate = useCallback(async () => {
    if (!state.isSupported) {
      return;
    }

    try {
      checkForUpdates();
    } catch (error) {
      console.error('[useServiceWorker] Error checking for updates:', error);
    }
  }, [state.isSupported]);

  return {
    isSupported: state.isSupported,
    isRegistered: state.isRegistered,
    updateAvailable: state.updateAvailable,
    updateServiceWorker: updateServiceWorker,
    error: state.error,
  };
}

