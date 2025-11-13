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
import { AchievementCollection, AchievementNotification } from '@/components/achievements';
import { useAchievements } from '@/hooks/useAchievements';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { EmptyState } from '@/components/EmptyState';
import { useLocation } from 'wouter';
import type { Application, Job, Teacher, Conversation } from '@shared/schema';
import type { TeacherJobMatch } from '@shared/matching';
import { formatDistanceToNow } from 'date-fns';

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

  const { data: applications, isLoading: applicationsLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ['/api/applications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*, job:jobs(*)')
        .eq('teacher_id', user?.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('applications');

  // Get teacher profile to access archetype_tags
  const { data: teacherProfile } = useQuery<Teacher>({
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
  });

  // Get matched jobs (Sprint 6) with real-time updates
  const { data: matchedJobs, isLoading: matchesLoading } = useQuery<(TeacherJobMatch & { job: Job })[]>({
    queryKey: ['/api/job-matches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getTeacherJobMatches(user.id, { favorited: false });
    },
    enabled: !!user?.id && !!teacherProfile?.archetype_tags,
    refetchInterval: 30000, // Refetch every 30 seconds
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, teacherProfile?.archetype_tags]);

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

  const stats = [
    {
      label: 'Active Applications',
      value: applications?.filter(a => a.status === 'pending' || a.status === 'under_review').length || 0,
      icon: Clock,
    },
    {
      label: 'Total Applications',
      value: applications?.length || 0,
      icon: FileText,
    },
    {
      label: 'Interviews',
      value: applications?.filter(a => a.status === 'accepted').length || 0,
      icon: CheckCircle,
    },
    {
      label: 'Unread Messages',
      value: unreadMessagesCount || 0,
      icon: MessageCircle,
      link: '/messages',
    },
    {
      label: 'Matched Jobs',
      value: matchedJobs?.length || 0,
      icon: TrendingUp,
    },
    {
      label: 'Favorites',
      value: favoritedJobs?.length || 0,
      icon: Heart,
    },
  ];

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

  return (
    <AuthenticatedLayout>
      {/* Achievement Notification */}
      <AchievementNotification
        achievement={newAchievement}
        onClose={dismissNotification}
        onViewAll={() => setLocation('/profile#achievements')}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto">
          {/* Header Section with Profile */}
          <div className="mb-10">
            <Card className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-card via-card to-primary/5 border-primary/10 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <Link href="/profile" className="group flex-shrink-0">
                  <div className="relative">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 cursor-pointer group-hover:scale-105 transition-all duration-300 border-4 border-primary/30 shadow-xl ring-4 ring-primary/10">
                      <AvatarImage src={teacherProfile?.profile_photo_url || undefined} alt={teacherProfile?.full_name || user?.user_metadata?.full_name || 'Teacher'} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-2xl">
                        {(teacherProfile?.full_name || user?.user_metadata?.full_name || 'Teacher')
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-background shadow-md"></div>
                  </div>
                </Link>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
                      Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'Teacher'}
                    </h1>
                    {teacherProfile?.archetype && (
                      <Badge className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 px-3 py-1 text-xs md:text-sm">
                        {teacherProfile.archetype}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Track your applications and discover new opportunities</p>
                  {/* Achievement Badges - Compact View */}
                  {achievements.length > 0 && user?.id && (
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <span className="text-xs text-muted-foreground">Achievements:</span>
                      <AchievementCollection userId={user.id} compact={true} />
                    </div>
                  )}
                  {teacherProfile && (
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 flex-shrink-0" />
                        <span>{teacherProfile.subjects?.length || 0} Subjects</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="h-4 w-4 flex-shrink-0" />
                        <span>{teacherProfile.years_experience || 'N/A'} Experience</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{teacherProfile.location || 'Location not set'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Stats & Widgets Grid - Mobile First */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 md:mb-8">
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

            {/* Archetype Badge - Middle Column */}
            {teacherProfile?.archetype && (
              <div className="lg:col-span-1">
                <Card className="p-6 h-full bg-gradient-to-br from-card to-accent/5 border-accent/10 shadow-md hover:shadow-lg transition-shadow">
                  <ArchetypeBadge teacher={teacherProfile} showAnimation={true} />
                </Card>
              </div>
            )}

            {/* Next Steps - Right Column */}
            {teacherProfile && (
              <div className="lg:col-span-1">
                <Card className="p-6 h-full bg-gradient-to-br from-card to-secondary/5 border-secondary/10 shadow-md hover:shadow-lg transition-shadow">
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

          {/* Stats Grid - Enhanced */}
          {/* Stats Grid - Mobile First */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-10">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const isHighlighted = stat.label === 'Unread Messages' && stat.value > 0;
              const content = (
                <Card 
                  key={stat.label} 
                  className={`p-5 md:p-6 hover-elevate cursor-pointer transition-all duration-300 ${
                    isHighlighted 
                      ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-lg ring-2 ring-primary/20' 
                      : 'bg-card border-border hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${
                      isHighlighted 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className={`h-4 w-4 md:h-5 md:w-5 ${isHighlighted ? 'text-primary' : ''}`} />
                    </div>
                    {isHighlighted && (
                      <Badge variant="destructive" className="rounded-full text-xs px-2 py-0.5 animate-pulse">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                  <span className="text-xs md:text-sm text-muted-foreground font-medium">{stat.label}</span>
                </Card>
              );
              return stat.link ? (
                <Link key={stat.label} href={stat.link} className="block">
                  {content}
                </Link>
              ) : (
                content
              );
            })}
          </div>

          {/* Tabs for Applications and Matched Jobs */}
          <Card className="p-6 md:p-8 bg-card border-border shadow-md">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 md:mb-8 bg-muted/50 p-1 sm:p-1.5 rounded-lg">
                <TabsTrigger 
                  value="applications" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Applications
                </TabsTrigger>
                <TabsTrigger 
                  value="matches"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Matched Jobs
                </TabsTrigger>
                <TabsTrigger 
                  value="favorites"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Favorites
                </TabsTrigger>
              </TabsList>

              <TabsContent value="applications" className="space-y-4 mt-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Your Applications</h2>
                    <p className="text-sm text-muted-foreground">Track the status of your job applications</p>
                  </div>
                  <Link href="/jobs" className="w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 w-full sm:w-auto h-11" data-testid="link-browse-jobs">
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
                <div className="mb-6 pb-4 border-b border-border">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Matched Jobs</h2>
                  <p className="text-sm text-muted-foreground">Jobs matched to your teaching archetype and preferences</p>
                </div>

            {matchesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
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
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => favoriteMutation.mutate({ matchId: match.id, isFavorited: !match.is_favorited })}
                        className="h-10 w-10 sm:h-8 sm:w-8"
                      >
                        <Heart className={`h-5 w-5 sm:h-4 sm:w-4 ${match.is_favorited ? 'fill-primary text-primary' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => hideMutation.mutate({ matchId: match.id })}
                        className="h-10 w-10 sm:h-8 sm:w-8"
                      >
                        <X className="h-5 w-5 sm:h-4 sm:w-4" />
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
                <div className="mb-6 pb-4 border-b border-border">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Favorited Jobs</h2>
                  <p className="text-sm text-muted-foreground">Jobs you've saved for later</p>
                </div>

            {favoritedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : favoritedJobs && favoritedJobs.length > 0 ? (
              <div className="space-y-4">
                {favoritedJobs.map((match) => (
                  <Card key={match.id} className="p-4 hover-elevate">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link href={`/jobs/${match.job.id}`}>
                          <a className="block">
                            <h3 className="text-lg font-semibold text-primary hover:underline mb-1">{match.job.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{match.job.school_name}</p>
                            <div className="flex flex-wrap gap-2">
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
    </AuthenticatedLayout>
  );
}
