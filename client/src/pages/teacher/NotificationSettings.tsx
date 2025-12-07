import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, Bell, Eye, MessageCircle, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  id: string;
  user_id: string;
  email_application_updates: boolean;
  email_new_matches: boolean;
  email_messages: boolean;
  email_profile_views: boolean;
  email_marketing: boolean;
  email_weekly_digest: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Partial<NotificationPreferences>>({});

  // Get current preferences
  const { data: currentPrefs, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }
      
      return data as NotificationPreferences;
    },
    enabled: !!user?.id,
    onSuccess: (data) => {
      if (data) setPreferences(data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences', user?.id] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    updateMutation.mutate(newPrefs);
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto px-4 py-12">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
            <p className="text-muted-foreground">Manage how and when you receive notifications</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which email notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Application Updates */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="app-updates" className="text-base font-medium cursor-pointer">
                      Application Updates
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your application status changes
                    </p>
                  </div>
                </div>
                <Switch
                  id="app-updates"
                  checked={preferences.email_application_updates ?? true}
                  onCheckedChange={(checked) => handleToggle('email_application_updates', checked)}
                />
              </div>

              <Separator />

              {/* New Matches */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="new-matches" className="text-base font-medium cursor-pointer">
                      New Matching Jobs
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts when new jobs match your profile
                    </p>
                  </div>
                </div>
                <Switch
                  id="new-matches"
                  checked={preferences.email_new_matches ?? true}
                  onCheckedChange={(checked) => handleToggle('email_new_matches', checked)}
                />
              </div>

              <Separator />

              {/* Messages */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="messages" className="text-base font-medium cursor-pointer">
                      New Messages
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive new messages
                    </p>
                  </div>
                </div>
                <Switch
                  id="messages"
                  checked={preferences.email_messages ?? true}
                  onCheckedChange={(checked) => handleToggle('email_messages', checked)}
                />
              </div>

              <Separator />

              {/* Profile Views */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="profile-views" className="text-base font-medium cursor-pointer">
                      Profile Views
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Know when schools view your profile
                    </p>
                  </div>
                </div>
                <Switch
                  id="profile-views"
                  checked={preferences.email_profile_views ?? true}
                  onCheckedChange={(checked) => handleToggle('email_profile_views', checked)}
                />
              </div>

              <Separator />

              {/* Weekly Digest */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="weekly-digest" className="text-base font-medium cursor-pointer">
                      Weekly Digest
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of your activity
                    </p>
                  </div>
                </div>
                <Switch
                  id="weekly-digest"
                  checked={preferences.email_weekly_digest ?? true}
                  onCheckedChange={(checked) => handleToggle('email_weekly_digest', checked)}
                />
              </div>

              <Separator />

              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="marketing" className="text-base font-medium cursor-pointer">
                      Product Updates & Tips
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive tips, best practices, and platform updates
                    </p>
                  </div>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.email_marketing ?? false}
                  onCheckedChange={(checked) => handleToggle('email_marketing', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Keeping notifications enabled helps you stay on top of opportunities and respond quickly to schools.
            </p>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
