/**
 * Authenticated Layout Component
 * 
 * Layout wrapper for authenticated users
 * Includes sidebar navigation and minimal top header
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Settings, Menu, X, User, LogOut } from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import type { Teacher } from '@shared/schema';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  showMobileNav?: boolean;
}

export function AuthenticatedLayout({ children, showMobileNav = true }: AuthenticatedLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch unread notification count
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications/unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (notifications) {
      setUnreadCount(notifications.length);
    }
  }, [notifications]);

  // Fetch teacher profile for avatar photo
  const { data: teacherProfile } = useQuery<Teacher>({
    queryKey: ['/api/teacher-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('profile_photo_url, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Teacher | null;
    },
    enabled: !!user?.id && role === 'teacher',
  });

  // Fetch school profile for logo
  const { data: schoolProfile } = useQuery({
    queryKey: ['/api/school-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('logo_url, school_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && role === 'school',
  });

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  // Close sidebar when clicking outside (mobile)
  useEffect(() => {
    if (sidebarOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-sidebar]') && !target.closest('[data-hamburger]')) {
          setSidebarOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [sidebarOpen]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-border z-30">
        <div className="h-full flex items-center justify-between px-4 lg:pl-72 lg:pr-6">
          {/* Left: Empty on desktop, hamburger on mobile */}
          {/* Left: Hamburger (mobile only) */}
          <div className="flex items-center">
            {showMobileNav && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-hamburger
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>

          {/* Right: Notifications, Settings, User */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <NotificationCenter>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </NotificationCenter>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              asChild
              aria-label="Settings"
            >
              <a href="/settings">
                <Settings className="h-5 w-5" />
              </a>
            </Button>

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={
                          role === 'teacher' && teacherProfile?.profile_photo_url
                            ? teacherProfile.profile_photo_url
                            : role === 'school' && schoolProfile?.logo_url
                            ? schoolProfile.logo_url
                            : undefined
                        } 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(
                          role === 'teacher' && teacherProfile?.full_name
                            ? teacherProfile.full_name
                            : role === 'school' && schoolProfile?.school_name
                            ? schoolProfile.school_name
                            : user.user_metadata?.full_name || user.email || 'U'
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {role === 'teacher' && teacherProfile?.full_name
                        ? teacherProfile.full_name.split(' ')[0]
                        : role === 'school' && schoolProfile?.school_name
                        ? schoolProfile.school_name.split(' ')[0]
                        : user.user_metadata?.full_name?.split(' ')[0] || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {role === 'teacher' && teacherProfile?.full_name
                          ? teacherProfile.full_name
                          : role === 'school' && schoolProfile?.school_name
                          ? schoolProfile.school_name
                          : user.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/profile">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setLocation('/login');
                    }}
                    className="text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobile ? sidebarOpen : true}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 transition-all duration-300 ease-in-out',
          'lg:pl-72', // Sidebar width on desktop (288px = 72 * 4)
          'min-h-screen bg-background'
        )}
      >
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

