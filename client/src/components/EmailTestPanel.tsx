/**
 * Email Test Panel Component
 * 
 * Development tool to test email notifications
 * Only shows in development mode
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { triggerEmailProcessing } from '@/lib/emailNotificationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

export function EmailTestPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState<'new_candidate_match' | 'new_job_match' | 'application_status' | 'digest'>('new_job_match');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  // Don't render if minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsMinimized(false)}
          className="shadow-lg"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email Panel
        </Button>
      </div>
    );
  }

  async function createTestNotification() {
    if (!testEmail || !user) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create a test notification in the queue
      const templateData: Record<string, any> = {};

      switch (testType) {
        case 'new_candidate_match':
          templateData.job_id = 'test-job-id';
          templateData.job_title = 'Test Job - Elementary Math Teacher';
          templateData.candidate_count = 3;
          templateData.school_name = 'Test School';
          break;
        case 'new_job_match':
          templateData.teacher_id = user.id;
          templateData.match_count = 2;
          break;
        case 'application_status':
          templateData.application_id = 'test-app-id';
          templateData.status = 'shortlisted';
          templateData.job_title = 'Test Job';
          templateData.school_name = 'Test School';
          break;
        case 'digest':
          templateData.digest_type = 'weekly';
          templateData.user_role = user.user_metadata?.role || 'teacher';
          templateData.summary_data = {
            newMatches: 5,
            newCandidates: 2,
            applications: 1,
          };
          break;
      }

      const { error } = await supabase
        .from('email_notifications')
        .insert({
          type: testType,
          recipient_email: testEmail,
          recipient_name: user.user_metadata?.name || 'Test User',
          subject: `Test ${testType.replace(/_/g, ' ')}`,
          template_data: templateData,
          status: 'pending',
          scheduled_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test notification created. Processing...',
      });

      // Process immediately
      await triggerEmailProcessing();

      toast({
        title: 'Success',
        description: 'Email should be sent shortly. Check your inbox!',
      });
    } catch (error: any) {
      console.error('Error creating test notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create test notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function processPendingNotifications() {
    setLoading(true);
    try {
      const result = await triggerEmailProcessing();
      toast({
        title: 'Success',
        description: `Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`,
      });
    } catch (error: any) {
      console.error('Error processing notifications:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function checkNotificationQueue() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const pending = data?.filter(n => n.status === 'pending').length || 0;
      const sent = data?.filter(n => n.status === 'sent').length || 0;
      const failed = data?.filter(n => n.status === 'failed').length || 0;

      toast({
        title: 'Notification Queue Status',
        description: `Pending: ${pending}, Sent: ${sent}, Failed: ${failed}`,
      });
    } catch (error: any) {
      console.error('Error checking queue:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check queue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto">
      <Card className="shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <CardTitle className="text-sm">Email Test Panel</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Development testing tool
          </CardDescription>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="space-y-4">
          {/* Test Email Input */}
          <div className="space-y-2">
            <Label htmlFor="test-email" className="text-xs">Test Email</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Notification Type */}
          <div className="space-y-2">
            <Label htmlFor="test-type" className="text-xs">Notification Type</Label>
            <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
              <SelectTrigger id="test-type" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_candidate_match">New Candidate Match</SelectItem>
                <SelectItem value="new_job_match">New Job Match</SelectItem>
                <SelectItem value="application_status">Application Status</SelectItem>
                <SelectItem value="digest">Digest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={createTestNotification}
              disabled={loading || !testEmail}
              className="w-full text-xs h-8"
            >
              <Send className="h-3 w-3 mr-2" />
              Send Test Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={processPendingNotifications}
              disabled={loading}
              className="w-full text-xs h-8"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Process Queue
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={checkNotificationQueue}
              disabled={loading}
              className="w-full text-xs h-8"
            >
              <CheckCircle className="h-3 w-3 mr-2" />
              Check Queue
            </Button>
          </div>

          {/* Info */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              This panel is only visible in development mode. Test emails will be sent via Resend API.
            </p>
          </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

