/**
 * PWA Test Panel Component
 * 
 * Development tool to test and verify PWA functionality
 * Only shows in development mode
 */

import { useState, useEffect } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, Download, ChevronDown, ChevronUp, X } from 'lucide-react';

export function PWATestPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const {
    isSupported,
    isRegistered,
    isUpdateAvailable,
    isOffline,
    registration,
    checkUpdate,
    installUpdate,
  } = useServiceWorker();

  const [cacheInfo, setCacheInfo] = useState<{
    static: number;
    api: number;
    images: number;
  } | null>(null);

  useEffect(() => {
    if (isSupported && 'caches' in window) {
      async function getCacheInfo() {
        try {
          const cacheNames = await caches.keys();
          const cacheCounts = {
            static: 0,
            api: 0,
            images: 0,
          };

          for (const cacheName of cacheNames) {
            if (cacheName.includes('static')) {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              cacheCounts.static = keys.length;
            } else if (cacheName.includes('api')) {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              cacheCounts.api = keys.length;
            } else if (cacheName.includes('images')) {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              cacheCounts.images = keys.length;
            }
          }

          setCacheInfo(cacheCounts);
        } catch (error) {
          console.error('Error getting cache info:', error);
        }
      }

      getCacheInfo();
    }
  }, [isSupported]);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  // Don't render if minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsMinimized(false)}
          className="shadow-lg"
        >
          <Download className="h-4 w-4 mr-2" />
          PWA Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 max-h-96 overflow-y-auto">
      <Card className="shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <CardTitle className="text-sm">PWA Test Panel</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Development testing tool
          </CardDescription>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="space-y-4">
          {/* Service Worker Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Service Worker</span>
              <Badge variant={isSupported ? 'default' : 'secondary'} className="text-xs">
                {isSupported ? 'Supported' : 'Not Supported'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Registered</span>
              {isRegistered ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            {isUpdateAvailable && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Update Available</span>
                <Badge variant="default" className="text-xs">Yes</Badge>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Connection</span>
              {isOffline ? (
                <div className="flex items-center gap-1 text-orange-500">
                  <WifiOff className="h-4 w-4" />
                  <span>Offline</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-500">
                  <Wifi className="h-4 w-4" />
                  <span>Online</span>
                </div>
              )}
            </div>
          </div>

          {/* Cache Info */}
          {cacheInfo && (
            <div className="space-y-2">
              <div className="text-xs font-medium">Cache Storage</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Static:</span>
                  <span>{cacheInfo.static} items</span>
                </div>
                <div className="flex justify-between">
                  <span>API:</span>
                  <span>{cacheInfo.api} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Images:</span>
                  <span>{cacheInfo.images} items</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={checkUpdate}
              className="w-full text-xs h-8"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Check for Updates
            </Button>
            {isUpdateAvailable && (
              <Button
                size="sm"
                onClick={installUpdate}
                className="w-full text-xs h-8"
              >
                <Download className="h-3 w-3 mr-2" />
                Install Update
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if ('serviceWorker' in navigator && registration) {
                  registration.unregister().then(() => {
                    window.location.reload();
                  });
                }
              }}
              className="w-full text-xs h-8"
            >
              Unregister SW
            </Button>
          </div>

          {/* Manifest Check */}
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.open('/manifest.json', '_blank');
              }}
              className="w-full text-xs h-8"
            >
              View Manifest
            </Button>
          </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

