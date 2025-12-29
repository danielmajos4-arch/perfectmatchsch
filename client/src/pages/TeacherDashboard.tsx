import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, FileText, CheckCircle, Clock, Star, Heart, X, MessageCircle, TrendingUp, Award, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getTeacherJobMatches, updateTeacherJobMatch, getJobsByArchetype } from '@/lib/matchingService';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ProfileCompletionStepper } from '@/components/ProfileCompletionStepper';
import { ProfileCompletionCircle } from '@/components/ProfileCompletionCircle';
import { ArchetypeBadge } from '@/components/ArchetypeBadge';
import { NextStepsWidget } from '@/components/NextStepsWidget';
import { ArchetypeGrowthResources } from '@/components/ArchetypeGrowthResources';
import { JobCard } from '@/components/JobCard';
import { AchievementCollection, AchievementNotification, AchievementBadge } from '@/components/achievements';
import { useAchievements } from '@/hooks/useAchievements';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { EmptyState } from '@/components/EmptyState';
import { useLocation } from 'wouter';
import type { Application, Job, Teacher, Conversation } from '@shared/schema';
import type { TeacherJobMatch } from '@shared/matching';
import { formatDistanceToNow } from 'date-fns';
import { ProfileCompletionGate } from '@/components/ProfileCompletionGate';
import { DashboardStats } from '@/components/DashboardStats';
import { ApplicationDetailModal } from '@/components/ApplicationDetailModal';
import { ProfileCompletionWidget } from '@/components/ProfileCompletionWidget';
import { RecommendedJobs } from '@/components/RecommendedJobs';
import { ProfileAnalyticsChart } from '@/components/ProfileAnalyticsChart';
import { getTeacherApplications, getApplicationStats } from '@/lib/applicationService';
import { getProfileViewStats } from '@/lib/analyticsService';
import { getSavedJobs, getSavedJobsCount } from '@/lib/savedJobsService';

