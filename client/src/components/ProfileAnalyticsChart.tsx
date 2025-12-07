import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Eye } from 'lucide-react';
import { getProfileViewStats, type ProfileViewStats } from '@/lib/analyticsService';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface ProfileAnalyticsChartProps {
  teacherId: string;
}

export function ProfileAnalyticsChart({ teacherId }: ProfileAnalyticsChartProps) {
  const { data: stats, isLoading } = useQuery<ProfileViewStats>({
    queryKey: ['/api/profile-views', teacherId],
    queryFn: () => getProfileViewStats(teacherId),
    enabled: !!teacherId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const maxViews = Math.max(...stats.weeklyData.map(d => d.count), 1);
  const weekChange = stats.thisWeek > 0 
    ? ((stats.thisWeek - (stats.total - stats.thisMonth)) / Math.max(stats.total - stats.thisMonth, 1)) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Views
          </CardTitle>
          {weekChange > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+{Math.round(weekChange)}% this week</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Views</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.thisWeek}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>

          {/* Simple bar chart */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Last 30 Days</p>
            <div className="flex items-end gap-1 h-32">
              {stats.weeklyData.map((day, index) => {
                const height = (day.count / maxViews) * 100;
                const isToday = index === stats.weeklyData.length - 1;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isToday
                          ? 'bg-primary'
                          : 'bg-muted group-hover:bg-primary/50'
                      }`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${format(new Date(day.date), 'MMM d')}: ${day.count} views`}
                    />
                    {index % 7 === 0 && (
                      <span className="text-xs text-muted-foreground rotate-45 origin-top-left whitespace-nowrap">
                        {format(new Date(day.date), 'MMM d')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {stats.thisWeek > 0 && weekChange > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary">
                Your profile is trending! +{Math.round(weekChange)}% views this week
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
