import { ReactNode } from 'react';
import { Link } from 'wouter';
import { MobileNav } from './MobileNav';
import { GraduationCap } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showMobileNav?: boolean;
}

export function Layout({ children, showMobileNav = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 bg-card border-b border-card-border">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>PerfectMatchSchools</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link href="/jobs" className="text-sm font-medium text-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-lg" data-testid="link-jobs">
              Find Jobs
            </Link>
            <Link href="/messages" className="text-sm font-medium text-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-lg" data-testid="link-messages">
              Messages
            </Link>
            <Link href="/profile" className="text-sm font-medium text-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-lg" data-testid="link-profile">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-card border-b border-card-border">
        <div className="px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>PerfectMatch</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className={showMobileNav ? 'pb-16 md:pb-0' : ''}>
        {children}
      </main>

      {/* Mobile Navigation */}
      {showMobileNav && <MobileNav />}
    </div>
  );
}
