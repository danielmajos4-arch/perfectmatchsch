import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PromotionalBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('promo-banner-dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('promo-banner-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm md:text-base font-medium text-foreground">
              Join <span className="font-bold text-primary">1,000+ educators</span> finding their perfect match
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/role-selection">
              <Button size="sm" className="h-8 px-4 text-xs md:text-sm whitespace-nowrap">
                Get Started
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-primary/10 rounded transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

