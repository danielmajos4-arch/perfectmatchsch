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

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isInstalling: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdateAvailable: false,
    isInstalling: false,
    isOffline: !navigator.onLine,
    registration: null,
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
                      isUpdateAvailable: true,
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
                    isUpdateAvailable: false,
                  }));
                }
              });
            }
          });

          // Check if update is already available
          if (registration.waiting) {
            setState((prev) => ({
              ...prev,
              isUpdateAvailable: true,
            }));
          }
        }
      } catch (error) {
        console.error('[useServiceWorker] Error checking registration:', error);
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

  // Install update
  const installUpdate = useCallback(async () => {
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
      console.error('[useServiceWorker] Error installing update:', error);
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
    ...state,
    installUpdate,
    checkUpdate,
  };
}

