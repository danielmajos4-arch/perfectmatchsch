/**
 * Notifications Page
 * 
 * Full page view of all notifications
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  InAppNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notificationService';
import { Bell, Check, CheckCheck, Star, User, FileText, MessageCircle, Trophy, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '@/components/EmptyState';

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch all notifications
  const { data: notifications = [], isLoading } = useQuery<InAppNotification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getUserNotifications(user.id, { limit: 100 });
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notification-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      return await getUnreadCount(user.id);
    },
    enabled: !!user?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notification-count', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notification-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;
      return await markNotificationRead(notificationId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notification-count', user?.id] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return 0;
      return await markAllNotificationsRead(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notification-count', user?.id] });
    },
  });

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.is_read && user?.id) {
      markReadMutation.mutate(notification.id);
    }

    if (notification.link_url) {
      setLocation(notification.link_url);
    }
  };

  const getNotificationIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'new_job_match':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'new_candidate_match':
        return <User className="h-5 w-5 text-primary" />;
      case 'application_status':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      case 'achievement_unlocked':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'job_posted':
        return <Briefcase className="h-5 w-5 text-primary" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (!user) return null;

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <AuthenticatedLayout>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Notifications</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              className="gap-2 h-11"
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No notifications yet"
            description="When you receive notifications about job matches, applications, or messages, they'll appear here."
          />
        ) : (
          <div className="space-y-4">
            {/* Unread Notifications */}
            {unreadNotifications.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-foreground">Unread</h2>
                <div className="space-y-3">
                  {unreadNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkRead={() => markReadMutation.mutate(notification.id)}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Read Notifications */}
            {readNotifications.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Read</h2>
                <div className="space-y-3">
                  {readNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkRead={() => markReadMutation.mutate(notification.id)}
                      getIcon={getNotificationIcon}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

interface NotificationCardProps {
  notification: InAppNotification;
  onClick: () => void;
  onMarkRead: () => void;
  getIcon: (type: InAppNotification['type']) => React.ReactNode;
}

function NotificationCard({
  notification,
  onClick,
  onMarkRead,
  getIcon,
}: NotificationCardProps) {
  return (
    <Card
      className={`p-4 md:p-6 hover:bg-muted/50 transition-colors cursor-pointer ${
        !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          {notification.icon ? (
            <span className="text-2xl">{notification.icon}</span>
          ) : (
            <div className="p-2 rounded-full bg-muted">
              {getIcon(notification.type)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-base font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {notification.title}
                </p>
                {!notification.is_read && (
                  <Badge variant="default" className="h-5 px-1.5 text-xs">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
          {notification.link_text && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-2 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              {notification.link_text} →
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

