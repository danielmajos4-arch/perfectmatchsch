import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, LogOut, User as UserIcon, ExternalLink, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TeacherProfileEditor } from '@/components/TeacherProfileEditor';
import { SchoolProfileEditor } from '@/components/SchoolProfileEditor';
import { ResumeUpload } from '@/components/ResumeUpload';
import { PortfolioUpload } from '@/components/PortfolioUpload';
import { ArchetypeGrowthResources } from '@/components/ArchetypeGrowthResources';
import { AchievementCollection } from '@/components/achievements';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherProfile } from '@/hooks/useTeacherProfile';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';
import type { Teacher, School } from '@shared/schema';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { user } = useAuth(); // Use auth context instead of separate query
  
  // Get profile data from AuthenticatedLayout's queries via shared query cache
  // This avoids duplicate queries since AuthenticatedLayout already fetches these
  const { data: teacherProfile } = useTeacherProfile(user?.id);
  const { data: schoolProfile } = useSchoolProfile(user?.id);

  const handleLogout = () => {
    console.log('[Profile] Logout - clearing session and redirecting');
    
    // Clear all auth storage immediately (don't wait for signOut)
    localStorage.removeItem('perfectmatch-auth');
    sessionStorage.clear();
    
    // Fire signOut in background (don't await - it can hang)
    supabase.auth.signOut().catch(() => {});
    
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

  const isTeacher = user?.user_metadata?.role === 'teacher';
  const isSchool = user?.user_metadata?.role === 'school';

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-background">
        {/* Hero / Header Section */}
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/10 via-primary/5 to-background overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
          <div className="container mx-auto px-4 h-full flex flex-col justify-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
              Profile
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl">
              Manage your professional identity and account settings
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-12 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Sidebar (Identity & Account) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Identity Card */}
              <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95 overflow-hidden">
                <div className="h-24 bg-gradient-to-br from-primary/20 to-purple-500/20" />
                <CardContent className="pt-0 relative">
                  <div className="flex justify-center -mt-12 mb-4">
                    <div className="relative">
                      <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-card shadow-2xl ring-2 ring-primary/10">
                        <AvatarImage
                          src={teacherProfile?.profile_photo_url || schoolProfile?.logo_url || undefined}
                          alt={teacherProfile?.full_name || schoolProfile?.school_name || user?.user_metadata?.full_name || 'User'}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-bold text-3xl">
                          {teacherProfile?.full_name
                            ? getInitials(teacherProfile.full_name)
                            : schoolProfile?.school_name
                              ? getInitials(schoolProfile.school_name)
                              : (user?.user_metadata?.full_name ? getInitials(user.user_metadata.full_name) : 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-2 right-2 h-5 w-5 bg-green-500 rounded-full border-2 border-card shadow-sm" title="Online"></div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 mb-6">
                    <h2 className="text-2xl font-bold text-foreground break-words">
                      {teacherProfile?.full_name || schoolProfile?.school_name || user?.user_metadata?.full_name || 'User'}
                    </h2>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
                        {user?.user_metadata?.role || 'User'}
                      </Badge>
                      {isSchool && schoolProfile?.school_type && (
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          {schoolProfile.school_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{user?.email}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-border/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Account Type</span>
                      <span className="font-medium capitalize">{user?.user_metadata?.role || 'User'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="font-medium">
                        {new Date(user?.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions / Status (Optional) */}
              {/* Could add profile completion status here if needed */}
            </div>

            {/* Right Content Area (Editors & Details) */}
            <div className="lg:col-span-8 space-y-8">

              {/* School Profile Editor */}
              {isSchool && schoolProfile && user?.id && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <SchoolProfileEditor school={schoolProfile} userId={user.id} />
                </div>
              )}

              {/* Teacher Profile Editor */}
              {isTeacher && user?.id && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {teacherProfile ? (
                    <>
                      <TeacherProfileEditor teacher={teacherProfile} userId={user.id} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ResumeUpload
                          teacher={teacherProfile}
                          userId={user.id}
                          onUpdate={() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', user.id] });
                          }}
                        />
                        <PortfolioUpload
                          teacher={teacherProfile}
                          userId={user.id}
                          onUpdate={() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', user.id] });
                          }}
                        />
                      </div>

                      {/* Achievements - Render immediately, loads async */}
                      <div id="achievements">
                        <AchievementCollection userId={user.id} showProgress={true} />
                      </div>

                      {/* Archetype Resources - Only render if archetype exists */}
                      {teacherProfile.archetype && (
                        <ArchetypeGrowthResources teacher={teacherProfile} />
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-muted-foreground">Loading profile...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
// End of Profile component

