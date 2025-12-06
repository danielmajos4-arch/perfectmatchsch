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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Loader2, Mail, Bell, Shield, User, Camera, Trash2, Key, FileText, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

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
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences | null>(null);

  // Profile settings
  const [profileData, setProfileData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Account deletion
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

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
    setProfileData({
      fullName: user.user_metadata?.full_name || '',
      email: user.email || '',
    });
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user?.id) return;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated.',
      });

      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar.',
        variant: 'destructive',
      });
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profileData.fullName }
      });

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) throw new Error('Current password is incorrect');

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });

      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: 'Password change failed',
        description: error.message || 'Failed to change password.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast({
        title: 'Confirmation required',
        description: 'Please type DELETE to confirm account deletion.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Delete user account (this will cascade delete related records)
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');

      if (error) {
        // If admin API not available, sign out and show message
        await supabase.auth.signOut();
        toast({
          title: 'Account deletion requested',
          description: 'Please contact support to complete account deletion.',
        });
        setLocation('/login');
        return;
      }

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      setLocation('/login');
    } catch (error: any) {
      toast({
        title: 'Deletion failed',
        description: error.message || 'Failed to delete account. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadData = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Fetch all user data from different tables
      const [teacherData, schoolData, applicationsData, emailPrefsData] = await Promise.all([
        supabase.from('teachers').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('schools').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('applications').select('*').eq('user_id', user.id),
        supabase.from('user_email_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      // Compile user data
      const userData = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata,
        },
        teacher_profile: teacherData.data,
        school_profile: schoolData.data,
        applications: applicationsData.data,
        email_preferences: emailPrefsData.data,
        exported_at: new Date().toISOString(),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `perfectmatch-data-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data downloaded',
        description: 'Your data has been exported successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download data.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <AuthenticatedLayout>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your account preferences and notifications</p>
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

          {/* In-App Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>In-App Notifications</CardTitle>
                <CardDescription>
                  Control how you receive notifications within the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-enabled" className="text-base font-semibold">
                      Push Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive real-time notifications in your browser
                    </p>
                  </div>
                  <Switch id="push-enabled" defaultChecked />
                </div>

                {/* Notification Types */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Notify me about:</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-messages">New Messages</Label>
                      <p className="text-sm text-muted-foreground">
                        When you receive a new message
                      </p>
                    </div>
                    <Switch id="notif-messages" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-applications">Application Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Changes to your job applications
                      </p>
                    </div>
                    <Switch id="notif-applications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-matches">New Matches</Label>
                      <p className="text-sm text-muted-foreground">
                        When new opportunities match your profile
                      </p>
                    </div>
                    <Switch id="notif-matches" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notif-reminders">Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Deadlines and important dates
                      </p>
                    </div>
                    <Switch id="notif-reminders" defaultChecked />
                  </div>
                </div>

                {/* Notification Sound */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound-enabled" className="text-base font-semibold">
                      Sound Effects
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when you receive notifications
                    </p>
                  </div>
                  <Switch id="sound-enabled" defaultChecked />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button disabled={saving}>
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

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="space-y-4">
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarPreview || user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials(profileData.fullName || user?.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="h-11"
                      />
                      {avatarFile && (
                        <Button
                          size="sm"
                          onClick={handleAvatarUpload}
                          disabled={saving}
                          className="gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    className="h-11"
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profileData.email}
                    disabled
                    className="h-11 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>

                <Button onClick={handleProfileUpdate} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Theme Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the app looks on your device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      onClick={() => setTheme('light')}
                      className="gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      onClick={() => setTheme('dark')}
                      className="gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      onClick={() => setTheme('system')}
                      className="gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      System
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred color scheme. System will match your device settings.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your account password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {/* Account Deletion */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Permanently delete your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2 w-full sm:w-auto">
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <Label htmlFor="delete-confirm">
                        Type <strong>DELETE</strong> to confirm:
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="DELETE"
                        className="h-11"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleAccountDeletion}
                        disabled={deleteConfirm !== 'DELETE' || saving}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Account'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Manage your privacy and data preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow schools/teachers to view your profile
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Show Contact Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your contact information on your profile
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2">Data & Privacy</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We respect your privacy. Your data is encrypted and stored securely.
                    You can request a copy of your data or delete your account at any time.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleDownloadData}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Download My Data
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}

