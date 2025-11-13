import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, LogOut, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TeacherProfileEditor } from '@/components/TeacherProfileEditor';
import { ResumeUpload } from '@/components/ResumeUpload';
import { PortfolioUpload } from '@/components/PortfolioUpload';
import { ArchetypeGrowthResources } from '@/components/ArchetypeGrowthResources';
import { AchievementCollection } from '@/components/achievements';
import { useAuth } from '@/contexts/AuthContext';
import type { Teacher } from '@shared/schema';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Teacher | null;
    },
    enabled: !!user?.id && user?.user_metadata?.role === 'teacher',
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    setLocation('/login');
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

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto">
        {/* Header - Mobile First */}
          <div className="mb-6 md:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">Profile</h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Manage your account settings and personal information</p>
        </div>

                {/* Teacher Profile Editor */}
                {isTeacher && teacherProfile && user?.id && (
                  <div className="mb-6 md:mb-8 space-y-6">
                    <Card className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-card via-card to-primary/5 border-primary/10 shadow-lg">
                      <TeacherProfileEditor teacher={teacherProfile} userId={user.id} />
                    </Card>
                    
                    {/* Resume Upload */}
                    <ResumeUpload 
                      teacher={teacherProfile} 
                      userId={user.id}
                      onUpdate={(url) => {
                        // Refresh teacher profile
                        queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', user.id] });
                      }}
                    />
                    
                    {/* Portfolio Upload */}
                    <PortfolioUpload 
                      teacher={teacherProfile} 
                      userId={user.id}
                      onUpdate={(url) => {
                        // Refresh teacher profile
                        queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', user.id] });
                      }}
                    />
                  </div>
                )}

          {/* Achievements Section */}
          {user?.id && (
            <div className="mb-6 md:mb-8" id="achievements">
              <AchievementCollection userId={user.id} showProgress={true} />
            </div>
          )}

          {/* Profile Overview Card - Mobile First */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 md:mb-8">
            {/* Profile Avatar & Basic Info */}
            <Card className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-card via-card to-primary/5 border-primary/10 shadow-md lg:col-span-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 border-4 border-primary/30 shadow-xl ring-4 ring-primary/10">
                    <AvatarImage src={teacherProfile?.profile_photo_url || undefined} alt={teacherProfile?.full_name || user?.user_metadata?.full_name || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-3xl">
                      {teacherProfile?.full_name ? getInitials(teacherProfile.full_name) : (user?.user_metadata?.full_name ? getInitials(user.user_metadata.full_name) : 'U')}
              </AvatarFallback>
            </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-green-500 rounded-full border-3 border-background shadow-lg"></div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">
                    {teacherProfile?.full_name || user?.user_metadata?.full_name || 'User'}
              </h2>
                  <Badge variant="secondary" className="rounded-full capitalize px-3 sm:px-4 py-1.5 text-xs sm:text-sm">
                  {user?.user_metadata?.role || 'User'}
                </Badge>
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground pt-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="break-all">{user?.email}</span>
              </div>
            </div>
          </div>
        </Card>

            {/* Teacher Details Grid - Mobile First */}
            {isTeacher && teacherProfile && (
              <Card className="p-4 sm:p-6 md:p-8 bg-card border-border shadow-md lg:col-span-2">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 pb-3 border-b border-border">Profile Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</p>
                    <p className="text-base font-medium text-foreground">{teacherProfile.location || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Experience</p>
                    <p className="text-base font-medium text-foreground">{teacherProfile.years_experience || 'Not set'}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subjects</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teacherProfile.subjects && teacherProfile.subjects.length > 0 ? (
                        teacherProfile.subjects.map((subject, idx) => (
                          <Badge key={idx} variant="outline" className="rounded-full">
                            {subject}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No subjects added</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade Levels</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teacherProfile.grade_levels && teacherProfile.grade_levels.length > 0 ? (
                        teacherProfile.grade_levels.map((level, idx) => (
                          <Badge key={idx} variant="outline" className="rounded-full">
                            {level}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No grade levels added</p>
                      )}
                    </div>
                  </div>
                  {teacherProfile.bio && (
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bio</p>
                      <p className="text-sm text-foreground leading-relaxed">{teacherProfile.bio}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Account Information - Mobile First */}
          <Card className="mb-6 md:mb-8 bg-card border-border shadow-md">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
              Account Information
            </CardTitle>
          </CardHeader>
            <CardContent className="space-y-0 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-border hover:bg-muted/50 px-2 rounded transition-colors gap-2">
                <span className="text-sm font-semibold text-foreground">Full Name</span>
              <span className="text-sm text-muted-foreground break-words sm:text-right">
                {user?.user_metadata?.full_name || 'Not set'}
              </span>
            </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-border hover:bg-muted/50 px-2 rounded transition-colors gap-2">
                <span className="text-sm font-semibold text-foreground">Email</span>
                <span className="text-sm text-muted-foreground break-all sm:text-right">{user?.email}</span>
            </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 hover:bg-muted/50 px-2 rounded transition-colors gap-2">
                <span className="text-sm font-semibold text-foreground">Account Type</span>
              <Badge variant="secondary" className="rounded-full capitalize w-fit">
                {user?.user_metadata?.role || 'User'}
              </Badge>
            </div>
          </CardContent>
        </Card>

          {/* Archetype Growth Resources */}
          {isTeacher && teacherProfile?.archetype && (
            <div className="mb-6 md:mb-8">
              <Card className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-card via-card to-accent/5 border-accent/10 shadow-md">
                <ArchetypeGrowthResources teacher={teacherProfile} />
              </Card>
            </div>
          )}

        {/* Actions - Mobile First */}
          <Card className="bg-card border-border shadow-md">
            <CardContent className="p-4 sm:p-6">
          <Button
            variant="destructive"
                className="w-full h-12 gap-2 font-semibold"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
