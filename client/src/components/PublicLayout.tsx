/**
 * Public Layout Component
 * 
 * Layout wrapper for unauthenticated pages (landing, login, signup)
 * Uses the traditional top navbar
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
const logoUrl = '/images/logo.png';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // If authenticated, redirect to dashboard (shouldn't happen, but safety check)
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header - Pill Shaped Navbar */}
      <header className="hidden md:block fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-5xl px-4">
        <div className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-full shadow-lg px-6 py-3 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity" 
            data-testid="link-home"
          >
            <img 
              src={logoUrl} 
              alt="PerfectMatchSchools" 
              className="h-12 w-auto drop-shadow-lg" 
              style={{ 
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15)) brightness(1.5) contrast(1.6) saturate(2.2)',
              }}
            />
          </Link>
          
          <nav className="flex items-center gap-2 md:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm font-medium rounded-full px-3 md:px-5 h-8 md:h-9 hover:bg-gray-100 text-gray-700">
                <span className="hidden md:inline">Sign In</span>
                <span className="md:hidden">Login</span>
              </Button>
            </Link>
            <Link href="/role-selection">
              <Button size="sm" className="text-xs md:text-sm font-semibold rounded-full px-4 md:px-6 h-8 md:h-9 bg-primary hover:bg-primary/90">
                <span className="hidden md:inline">Sign Up</span>
                <span className="md:hidden">Sign Up</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Spacer for fixed navbar */}
      <div className="hidden md:block h-20"></div>

      {/* Mobile Header - Pill Shaped Navbar */}
      <header className="md:hidden fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-md">
        <div className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-full shadow-lg px-4 py-2.5 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center" 
            data-testid="link-home-mobile"
          >
            <img 
              src={logoUrl} 
              alt="PerfectMatchSchools" 
              className="h-10 w-auto drop-shadow-md" 
              style={{ 
                filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15)) brightness(1.5) contrast(1.6) saturate(2.2)',
              }}
            />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-3 rounded-full text-[10px] sm:text-xs hover:bg-gray-100 text-gray-700">
                Sign In
              </Button>
            </Link>
            <Link href="/role-selection">
              <Button size="sm" className="text-xs h-7 px-3 rounded-full text-[10px] sm:text-xs bg-primary hover:bg-primary/90">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Spacer for fixed mobile navbar */}
      <div className="md:hidden h-16"></div>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}