type ApplicationWithJob = Application & { job: Job };

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { achievements, newAchievement, dismissNotification } = useAchievements();
  
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Get teacher profile first (needed by other queries)
  const { data: teacherProfile, error: teacherProfileError, isLoading: teacherProfileLoading } = useQuery<Teacher>({
    queryKey: ['/api/teacher-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data as Teacher;
    },
    enabled: !!user?.id,
    retry: 2,
  });

  const { data: applications, isLoading: applicationsLoading, error: applicationsError } = useQuery<ApplicationWithJob[]>({
    queryKey: ['/api/applications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getTeacherApplications(user.id);
    },
    enabled: !!user?.id,
    retry: 2,
  });

  // Get application stats
  const { data: applicationStats } = useQuery({
    queryKey: ['/api/application-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await getApplicationStats(user.id);
    },
    enabled: !!user?.id,
  });

  // Get saved jobs count
  const { data: savedJobsCount } = useQuery({
    queryKey: ['/api/saved-jobs-count', teacherProfile?.id],
    queryFn: async () => {
      if (!teacherProfile?.id) return 0;
      return await getSavedJobsCount(teacherProfile.id);
    },
    enabled: !!teacherProfile?.id,
  });

  // Get profile view stats
  const { data: profileViewStats } = useQuery({
    queryKey: ['/api/profile-views', teacherProfile?.id],
    queryFn: async () => {
      if (!teacherProfile?.id) return null;
      return await getProfileViewStats(teacherProfile.id);
    },
    enabled: !!teacherProfile?.id,
  });

  // Selected application for detail modal
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);

  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('applications');

  // Handle hash routes
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#applications') {
      setSelectedTab('applications');
      setTimeout(() => {
        const element = document.getElementById('applications');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else if (hash === '#favorites') {
      setSelectedTab('favorites');
      setTimeout(() => {
        const element = document.getElementById('favorites');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else if (hash === '#matches') {
      setSelectedTab('matches');
      setTimeout(() => {
        const element = document.getElementById('matches');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  // Get matched jobs (Sprint 6) with real-time updates
  const { data: matchedJobs, isLoading: matchesLoading, error: matchesError } = useQuery<(TeacherJobMatch & { job: Job })[]>({
    queryKey: ['/api/job-matches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getTeacherJobMatches(user.id, { favorited: false });
    },
    enabled: !!user?.id && !!teacherProfile?.archetype_tags,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
  });

  // Real-time subscription for new jobs
  useEffect(() => {
    if (!user?.id || !teacherProfile?.archetype_tags) return;

    const channel = supabase
      .channel('job-matches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `is_active=eq.true`,
        },
        (payload) => {
          // Check if new job matches teacher's archetype
          const newJob = payload.new as Job;
          if (newJob.archetype_tags && teacherProfile.archetype_tags) {
            const hasMatch = newJob.archetype_tags.some(tag =>
              teacherProfile.archetype_tags?.includes(tag)
            );
            if (hasMatch) {
              // Invalidate queries to refetch matches
              queryClient.invalidateQueries({ queryKey: ['/api/job-matches', user.id] });
              toast({
                title: 'New Job Match! 🎉',
                description: `A new ${newJob.subject} position at ${newJob.school_name} matches your profile.`,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to job matches');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error subscribing to job matches');
          toast({
            title: 'Connection issue',
            description: 'Unable to receive real-time updates. Please refresh the page.',
            variant: 'destructive',
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, teacherProfile?.archetype_tags, queryClient, toast]);

  // Real-time subscription for application status updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('application-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `teacher_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedApp = payload.new as Application;
          queryClient.invalidateQueries({ queryKey: ['/api/applications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/application-stats', user.id] });
          
          // Show toast notification for status changes
          if (updatedApp.status !== payload.old.status) {
            const statusMessages: Record<string, string> = {
              under_review: 'Your application is now under review! 👀',
              interview_scheduled: 'Interview scheduled! 📅',
              offer_made: 'Congratulations! You received an offer! 🎉',
              rejected: 'Application status updated',
            };
            
            const message = statusMessages[updatedApp.status] || 'Application status updated';
            toast({
              title: 'Application Update',
              description: message,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to application updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error subscribing to application updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast]);

  // Real-time subscription for profile views
  useEffect(() => {
    if (!teacherProfile?.id) return;

    const channel = supabase
      .channel('profile-views')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_views',
          filter: `teacher_id=eq.${teacherProfile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['/api/profile-views', teacherProfile.id] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to profile views');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error subscribing to profile views');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherProfile?.id, queryClient]);

  // Get favorited jobs
  const { data: favoritedJobs, isLoading: favoritedLoading } = useQuery<(TeacherJobMatch & { job: Job })[]>({
    queryKey: ['/api/job-matches-favorited', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getTeacherJobMatches(user.id, { favorited: true });
    },
    enabled: !!user?.id,
  });

  // Get unread messages count
  const { data: unreadMessagesCount } = useQuery<number>({
    queryKey: ['/api/unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('teacher_id', user.id);

      if (error || !conversations) return 0;

      const conversationIds = conversations.map(c => c.id);
      if (conversationIds.length === 0) return 0;

      const { count, error: msgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (msgError) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fallback to recommended jobs if no matches
  const { data: recommendedJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs/recommended'],
    queryFn: async () => {
      if (teacherProfile?.archetype_tags && teacherProfile.archetype_tags.length > 0) {
        return await getJobsByArchetype(teacherProfile.archetype_tags);
      }
      // Fallback to latest jobs
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as Job[];
    },
    enabled: !!teacherProfile,
  });

  // Favorite/hide mutations
  const favoriteMutation = useMutation({
    mutationFn: async ({ matchId, isFavorited }: { matchId: string; isFavorited: boolean }) => {
      return await updateTeacherJobMatch(matchId, { is_favorited: isFavorited });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-matches'] });
      toast({
        title: 'Updated',
        description: 'Job preference updated.',
      });
    },
  });

  const hideMutation = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      return await updateTeacherJobMatch(matchId, { is_hidden: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-matches'] });
      toast({
        title: 'Job hidden',
        description: 'This job will no longer appear in your feed.',
      });
    },
  });

  // Calculate profile completion
  const calculateProfileCompletion = (profile: Teacher | undefined): number => {
    if (!profile) return 0;
    const fields = [
      profile.full_name,
      profile.phone,
      profile.location,
      profile.bio,
      profile.years_experience,
      profile.subjects?.length > 0,
      profile.grade_levels?.length > 0,
      profile.teaching_philosophy,
      profile.profile_photo_url,
      profile.resume_url,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion(teacherProfile);

  // Calculate conversations count (active conversations)
  const { data: conversationsCount } = useQuery({
    queryKey: ['/api/conversations-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id);
      if (error) return 0;
      return data?.length || 0;
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Applied' },
      under_review: { variant: 'default', label: 'Under Review' },
      accepted: { variant: 'default', label: 'Accepted' },
      rejected: { variant: 'secondary', label: 'Not Selected' },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className="rounded-full">{config.label}</Badge>;
  };

  // Show error states if critical queries fail
  if (teacherProfileError) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Unable to load profile</h2>
            <p className="text-muted-foreground mb-4">
              {teacherProfileError instanceof Error ? teacherProfileError.message : 'An error occurred while loading your profile.'}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  const content = (
    <AuthenticatedLayout>
      {/* Achievement Notification */}
      <AchievementNotification
        achievement={newAchievement}
        onClose={dismissNotification}
        onViewAll={() => setLocation('/profile#achievements')}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12 max-w-7xl mx-auto">
          {/* Header Section with Profile */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <Card className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-card via-card to-primary/5 border-primary/10 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 md:gap-6">
                <Link href="/profile" className="group flex-shrink-0">
                  <div className="relative">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 cursor-pointer group-hover:scale-105 transition-all duration-300 border-2 sm:border-4 border-primary/30 shadow-xl ring-2 sm:ring-4 ring-primary/10">
                      <AvatarImage src={teacherProfile?.profile_photo_url || undefined} alt={teacherProfile?.full_name || user?.user_metadata?.full_name || 'Teacher'} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg sm:text-xl md:text-2xl">
                        {(teacherProfile?.full_name || user?.user_metadata?.full_name || 'Teacher')
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 bg-green-500 rounded-full border-2 border-background shadow-md"></div>
                  </div>
                </Link>
                <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent break-words">
                      Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'Teacher'}
                    </h1>
                    {teacherProfile?.archetype && (
                      <Badge className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm flex-shrink-0">
                        {teacherProfile.archetype}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm md:text-base lg:text-lg">Track your applications and discover new opportunities</p>
                  {/* Achievement Badges - Compact View */}
                  {achievements.length > 0 && user?.id && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 sm:pt-2">
                      <span className="text-xs text-muted-foreground">Achievements:</span>
                      <AchievementCollection userId={user.id} compact={true} />
                    </div>
                  )}
                  {teacherProfile && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 pt-1 sm:pt-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{teacherProfile.subjects?.length || 0} Subjects</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{teacherProfile.years_experience || 'N/A'} Experience</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{teacherProfile.location || 'Location not set'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Stats & Widgets Grid - Mobile First */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            {/* Profile Completion - Left Column */}
            {teacherProfile && (
              <div className="lg:col-span-1">
                <ProfileCompletionCircle
                  teacher={teacherProfile}
                  completionPercentage={profileCompletion}
                  showImpact={true}
                  showRewards={true}
                />
              </div>
            )}
            
            {/* Achievements Stats Card */}
            {achievements.length > 0 && user?.id && (
              <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
                <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-1.5 sm:gap-2">
                      <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400" />
                      Achievements
                    </CardTitle>
                    <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs">
                      {achievements.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {achievements.slice(0, 6).map((achievement) => (
                        <AchievementBadge
                          key={achievement.id}
                          achievement={achievement}
                          size="sm"
                          unlocked={true}
                        />
                      ))}
                      {achievements.length > 6 && (
                        <Link href="/profile#achievements">
                          <Badge variant="outline" className="h-7 sm:h-8 px-2 sm:px-3 cursor-pointer hover:bg-primary/10 text-xs">
                            +{achievements.length - 6} more
                          </Badge>
                        </Link>
                      )}
                    </div>
                    {stats && (
                      <div className="pt-2 border-t border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">Total Points</span>
                          <span className="font-semibold text-yellow-700 dark:text-yellow-300">
                            {stats.totalPoints || 0}
                          </span>
                        </div>
                      </div>
                    )}
                    <Link href="/profile#achievements">
                      <Button variant="outline" size="sm" className="w-full mt-2 text-xs sm:text-sm h-8 sm:h-9">
                        View All Achievements
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Archetype Badge - Middle Column */}
            {teacherProfile?.archetype && (
              <div className="lg:col-span-1">
                <Card className="p-4 sm:p-5 md:p-6 h-full bg-gradient-to-br from-card to-accent/5 border-accent/10 shadow-md hover:shadow-lg transition-shadow">
                  <ArchetypeBadge teacher={teacherProfile} showAnimation={true} />
                </Card>
              </div>
            )}

            {/* Next Steps - Right Column */}
            {teacherProfile && (
              <div className="lg:col-span-1">
                <Card className="p-4 sm:p-5 md:p-6 h-full bg-gradient-to-br from-card to-secondary/5 border-secondary/10 shadow-md hover:shadow-lg transition-shadow">
                  <NextStepsWidget
                    teacher={teacherProfile}
                    matchedJobsCount={matchedJobs?.length || 0}
                    unreadMessagesCount={unreadMessagesCount || 0}
                    recentApplicationsCount={applications?.filter(a => a.status === 'pending' || a.status === 'under_review').length || 0}
                  />
                </Card>
              </div>
            )}
          </div>

          {/* Quick Stats - Phase 1 */}
          {applicationStats && profileViewStats && (
            <DashboardStats
              applicationsCount={applicationStats.total}
              applicationsThisWeek={applicationStats.thisWeek}
              profileViews={profileViewStats.total}
              profileViewsThisWeek={profileViewStats.thisWeek}
              activeConversations={conversationsCount || 0}
              unreadMessages={unreadMessagesCount || 0}
              savedJobsCount={savedJobsCount || 0}
              newMatches={matchedJobs?.length || 0}
            />
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Left Column - Applications Timeline */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Application Status Timeline */}
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 xs:gap-4 mb-4 sm:mb-6">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold mb-1 break-words">Application Status</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Track all your job applications</p>
                  </div>
                  <Link href="/teacher/applications" className="w-full xs:w-auto">
                    <Button variant="outline" size="sm" className="w-full xs:w-auto text-xs sm:text-sm h-9 sm:h-10">
                      View All
                    </Button>
                  </Link>
                </div>

                {applicationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : applications && applications.length > 0 ? (
                  <div className="space-y-4">
                    {applications.slice(0, 5).map((application) => (
                      <div
                        key={application.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedApplication(application)}
                      >
                        <ApplicationTimeline application={application} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="file"
                    title="No applications yet"
                    description="You haven't applied to any jobs yet. Browse jobs to get started!"
                    action={{
                      label: "Browse Jobs",
                      href: "/jobs"
                    }}
                  />
                )}
              </Card>

              {/* Recommended Jobs */}
              <RecommendedJobs
                jobs={recommendedJobs || []}
                teacherArchetype={teacherProfile?.archetype || undefined}
                isLoading={jobsLoading}
              />
            </div>

            {/* Right Column - Widgets */}
            <div className="space-y-6">
              {/* Profile Completion Widget */}
              {teacherProfile && (
                <ProfileCompletionWidget teacher={teacherProfile} />
              )}

              {/* Profile Analytics */}
              {teacherProfile?.id && (
                <ProfileAnalyticsChart teacherId={teacherProfile.id} />
              )}
            </div>
          </div>

          {/* Tabs for Applications and Matched Jobs */}
          <Card className="p-4 sm:p-5 md:p-6 lg:p-8 bg-card border-border shadow-md">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <TabsList className="grid w-full min-w-[280px] grid-cols-3 mb-4 sm:mb-6 md:mb-8 bg-muted/50 p-1 sm:p-1.5 rounded-lg">
                  <TabsTrigger 
                    value="applications" 
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                  >
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Applications</span>
                    <span className="xs:hidden">Apps</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="matches"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                  >
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Matched Jobs</span>
                    <span className="xs:hidden">Matches</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="favorites"
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                  >
                    <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Favorites</span>
                    <span className="xs:hidden">Saved</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="applications" className="space-y-4 mt-0">
                <div id="applications" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 break-words">Your Applications</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Track the status of your job applications</p>
                  </div>
                  <Link href="/jobs" className="w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base" data-testid="link-browse-jobs">
                      <Briefcase className="h-4 w-4" />
                      Browse Jobs
                    </Button>
                  </Link>
                </div>

            {applicationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : applicationsError ? (
              <EmptyState
                icon="alert"
                title="Error loading applications"
                description={applicationsError instanceof Error ? applicationsError.message : 'Failed to load your applications. Please try again.'}
                action={{
                  label: "Retry",
                  onClick: () => window.location.reload()
                }}
              />
            ) : applications && applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <ApplicationTimeline
                    key={application.id}
                    application={application}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="file"
                title="No applications yet"
                description="Start applying to teaching positions! Your applications will appear here with status updates and next steps."
                action={{
                  label: "Browse Jobs",
                  href: "/jobs"
                }}
              />
            )}
          </TabsContent>

              {/* Matched Jobs Tab */}
              <TabsContent value="matches" className="space-y-4 mt-0">
                <div id="matches" className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2 break-words">Matched Jobs</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Jobs matched to your teaching archetype and preferences</p>
                </div>

            {matchesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : matchesError ? (
              <EmptyState
                icon="alert"
                title="Error loading matches"
                description={matchesError instanceof Error ? matchesError.message : 'Failed to load job matches. Please try again.'}
                action={{
                  label: "Retry",
                  onClick: () => window.location.reload()
                }}
              />
            ) : matchedJobs && matchedJobs.length > 0 ? (
              <div className="space-y-4">
                {matchedJobs.map((match) => (
                  <div key={match.id} className="relative">
                    <JobCard
                      job={match.job}
                      showQuickApply={true}
                      matchScore={match.match_score}
                    />
                    {/* Action Buttons - Mobile Optimized */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 flex gap-1.5 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => favoriteMutation.mutate({ matchId: match.id, isFavorited: !match.is_favorited })}
                        className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                        aria-label={match.is_favorited ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart className={`h-4 w-4 sm:h-4 sm:w-4 ${match.is_favorited ? 'fill-primary text-primary' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => hideMutation.mutate({ matchId: match.id })}
                        className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                        aria-label="Hide job"
                      >
                        <X className="h-4 w-4 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    {match.match_reason && (
                      <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-xs text-muted-foreground">
                          <strong>Why this matches:</strong> {match.match_reason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">No matched jobs yet</p>
                <p className="text-sm text-muted-foreground">
                  Complete your profile and archetype quiz to see personalized job matches
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Favorites Tab */}
              <TabsContent value="favorites" className="space-y-4 mt-0">
                <div id="favorites" className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2 break-words">Favorited Jobs</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Jobs you've saved for later</p>
                </div>

            {favoritedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : favoritedJobs && favoritedJobs.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {favoritedJobs.map((match) => (
                  <Card key={match.id} className="p-3 sm:p-4 hover-elevate">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/jobs/${match.job.id}`}>
                          <a className="block">
                            <h3 className="text-base sm:text-lg font-semibold text-primary hover:underline mb-1 break-words">{match.job.title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">{match.job.school_name}</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              <Badge variant="secondary" className="rounded-full text-xs">
                                {match.job.subject}
                              </Badge>
                              <Badge variant="secondary" className="rounded-full text-xs">
                                {match.job.location}
                              </Badge>
                            </div>
                          </a>
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => favoriteMutation.mutate({ matchId: match.id, isFavorited: false })}
                        className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 touch-manipulation"
                        aria-label="Remove from favorites"
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">No favorited jobs yet</p>
                <p className="text-sm text-muted-foreground">
                  Favorite jobs you're interested in to save them for later
                </p>
              </Card>
            )}
          </TabsContent>
            </Tabs>
          </Card>

          {/* Archetype Growth Resources */}
          {teacherProfile?.archetype && (
            <div className="mt-8">
              <ArchetypeGrowthResources teacher={teacherProfile} />
            </div>
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          open={!!selectedApplication}
          onOpenChange={(open) => !open && setSelectedApplication(null)}
        />
      )}
    </AuthenticatedLayout>
  );

  return (
    <ProfileCompletionGate>
      {content}
    </ProfileCompletionGate>
  );
}
