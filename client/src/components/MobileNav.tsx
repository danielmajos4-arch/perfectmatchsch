import { Link, useLocation } from 'wouter';
import { Home, Search, MessageCircle, User } from 'lucide-react';

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/jobs', icon: Search, label: 'Jobs' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <button
                className={`flex flex-col items-center justify-center w-16 h-12 gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                aria-label={item.label}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
