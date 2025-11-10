import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import TeacherDashboard from './TeacherDashboard';
import SchoolDashboard from './SchoolDashboard';

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = user.user_metadata?.role;

  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  if (role === 'school') {
    return <SchoolDashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-xl text-muted-foreground">Invalid user role</p>
      </div>
    </div>
  );
}
