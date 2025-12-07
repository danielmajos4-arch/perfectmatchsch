import { Card, CardContent } from '@/components/ui/card';
import { FileText, Eye, MessageCircle, Star, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';

interface StatCard {
  label: string;
  value: number | string;
  change?: string;
  icon: typeof FileText;
  link?: string;
  color?: string;
}

interface DashboardStatsProps {
  applicationsCount: number;
  applicationsThisWeek: number;
  profileViews: number;
  profileViewsThisWeek: number;
  activeConversations: number;
  unreadMessages: number;
  savedJobsCount: number;
  newMatches?: number;
}

export function DashboardStats({
  applicationsCount,
  applicationsThisWeek,
  profileViews,
  profileViewsThisWeek,
  activeConversations,
  unreadMessages,
  savedJobsCount,
  newMatches = 0,
}: DashboardStatsProps) {
  const stats: StatCard[] = [
    {
      label: 'Applications Sent',
      value: applicationsCount,
      change: applicationsThisWeek > 0 ? `+${applicationsThisWeek} this week` : undefined,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Profile Views',
      value: profileViews,
      change: profileViewsThisWeek > 0 ? `+${profileViewsThisWeek} this week` : undefined,
      icon: Eye,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Active Conversations',
      value: activeConversations,
      change: unreadMessages > 0 ? `${unreadMessages} unread` : undefined,
      icon: MessageCircle,
      link: '/messages',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Saved Jobs',
      value: savedJobsCount,
      change: newMatches > 0 ? `${newMatches} new matches` : undefined,
      icon: Star,
      link: '/teacher/saved-jobs',
      color: 'text-yellow-600 dark:text-yellow-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const content = (
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-muted ${stat.color || ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {stat.change && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {stat.change}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );

        return stat.link ? (
          <Link key={stat.label} href={stat.link}>
            {content}
          </Link>
        ) : (
          <div key={stat.label}>{content}</div>
        );
      })}
    </div>
  );
}
