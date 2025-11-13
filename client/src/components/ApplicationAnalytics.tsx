/**
 * Application Analytics Component
 * 
 * Track and display application statistics and trends
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  BarChart3,
  Target,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Application } from '@shared/schema';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface ApplicationAnalyticsProps {
  userId: string;
}

export function ApplicationAnalytics({ userId }: ApplicationAnalyticsProps) {
  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ['/api/applications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('teacher_id', userId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg text-muted-foreground mb-2">No applications yet</p>
        <p className="text-sm text-muted-foreground">
          Start applying to jobs to see your analytics
        </p>
      </Card>
    );
  }

  // Calculate statistics
  const totalApplications = applications.length;
  const pending = applications.filter(a => a.status === 'pending' || a.status === 'under_review').length;
  const accepted = applications.filter(a => a.status === 'hired' || a.status === 'accepted' || a.status === 'shortlisted').length;
  const rejected = applications.filter(a => a.status === 'rejected').length;
  const successRate = totalApplications > 0 ? (accepted / totalApplications) * 100 : 0;
  const responseRate = totalApplications > 0 ? ((totalApplications - pending) / totalApplications) * 100 : 0;

  // Calculate trends (last 30 days vs previous 30 days)
  const now = new Date();
  const last30Days = applications.filter(a => 
    new Date(a.applied_at) >= subDays(now, 30)
  ).length;
  const previous30Days = applications.filter(a => {
    const appliedDate = new Date(a.applied_at);
    return appliedDate >= subDays(now, 60) && appliedDate < subDays(now, 30);
  }).length;
  const trend = last30Days - previous30Days;
  const trendPercentage = previous30Days > 0 
    ? ((last30Days - previous30Days) / previous30Days) * 100 
    : last30Days > 0 ? 100 : 0;

  // Monthly breakdown
  const currentMonth = applications.filter(a => {
    const appliedDate = new Date(a.applied_at);
    return appliedDate >= startOfMonth(now) && appliedDate <= endOfMonth(now);
  }).length;
  const lastMonth = applications.filter(a => {
    const appliedDate = new Date(a.applied_at);
    const lastMonthStart = startOfMonth(subDays(now, 30));
    const lastMonthEnd = endOfMonth(subDays(now, 30));
    return appliedDate >= lastMonthStart && appliedDate <= lastMonthEnd;
  }).length;

  // Status distribution
  const statusDistribution = {
    pending: applications.filter(a => a.status === 'pending' || a.status === 'under_review').length,
    contacted: applications.filter(a => a.status === 'contacted' || a.status === 'shortlisted').length,
    accepted: applications.filter(a => a.status === 'hired' || a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const stats = [
    {
      label: 'Total Applications',
      value: totalApplications,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      icon: Target,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Response Rate',
      value: `${responseRate.toFixed(1)}%`,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'This Month',
      value: currentMonth,
      icon: Calendar,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Application Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track your application performance and trends
        </p>
      </div>

      {/* Stats Grid - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`${stat.bgColor} border-0`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  {stat.label === 'This Month' && lastMonth > 0 && (
                    <div className="flex items-center gap-1">
                      {currentMonth > lastMonth ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : currentMonth < lastMonth ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span className={`text-xs font-medium ${
                        currentMonth > lastMonth ? 'text-green-500' : 
                        currentMonth < lastMonth ? 'text-red-500' : 
                        'text-muted-foreground'
                      }`}>
                        {currentMonth > lastMonth ? '+' : currentMonth < lastMonth ? '-' : ''}
                        {Math.abs(currentMonth - lastMonth)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Application Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Last 30 Days</p>
              <p className="text-2xl font-bold">{last30Days} applications</p>
            </div>
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-green-500 font-semibold">+{trend}</span>
                </>
              ) : trend < 0 ? (
                <>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span className="text-red-500 font-semibold">{trend}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No change</span>
              )}
            </div>
          </div>
          {previous30Days > 0 && (
            <p className="text-xs text-muted-foreground">
              {trendPercentage > 0 ? 'Up' : trendPercentage < 0 ? 'Down' : 'No change'} {Math.abs(trendPercentage).toFixed(1)}% from previous 30 days
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Pending/Under Review</span>
                </div>
                <span className="text-sm font-semibold">{statusDistribution.pending}</span>
              </div>
              <Progress 
                value={(statusDistribution.pending / totalApplications) * 100} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Contacted/Shortlisted</span>
                </div>
                <span className="text-sm font-semibold">{statusDistribution.contacted}</span>
              </div>
              <Progress 
                value={(statusDistribution.contacted / totalApplications) * 100} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Accepted/Hired</span>
                </div>
                <span className="text-sm font-semibold">{statusDistribution.accepted}</span>
              </div>
              <Progress 
                value={(statusDistribution.accepted / totalApplications) * 100} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Rejected</span>
                </div>
                <span className="text-sm font-semibold">{statusDistribution.rejected}</span>
              </div>
              <Progress 
                value={(statusDistribution.rejected / totalApplications) * 100} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Accepted</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{accepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Rejected</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{rejected}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

