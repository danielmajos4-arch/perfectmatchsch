/**
 * PWA Install Prompt Component
 * 
 * Displays a prompt for users to install the PWA
 * Handles the beforeinstallprompt event for supported browsers
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      // Check for iOS standalone mode
      if ((navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled()) {
      return;
    }

    // Check if user has dismissed before (in this session)
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay to not interrupt user
      setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setIsVisible(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Show success message if just installed
  if (isInstalled) {
    return null; // Already installed, no need to show anything
  }

  if (!isVisible || dismissed || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Install App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            Install PerfectMatchSchools for faster access and a better experience. Works offline too!
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Works offline
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Fast launch
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Push notifications
            </span>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 pt-0">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1"
            size="sm"
          >
            {isInstalling ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-bounce" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isInstalling}
            size="sm"
          >
            Not now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * iOS Install Instructions Component
 * 
 * Shows instructions for iOS users to install the PWA via Safari
 */
export function IOSInstallInstructions() {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if on iOS and not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (navigator as any).standalone === true;
    const wasDismissed = sessionStorage.getItem('ios-install-dismissed');

    if (isIOS && !isStandalone && !wasDismissed) {
      // Show after a delay
      setTimeout(() => {
        setIsVisible(true);
      }, 5000);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    sessionStorage.setItem('ios-install-dismissed', 'true');
  };

  if (!isVisible || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2 border-primary/20 mx-auto max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Add to Home Screen</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ol className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
              Tap the <strong className="text-foreground">Share</strong> button in Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
              Scroll and tap <strong className="text-foreground">Add to Home Screen</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
              Tap <strong className="text-foreground">Add</strong> to install
            </li>
          </ol>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full"
            size="sm"
          >
            Got it
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

