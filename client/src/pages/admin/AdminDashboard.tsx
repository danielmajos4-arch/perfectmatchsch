/**
 * Admin Dashboard
 * 
 * Main overview page for platform administrators
 * Shows key stats, recent activity, and quick insights
 */

import { useQuery } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  UserPlus, 
  Building2, 
  GraduationCap,
  Clock,
  ArrowRight,
  Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';

interface PlatformStats {
  totalUsers: number;
  totalTeachers: number;
  totalSchools: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  newUsersLast7Days: number;
  newApplicationsLast7Days: number;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface RecentJob {
  id: string;
  title: string;
  school_name: string;
  is_active: boolean;
  posted_at: string;
}

export default function AdminDashboard() {
  // Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      // Fetch all counts in parallel
      const [
        usersResult,
        teachersResult,
        schoolsResult,
        jobsResult,
        activeJobsResult,
        applicationsResult,
        newUsersResult,
        newApplicationsResult,
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'school'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('applications').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoISO),
        supabase.from('applications').select('id', { count: 'exact', head: true }).gte('applied_at', sevenDaysAgoISO),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        totalSchools: schoolsResult.count || 0,
        totalJobs: jobsResult.count || 0,
        activeJobs: activeJobsResult.count || 0,
        totalApplications: applicationsResult.count || 0,
        newUsersLast7Days: newUsersResult.count || 0,
        newApplicationsLast7Days: newApplicationsResult.count || 0,
      };
    },
  });

  // Fetch recent users
  const { data: recentUsers, isLoading: usersLoading } = useQuery<RecentUser[]>({
    queryKey: ['admin-recent-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent jobs
  const { data: recentJobs, isLoading: jobsLoading } = useQuery<RecentJob[]>({
    queryKey: ['admin-recent-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, school_name, is_active, posted_at')
        .order('posted_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'default';
      case 'school':
        return 'secondary';
      case 'admin':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AuthenticatedLayout showMobileNav>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Platform overview and management
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Users</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Teachers</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalTeachers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Schools</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalSchools}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Active Jobs</span>
                </div>
                <p className="text-3xl font-bold">{stats.activeJobs}</p>
                <p className="text-xs text-muted-foreground mt-1">of {stats.totalJobs} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Applications</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalApplications}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <UserPlus className="h-5 w-5 text-cyan-500" />
                  <span className="text-sm text-muted-foreground">New Users (7d)</span>
                </div>
                <p className="text-3xl font-bold">{stats.newUsersLast7Days}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-5 w-5 text-pink-500" />
                  <span className="text-sm text-muted-foreground">New Apps (7d)</span>
                </div>
                <p className="text-3xl font-bold">{stats.newApplicationsLast7Days}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Total Jobs</span>
                </div>
                <p className="text-3xl font-bold">{stats.totalJobs}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Recent Activity Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Signups</CardTitle>
                <CardDescription>Latest users who joined the platform</CardDescription>
              </div>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentUsers && recentUsers.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(user.full_name || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Job Postings</CardTitle>
                <CardDescription>Latest jobs posted on the platform</CardDescription>
              </div>
              <Link href="/admin/jobs">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-1" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentJobs && recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{job.school_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={job.is_active ? 'default' : 'secondary'}>
                          {job.is_active ? 'Active' : 'Closed'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No jobs yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

