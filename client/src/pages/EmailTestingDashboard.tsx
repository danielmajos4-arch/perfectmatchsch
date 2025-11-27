/**
 * Email Testing Dashboard
 * 
 * Simple interface for sending test emails to verify Resend integration
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  TestTube
} from 'lucide-react';
import { sendEmail } from '@/lib/resendService';
import {
  welcomeEmailTemplate,
  applicationSubmittedTemplate,
  newMessageTemplate,
  replaceTemplateVariables,
  htmlToPlainText,
} from '@/lib/emailTemplates';

type TemplateType = 'welcome' | 'application' | 'message';

interface TestResult {
  status: 'success' | 'failed' | null;
  messageId?: string;
  error?: string;
  timestamp?: Date;
}

const mockData = {
  applicationSubmitted: {
    teacherName: "John Doe",
    jobTitle: "Mathematics Teacher",
    schoolName: "Perfect Match High School",
    coverLetter: "I am very interested in this position...",
    matchScore: 85
  },
  applicationStatus: {
    teacherName: "John Doe",
    jobTitle: "Mathematics Teacher",
    schoolName: "Perfect Match High School",
    status: "under_review" as const
  },
  newMessage: {
    senderName: "Jane Smith",
    messagePreview: "Thank you for your application. We'd like to schedule an interview...",
    conversationId: "test-123"
  }
};

export default function EmailTestingDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [recipientEmail, setRecipientEmail] = useState(user?.email || '');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('welcome');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult>({ status: null });

    const baseUrl = window.location.origin;
    
  const sendTestEmail = async (templateType: TemplateType, email: string) => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter a recipient email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult({ status: null });

    try {
      let html: string;
      let subject: string;
      const dashboardUrl = `${baseUrl}/dashboard`;

      switch (templateType) {
        case 'welcome':
          html = welcomeEmailTemplate({
            userName: 'Test User',
            userRole: 'teacher',
            dashboardUrl,
            onboardingUrl: `${baseUrl}/onboarding/teacher`,
          });
          subject = 'Welcome to Perfect Match Schools!';
          break;

        case 'application':
          html = applicationSubmittedTemplate({
            schoolName: mockData.applicationSubmitted.schoolName,
            teacherName: mockData.applicationSubmitted.teacherName,
            jobTitle: mockData.applicationSubmitted.jobTitle,
            teacherEmail: email,
            coverLetter: mockData.applicationSubmitted.coverLetter,
            matchScore: mockData.applicationSubmitted.matchScore,
            dashboardUrl: `${baseUrl}/school/dashboard`,
          });
          subject = `New Application: ${mockData.applicationSubmitted.teacherName} for ${mockData.applicationSubmitted.jobTitle}`;
          break;

        case 'message':
          html = newMessageTemplate({
            recipientName: 'Test User',
            senderName: mockData.newMessage.senderName,
            messagePreview: mockData.newMessage.messagePreview,
            conversationUrl: `${baseUrl}/messages?conversation=${mockData.newMessage.conversationId}`,
          });
          subject = `New message from ${mockData.newMessage.senderName}`;
          break;

        default:
          throw new Error('Invalid template type');
      }

      // Replace template variables
      const finalHtml = replaceTemplateVariables(html, {
        unsubscribe_url: `${baseUrl}/settings?tab=email&action=unsubscribe`,
        preferences_url: `${baseUrl}/settings?tab=email`,
      });

      const plainText = htmlToPlainText(finalHtml);

      // Send email via Resend
      const emailResult = await sendEmail({
        to: email,
        subject,
        html: finalHtml,
        text: plainText,
        tags: [
          { name: 'notification_type', value: templateType },
          { name: 'test', value: 'true' },
        ],
      });

      if (emailResult.success) {
        setResult({
          status: 'success',
          messageId: emailResult.messageId,
          timestamp: new Date(),
        });
        toast({
          title: 'Email sent successfully!',
          description: `Message ID: ${emailResult.messageId}`,
        });
      } else {
        throw new Error(emailResult.error || 'Failed to send email');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setResult({
        status: 'failed',
        error: errorMessage,
        timestamp: new Date(),
      });
      toast({
        title: 'Failed to send email',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = async (templateType: TemplateType) => {
    await sendTestEmail(templateType, recipientEmail);
  };

  const handleCustomSend = async () => {
    await sendTestEmail(selectedTemplate, recipientEmail);
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8" />
            Email Testing Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Send test emails to verify the Resend integration is working
          </p>
        </div>

        <div className="space-y-6">
          {/* Quick Test Section */}
            <Card>
              <CardHeader>
              <CardTitle>Quick Tests</CardTitle>
              <CardDescription>Send test emails with mock data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                  <Label htmlFor="quick-email">Send test email to:</Label>
                    <Input
                    id="quick-email"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="your-email@example.com"
                    className="mt-2"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleQuickTest('welcome')}
                    disabled={loading || !recipientEmail}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Welcome Email Test
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleQuickTest('application')}
                    disabled={loading || !recipientEmail}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Application Notification Test
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleQuickTest('message')}
                    disabled={loading || !recipientEmail}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Message Notification Test
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Test Section */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Test</CardTitle>
              <CardDescription>Select a template and send a test email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-email">Send test email to:</Label>
                  <Input
                    id="custom-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="template-select">Select template type:</Label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={(value) => setSelectedTemplate(value as TemplateType)}
                  >
                    <SelectTrigger id="template-select" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Welcome Email</SelectItem>
                      <SelectItem value="application">Application Notification</SelectItem>
                      <SelectItem value="message">Message Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCustomSend}
                  disabled={loading || !recipientEmail}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
                </div>
              </CardContent>
            </Card>

          {/* Response Display */}
          {result.status && (
            <Card>
              <CardHeader>
                <CardTitle>Last Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    {result.status === 'success' ? (
                      <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                        Success
                      </Badge>
                            ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                            )}
                        </div>
                  {result.messageId && (
                    <div>
                      <span className="font-medium">Message ID:</span>
                      <p className="text-sm text-muted-foreground mt-1 font-mono break-all">
                        {result.messageId}
                      </p>
                    </div>
                  )}
                  {result.error && (
                    <div>
                      <span className="font-medium">Error:</span>
                      <p className="text-sm text-destructive mt-1">{result.error}</p>
                    </div>
                  )}
                  {result.timestamp && (
                    <div>
                      <span className="font-medium">Sent at:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.timestamp.toLocaleString()}
                      </p>
                    </div>
                          )}
                        </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
