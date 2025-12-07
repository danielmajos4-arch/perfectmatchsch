import { Link, useLocation } from 'wouter';
import { Home, Search, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [location] = useLocation();
  const { role } = useAuth();

  const dashboardPath = role === 'teacher' ? '/teacher/dashboard' : role === 'school' ? '/school/dashboard' : '/dashboard';

  const navItems = [
    { path: dashboardPath, icon: Home, label: 'Home', testId: 'nav-home' },
    { path: '/jobs', icon: Search, label: 'Jobs', testId: 'nav-jobs' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', testId: 'nav-messages' },
    { path: '/profile', icon: User, label: 'Profile', testId: 'nav-profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.label === 'Home' && (location === '/teacher/dashboard' || location === '/school/dashboard' || location === '/dashboard'));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={item.testId}
              className="flex-1"
            >
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full min-h-[48px] gap-1 transition-all duration-200 active:scale-95 touch-manipulation",
                  isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.label}
              >
                <Icon className={cn("h-6 w-6 transition-colors", isActive ? "fill-current" : "")} />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
