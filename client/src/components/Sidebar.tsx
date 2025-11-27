/**
 * Sidebar Navigation Component
 * 
 * Persistent sidebar navigation for authenticated users
 * Role-based menu items (School vs Teacher)
 * Mobile-responsive with hamburger menu
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Plus,
  Briefcase,
  FileText,
  Bookmark,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  Bell,
  Mail,
  TestTube,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import logoUrl from '@assets/New logo-15_1762774603259.png';
import { useQuery } from '@tanstack/react-query';
import { calculateProfileCompletion } from '@/lib/profileUtils';
import { Progress } from '@/components/ui/progress';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

interface NavItem {
  label: string;
  icon: typeof Home;
  href: string;
  badge?: number;
  roles?: ('teacher' | 'school')[];
}

const SCHOOL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: Home, href: '/school/dashboard', roles: ['school'] },
  { label: 'Post Job', icon: Plus, href: '/school/dashboard#post-job', roles: ['school'] },
  { label: 'My Jobs', icon: Briefcase, href: '/school/dashboard', roles: ['school'] },
  { label: 'Applications', icon: FileText, href: '/school/dashboard#applications', roles: ['school'] },
  { label: 'Messages', icon: MessageCircle, href: '/messages', roles: ['school', 'teacher'] },
  { label: 'Email Templates', icon: Mail, href: '/email-templates', roles: ['school'] },
];

const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: Home, href: '/teacher/dashboard', roles: ['teacher'] },
  { label: 'Browse Jobs', icon: Search, href: '/jobs', roles: ['teacher'] },
  { label: 'My Applications', icon: FileText, href: '/teacher/dashboard#applications', roles: ['teacher'] },
  { label: 'Saved Jobs', icon: Bookmark, href: '/teacher/dashboard#favorites', roles: ['teacher'] },
  { label: 'Messages', icon: MessageCircle, href: '/messages', roles: ['school', 'teacher'] },
  { label: 'Profile', icon: User, href: '/profile', roles: ['teacher'] },
];

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const [location] = useLocation();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get navigation items based on role
  const navItems = role === 'school' ? SCHOOL_NAV_ITEMS : TEACHER_NAV_ITEMS;

  // Fetch unread notification count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('in_app_notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (!error && data) {
          setUnreadCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`sidebar-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Teacher profile completion (for sidebar indicator)
  const { data: teacherProfile } = useQuery({
    queryKey: ['sidebar-teacher-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && role === 'teacher',
  });

  const completionPercentage =
    role === 'teacher' && teacherProfile ? calculateProfileCompletion(teacherProfile) : 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    // Get current hash from window
    const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
    
    // Handle hash routes (e.g., /school/dashboard#post-job)
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      // For hash routes, BOTH path AND hash must match exactly
      return location === path && currentHash === `#${hash}`;
    }
    
    // Handle dashboard routes (no hash)
    // Only match if we're on the exact dashboard path with NO hash
    if (href === '/school/dashboard' || href === '/teacher/dashboard') {
      return location === href && currentHash === '';
    }
    
    // For all other routes, use exact matching only
    return location === href;
  };

  // Mobile overlay
  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card border-r border-border z-50 transition-transform duration-300 ease-in-out',
          'flex flex-col shadow-lg',
          isMobile
            ? 'w-64'
            : 'w-64 lg:w-72', // 240px mobile, 256px tablet, 288px desktop
          isMobile && !isOpen && '-translate-x-full',
          !isMobile && 'translate-x-0'
        )}
        data-sidebar
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href={role === 'school' ? '/school/dashboard' : '/teacher/dashboard'}>
            <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img 
                src={logoUrl} 
                alt="PerfectMatchSchools" 
                className="h-8 w-auto"
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)) brightness(1.2) contrast(1.3) saturate(1.5)',
                }}
              />
              <span className="font-semibold text-foreground hidden lg:inline text-sm">
                PerfectMatch
              </span>
            </div>
          </Link>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* User Info Section */}
        {user && (
          <div className="p-4 border-b border-border">
            <Link href="/profile" className="flex items-center gap-3 group">
              <Avatar className="h-10 w-10 group-hover:scale-105 transition-transform">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(user.user_metadata?.full_name || user.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 hidden lg:block">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const hasBadge = item.label === 'Messages' && unreadCount > 0;

            return (
              <Link key={`${item.label}-${item.href}-${index}`} href={item.href}>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-11',
                    active && 'bg-primary/10 text-primary font-medium',
                    'hover:bg-primary/5 transition-colors'
                  )}
                  onClick={(e) => {
                    // Handle hash routes with smooth scroll
                    if (item.href.includes('#')) {
                      const [path, hash] = item.href.split('#');
                      // Navigate to path first, then scroll to hash
                      setTimeout(() => {
                        const element = document.getElementById(hash);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    }
                    
                    if (isMobile && onClose) {
                      onClose();
                    }
                  }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {hasBadge && (
                    <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Profile completion indicator for teachers */}
        {role === 'teacher' && teacherProfile && (
          <div className="px-4 py-3 border-t border-border">
            <Link href="/profile">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                <div className="flex-1">
                  <p className="text-sm font-medium">Profile Completion</p>
                  <Progress value={completionPercentage} className="h-2 mt-1" />
                </div>
                <span className="text-sm font-bold">{completionPercentage}%</span>
              </div>
            </Link>
          </div>
        )}

        {/* Bottom Section */}
        <div className="p-4 border-t border-border space-y-1">
          <Link href="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 hover:bg-primary/5"
              onClick={() => {
                if (isMobile && onClose) {
                  onClose();
                }
              }}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Button>
          </Link>
          {/* Email Testing Dashboard - Show in development or for testing */}
          {import.meta.env.DEV && (
            <Link href="/test-email">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11 hover:bg-primary/5"
                onClick={() => {
                  if (isMobile && onClose) {
                    onClose();
                  }
                }}
              >
                <TestTube className="h-5 w-5" />
                <span>Test Emails</span>
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
}

