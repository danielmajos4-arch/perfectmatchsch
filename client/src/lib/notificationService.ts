/**
 * In-App Notification Service
 * 
 * Handles creating, fetching, and managing in-app notifications
 */

import { supabase } from './supabaseClient';

export interface InAppNotification {
  id: string;
  user_id: string;
  type: 'new_job_match' | 'new_candidate_match' | 'new_application' | 'application_status' | 'message' | 'profile_viewed' | 'achievement_unlocked' | 'job_posted' | 'candidate_contacted';
  title: string;
  message: string;
  link_url: string | null;
  link_text: string | null;
  icon: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  type: InAppNotification['type'],
  title: string,
  message: string,
  options?: {
    linkUrl?: string;
    linkText?: string;
    icon?: string;
    metadata?: Record<string, any>;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_link_url: options?.linkUrl || null,
      p_link_text: options?.linkText || null,
      p_icon: options?.icon || null,
      p_metadata: options?.metadata || {},
    });

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
  }
): Promise<InAppNotification[]> {
  try {
    let query = supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_unread_notification_count', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in markNotificationRead:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error marking all as read:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in markAllNotificationsRead:', error);
    return 0;
  }
}

/**
 * Notification creation helpers for common scenarios
 */

export async function notifyNewJobMatch(
  userId: string,
  jobId: string,
  jobTitle: string,
  matchScore: number
): Promise<void> {
  await createNotification(
    userId,
    'new_job_match',
    'New Job Match!',
    `You have a ${matchScore}% match for "${jobTitle}"`,
    {
      linkUrl: `/jobs/${jobId}`,
      linkText: 'View Job',
      icon: '⭐',
      metadata: { job_id: jobId, match_score: matchScore },
    }
  );
}

export async function notifyNewCandidateMatch(
  userId: string,
  candidateId: string,
  candidateName: string,
  jobTitle: string
): Promise<void> {
  await createNotification(
    userId,
    'new_candidate_match',
    'New Candidate Match!',
    `${candidateName} matched to "${jobTitle}"`,
    {
      linkUrl: `/school/dashboard?candidate=${candidateId}`,
      linkText: 'View Candidate',
      icon: '👤',
      metadata: { candidate_id: candidateId, job_title: jobTitle },
    }
  );
}

export async function notifyApplicationStatusUpdate(
  userId: string,
  applicationId: string,
  jobTitle: string,
  status: string
): Promise<void> {
  await createNotification(
    userId,
    'application_status',
    'Application Update',
    `Your application for "${jobTitle}" has been updated to ${status}`,
    {
      linkUrl: '/teacher/dashboard',
      linkText: 'View Application',
      icon: '📝',
      metadata: { application_id: applicationId, status },
    }
  );
}

export async function notifyNewMessage(
  userId: string,
  conversationId: string,
  senderName: string
): Promise<void> {
  await createNotification(
    userId,
    'message',
    'New Message',
    `You have a new message from ${senderName}`,
    {
      linkUrl: `/messages?conversation=${conversationId}`,
      linkText: 'View Message',
      icon: '💬',
      metadata: { conversation_id: conversationId },
    }
  );
}

export async function notifyAchievementUnlocked(
  userId: string,
  achievementName: string,
  achievementId: string
): Promise<void> {
  await createNotification(
    userId,
    'achievement_unlocked',
    'Achievement Unlocked!',
    `You unlocked the "${achievementName}" achievement`,
    {
      linkUrl: '/profile#achievements',
      linkText: 'View Achievement',
      icon: '🏆',
      metadata: { achievement_id: achievementId },
    }
  );
}

export async function notifyNewApplication(
  schoolUserId: string,
  applicationId: string,
  teacherName: string,
  jobTitle: string
): Promise<void> {
  await createNotification(
    schoolUserId,
    'new_application',
    'New Application Received! 🎉',
    `${teacherName} applied for "${jobTitle}"`,
    {
      linkUrl: `/school/dashboard#applications`,
      linkText: 'View Application',
      icon: '📨',
      metadata: { application_id: applicationId, job_title: jobTitle, teacher_name: teacherName },
    }
  );
}

export async function notifyJobPostedToTeachers(
  teacherUserIds: string[],
  jobId: string,
  jobTitle: string,
  schoolName: string
): Promise<void> {
  // Create notifications for all matching teachers with timeout
  const notificationTimeout = 10000; // 10 seconds for all notifications
  const promises = teacherUserIds.map(userId =>
    createNotification(
      userId,
      'new_job_match',
      'New Job Match!',
      `${schoolName} posted a job that matches your profile: "${jobTitle}"`,
      {
        linkUrl: `/jobs/${jobId}`,
        linkText: 'View Job',
        icon: '🎯',
        metadata: { job_id: jobId, school_name: schoolName },
      }
    )
  );

  const notificationsPromise = Promise.all(promises);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Notifications timed out')), notificationTimeout);
  });

  try {
    await Promise.race([notificationsPromise, timeoutPromise]);
  } catch (error: any) {
    if (error.message?.includes('timed out')) {
      console.warn('notifyJobPostedToTeachers: Notifications timed out, some may not have been sent');
      // Don't throw - allow job creation to succeed even if notifications fail
    } else {
      throw error;
    }
  }
}

