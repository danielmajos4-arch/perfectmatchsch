import { Link, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, LogOut, User, Home } from 'lucide-react';
import type { Teacher } from '@shared/schema';

interface UserAvatarProps {
  userId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  clickable?: boolean;
  className?: string;
  showDropdown?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

export function UserAvatar({ userId, size = 'md', showName = false, clickable = true, className = '', showDropdown = true }: UserAvatarProps) {
  const [, setLocation] = useLocation();
  const { role } = useAuth();
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: teacherProfile } = useQuery<Teacher>({
    queryKey: ['/api/teacher-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('profile_photo_url, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') return null;
      return data as Teacher | null;
    },
    enabled: !!user?.id && user?.user_metadata?.role === 'teacher',
  });

  const profilePhoto = teacherProfile?.profile_photo_url;
  const displayName = teacherProfile?.full_name || user?.user_metadata?.full_name || 'User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const dashboardPath = role === 'teacher' ? '/teacher/dashboard' : role === 'school' ? '/school/dashboard' : '/dashboard';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation('/');
  };

  const avatarContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={profilePhoto || undefined} alt={displayName} />
        <AvatarFallback className={`bg-primary/10 text-primary font-semibold ${sizeClasses[size]}`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span className="text-sm font-medium text-foreground hidden md:inline">
          {displayName}
        </span>
      )}
    </div>
  );

  if (showDropdown && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full">
            {avatarContent}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={dashboardPath} className="cursor-pointer">
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (clickable) {
    return (
      <Link href="/profile" className="hover-elevate active-elevate-2 rounded-lg transition-all">
        {avatarContent}
      </Link>
    );
  }

  return avatarContent;
}

