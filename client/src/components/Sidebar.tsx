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
  Users,
  LayoutDashboard,
  Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
const logoUrl = '/images/logo.png';
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
  roles?: ('teacher' | 'school' | 'admin')[];
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
  { label: 'My Applications', icon: FileText, href: '/teacher/applications', roles: ['teacher'] },
  { label: 'Saved Jobs', icon: Bookmark, href: '/teacher/saved-jobs', roles: ['teacher'] },
  { label: 'Messages', icon: MessageCircle, href: '/messages', roles: ['school', 'teacher'] },
  { label: 'Profile', icon: User, href: '/profile', roles: ['teacher'] },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', roles: ['admin'] },
  { label: 'Users', icon: Users, href: '/admin/users', roles: ['admin'] },
  { label: 'Jobs', icon: Briefcase, href: '/admin/jobs', roles: ['admin'] },
];

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get navigation items based on role
  const navItems = role === 'admin'
    ? ADMIN_NAV_ITEMS
    : role === 'school'
      ? SCHOOL_NAV_ITEMS
      : TEACHER_NAV_ITEMS;

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

  // Teacher profile completion (for sidebar indicator and avatar)
  const { data: teacherProfile } = useQuery({
    queryKey: ['/api/teacher-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && role === 'teacher',
  });

  // School profile (for logo and name)
  const { data: schoolProfile } = useQuery({
    queryKey: ['/api/school-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('logo_url, school_name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && role === 'school',
  });

  const completionPercentage =
    role === 'teacher' && teacherProfile ? calculateProfileCompletion(teacherProfile) : 0;

  const handleLogout = () => {
    console.log('[Sidebar] Logout - clearing session and redirecting');

    // Clear all auth storage immediately (don't wait for signOut)
    localStorage.removeItem('perfectmatch-auth');
    sessionStorage.clear();

    // Fire signOut in background (don't await - it hangs)
    supabase.auth.signOut().catch(() => { });

    // Redirect immediately
    window.location.href = '/login';
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
      {/* Mobile Backdrop - Smooth fade */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-all duration-300 ease-out",
            isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Smooth slide with spring effect */}
      <aside
        className={cn(
          'fixed left-0 top-0 bg-card/98 backdrop-blur-md border-r border-border z-50',
          'flex flex-col shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'w-[280px] sm:w-72 lg:w-72', // Consistent width
          isMobile && !isOpen && '-translate-x-full',
          !isMobile && 'translate-x-0',
          // Safe area for notched devices and dynamic viewport height
          'pb-safe-bottom',
          isMobile ? 'h-[100dvh]' : 'h-full'
        )}
        data-sidebar
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <Link href={role === 'admin' ? '/admin/dashboard' : role === 'school' ? '/school/dashboard' : '/teacher/dashboard'}>
            <div className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <img
                  src={logoUrl}
                  alt="PerfectMatchSchools"
                  className="h-9 w-auto relative z-10"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                  }}
                />
              </div>
              <span className="font-bold text-foreground hidden lg:inline text-base tracking-tight">
                PerfectMatch
              </span>
            </div>
          </Link>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* User Info Section */}
        {user && (
          <div className="p-6 border-b border-border/50 bg-muted/30">
            <Link href="/profile" className="flex items-center gap-4 group">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform ring-2 ring-transparent group-hover:ring-primary/20">
                <AvatarImage
                  src={
                    role === 'teacher' && teacherProfile?.profile_photo_url
                      ? teacherProfile.profile_photo_url
                      : role === 'school' && schoolProfile?.logo_url
                        ? schoolProfile.logo_url
                        : undefined
                  }
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {getInitials(
                    role === 'teacher' && teacherProfile?.full_name
                      ? teacherProfile.full_name
                      : role === 'school' && schoolProfile?.school_name
                        ? schoolProfile.school_name
                        : user.user_metadata?.full_name || user.email || 'U'
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 hidden lg:block">
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {role === 'teacher' && teacherProfile?.full_name
                    ? teacherProfile.full_name
                    : role === 'school' && schoolProfile?.school_name
                      ? schoolProfile.school_name
                      : user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Navigation Items - Touch optimized */}
        <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 hide-scrollbar">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const hasBadge = item.label === 'Messages' && unreadCount > 0;

            return (
              <Link key={`${item.label}-${item.href}-${index}`} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 min-h-[48px] h-12 sm:h-11 rounded-xl transition-all duration-200',
                    'active:scale-[0.98] touch-manipulation',
                    active
                      ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onClick={(e) => {
                    // Handle hash routes with smooth scroll
                    if (item.href.includes('#')) {
                      const [path, hash] = item.href.split('#');
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
                  <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="flex-1 text-left text-sm sm:text-base">{item.label}</span>
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
          <div className="px-6 py-4 border-t border-border/50 bg-muted/10">
            <Link href="/profile">
              <div className="flex flex-col gap-2 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile Status</p>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    completionPercentage === 100 ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
                  )}>{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
            </Link>
          </div>
        )}

        {/* Bottom Section - Touch optimized with safe area */}
        <div className="p-3 sm:p-4 border-t border-border/50 space-y-1 bg-muted/10 safe-bottom">
          <Link href="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 min-h-[48px] h-12 sm:h-11 hover:bg-background hover:shadow-sm rounded-xl text-muted-foreground hover:text-foreground active:scale-[0.98] touch-manipulation"
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
                className="w-full justify-start gap-3 min-h-[48px] h-12 sm:h-11 hover:bg-background hover:shadow-sm rounded-xl text-muted-foreground hover:text-foreground active:scale-[0.98] touch-manipulation"
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
            className="w-full justify-start gap-3 min-h-[48px] h-12 sm:h-11 hover:bg-destructive/10 hover:text-destructive rounded-xl text-muted-foreground active:scale-[0.98] touch-manipulation"
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

