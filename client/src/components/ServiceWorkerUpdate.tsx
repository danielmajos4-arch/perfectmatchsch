/**
 * Service Worker Update Prompt Component
 * 
 * Displays a notification when a service worker update is available
 * Allows users to update immediately or dismiss
 */

import { useState, useEffect } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, RefreshCw, WifiOff } from 'lucide-react';

export function ServiceWorkerUpdate() {
  const { isUpdateAvailable, isOffline, installUpdate } = useServiceWorker();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setIsVisible(true);
    }
  }, [isUpdateAvailable]);

  const handleUpdate = async () => {
    setIsInstalling(true);
    try {
      await installUpdate();
      // The page will reload automatically when the service worker activates
    } catch (error) {
      console.error('Error installing update:', error);
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Hide for this session, but will show again on next page load if update still available
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Update Available</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
              aria-label="Dismiss update notification"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            A new version of the app is available. Update now to get the latest features and improvements.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2 pt-0">
          <Button
            onClick={handleUpdate}
            disabled={isInstalling || isOffline}
            className="flex-1"
            size="sm"
          >
            {isInstalling ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Now
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isInstalling}
            size="sm"
          >
            Later
          </Button>
        </CardFooter>
        {isOffline && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <WifiOff className="h-3 w-3" />
              <span>Update requires internet connection</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Offline Indicator Component
 * 
 * Shows a small indicator when the app is offline
 */
export function OfflineIndicator() {
  const { isOffline } = useServiceWorker();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShowBanner(true);
    } else {
      // Hide after a short delay when coming back online
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
      <Card className="shadow-lg border-2 border-orange-500/20 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="flex items-center gap-2 px-4 py-2">
          <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
            {isOffline ? 'You are offline' : 'Back online'}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

