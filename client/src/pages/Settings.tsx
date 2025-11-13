/**
 * Settings Page
 * 
 * User settings including email preferences, account settings, etc.
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Bell, Shield, User } from 'lucide-react';

interface EmailPreferences {
  id: string;
  user_id: string;
  email_notifications_enabled: boolean;
  new_candidate_match: boolean;
  new_job_match: boolean;
  application_status_update: boolean;
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly' | 'never';
  digest_time: string;
  digest_day: number;
  unsubscribe_token: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences | null>(null);

  // Get initial tab from URL
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || 'email';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!user) {
      setLocation('/login');
      return;
    }

    loadEmailPreferences();
  }, [user]);

  // Handle unsubscribe action from email link
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'unsubscribe' && user) {
      handleUnsubscribe();
    }
  }, [user]);

  async function loadEmailPreferences() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_or_create_email_preferences', { p_user_id: user.id });

      if (error) throw error;

      setEmailPreferences(data);
    } catch (error: any) {
      console.error('Error loading email preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveEmailPreferences() {
    if (!user || !emailPreferences) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_email_preferences')
        .update({
          email_notifications_enabled: emailPreferences.email_notifications_enabled,
          new_candidate_match: emailPreferences.new_candidate_match,
          new_job_match: emailPreferences.new_job_match,
          application_status_update: emailPreferences.application_status_update,
          digest_enabled: emailPreferences.digest_enabled,
          digest_frequency: emailPreferences.digest_frequency,
          digest_time: emailPreferences.digest_time,
          digest_day: emailPreferences.digest_day,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email preferences saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving email preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsubscribe() {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('unsubscribe_by_token', {
        p_token: searchParams.get('token') || '',
      });

      if (error) throw error;

      // Reload preferences
      await loadEmailPreferences();

      toast({
        title: 'Unsubscribed',
        description: 'You have been unsubscribed from all email notifications',
      });

      // Remove action from URL
      setLocation('/settings?tab=email');
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Error',
        description: 'Failed to unsubscribe',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!emailPreferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load settings. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and notifications</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>

          {/* Email Preferences Tab */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Preferences</CardTitle>
                <CardDescription>
                  Control how and when you receive email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Master Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-enabled" className="text-base font-semibold">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable all email notifications
                    </p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={emailPreferences.email_notifications_enabled}
                    onCheckedChange={(checked) =>
                      setEmailPreferences({
                        ...emailPreferences,
                        email_notifications_enabled: checked,
                      })
                    }
                  />
                </div>

                {/* Individual Notification Types */}
                {emailPreferences.email_notifications_enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="new-candidate-match">New Candidate Matches</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when new candidates match your job postings
                        </p>
                      </div>
                      <Switch
                        id="new-candidate-match"
                        checked={emailPreferences.new_candidate_match}
                        onCheckedChange={(checked) =>
                          setEmailPreferences({
                            ...emailPreferences,
                            new_candidate_match: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="new-job-match">New Job Matches</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when new jobs match your profile
                        </p>
                      </div>
                      <Switch
                        id="new-job-match"
                        checked={emailPreferences.new_job_match}
                        onCheckedChange={(checked) =>
                          setEmailPreferences({
                            ...emailPreferences,
                            new_job_match: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="application-status">Application Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when your application status changes
                        </p>
                      </div>
                      <Switch
                        id="application-status"
                        checked={emailPreferences.application_status_update}
                        onCheckedChange={(checked) =>
                          setEmailPreferences({
                            ...emailPreferences,
                            application_status_update: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Digest Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="digest-enabled">Email Digest</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive a summary of activity via email
                      </p>
                    </div>
                    <Switch
                      id="digest-enabled"
                      checked={emailPreferences.digest_enabled}
                      onCheckedChange={(checked) =>
                        setEmailPreferences({
                          ...emailPreferences,
                          digest_enabled: checked,
                        })
                      }
                    />
                  </div>

                  {emailPreferences.digest_enabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                      <div className="space-y-2">
                        <Label htmlFor="digest-frequency">Digest Frequency</Label>
                        <Select
                          value={emailPreferences.digest_frequency}
                          onValueChange={(value: 'daily' | 'weekly' | 'never') =>
                            setEmailPreferences({
                              ...emailPreferences,
                              digest_frequency: value,
                            })
                          }
                        >
                          <SelectTrigger id="digest-frequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {emailPreferences.digest_frequency === 'weekly' && (
                        <div className="space-y-2">
                          <Label htmlFor="digest-day">Day of Week</Label>
                          <Select
                            value={emailPreferences.digest_day.toString()}
                            onValueChange={(value) =>
                              setEmailPreferences({
                                ...emailPreferences,
                                digest_day: parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger id="digest-day">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dayNames.map((day, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="digest-time">Time</Label>
                        <input
                          id="digest-time"
                          type="time"
                          value={emailPreferences.digest_time}
                          onChange={(e) =>
                            setEmailPreferences({
                              ...emailPreferences,
                              digest_time: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={saveEmailPreferences} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab (Placeholder) */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>In-App Notifications</CardTitle>
                <CardDescription>
                  Manage your in-app notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  In-app notification settings coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab (Placeholder) */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Account settings coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab (Placeholder) */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Manage your privacy and data preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Privacy settings coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

