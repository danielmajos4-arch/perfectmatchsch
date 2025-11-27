/**
 * Email Composer Modal
 * 
 * Allows schools to send emails to applicants using templates
 * with variable replacement
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { replaceTemplateVariables, TEMPLATE_VARIABLES, type TemplateVariables } from '@/utils/templateUtils';
import { getOrCreateConversation } from '@/lib/conversationService';
import { Mail, Send, Eye, X } from 'lucide-react';
import type { EmailTemplate } from '@/pages/EmailTemplates';
import type { Application, Job, Teacher } from '@shared/schema';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  job: Job;
  teacher: Teacher | null;
  onSent?: () => void;
}

export function EmailComposerModal({
  isOpen,
  onClose,
  application,
  job,
  teacher,
  onSent,
}: EmailComposerModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');

  // Get current user (school)
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Fetch email templates
  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('school_id', user.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && isOpen,
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplateId('');
      setSubject('');
      setBody('');
      setShowPreview(false);
      setInterviewDate('');
      setInterviewTime('');
      setInterviewLocation('');
    }
  }, [isOpen]);

  // Load template when selected
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
      }
    }
  }, [selectedTemplateId, templates]);

  // Get template variables data
  const getTemplateVariables = (): TemplateVariables => {
    const teacherName = teacher?.full_name || '[Teacher Name]';
    const teacherFirstName = teacherName.split(' ')[0] || teacherName;
    
    return {
      teacherName,
      teacherFirstName,
      jobTitle: job.title,
      schoolName: job.school_name,
      department: job.department,
      interviewDate: interviewDate || '[Interview Date]',
      interviewTime: interviewTime || '[Interview Time]',
      interviewLocation: interviewLocation || '[Interview Location]',
      salary: job.salary,
      startDate: '[Start Date]',
    };
  };

  // Get preview with variables replaced
  const getPreview = () => {
    const variables = getTemplateVariables();
    return {
      subject: replaceTemplateVariables(subject, variables),
      body: replaceTemplateVariables(body, variables),
    };
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !teacher?.user_id) throw new Error('Missing user information');
      if (!subject.trim() || !body.trim()) throw new Error('Subject and body are required');

      // Get or create conversation
      const { conversation } = await getOrCreateConversation(teacher.user_id, user.id, job.id);

      // Replace variables in subject and body
      const variables = getTemplateVariables();
      const finalSubject = replaceTemplateVariables(subject, variables);
      const finalBody = replaceTemplateVariables(body, variables);

      // Create message in conversation
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `Subject: ${finalSubject}\n\n${finalBody}`,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);

      // TODO: Send actual email via email service (Resend, SendGrid, etc.)
      // For now, we're just saving it as a message

      return message;
    },
    onSuccess: () => {
      toast({
        title: 'Email sent!',
        description: 'Your message has been sent to the applicant.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      onSent?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send email',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please fill in subject and body.',
        variant: 'destructive',
      });
      return;
    }
    sendEmailMutation.mutate();
  };

  const preview = getPreview();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>Send Email to Applicant</DialogTitle>
          <DialogDescription>
              Send an email to {teacher?.full_name || 'the applicant'} using a template or compose from scratch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selector */}
          <div className="space-y-2">
              <Label htmlFor="template">Email Template (Optional)</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a template or start from scratch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Start from scratch</SelectItem>
                  {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.is_default && <Badge variant="secondary" className="ml-2">Default</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              <p className="text-xs text-muted-foreground">
                Select a template to pre-fill the email, or compose from scratch
              </p>
          </div>

            {/* Interview Details (for interview templates) */}
          {selectedTemplateId && templates.find(t => t.id === selectedTemplateId)?.category === 'interview' && (
              <Card className="p-4 space-y-3">
              <h4 className="font-medium text-sm">Interview Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                    <Label htmlFor="interviewDate" className="text-xs">Interview Date</Label>
                  <Input
                      id="interviewDate"
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="interviewTime" className="text-xs">Interview Time</Label>
                  <Input
                      id="interviewTime"
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="interviewLocation" className="text-xs">Location/Link</Label>
                  <Input
                      id="interviewLocation"
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                      placeholder="In-person or video link"
                    className="h-10"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Subject */}
          <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Interview Invitation - {{job_title}}"
              className="h-11"
            />
              <p className="text-xs text-muted-foreground">
                Preview: <span className="font-medium">{preview.subject}</span>
              </p>
          </div>

          {/* Body */}
          <div className="space-y-2">
              <Label htmlFor="body">Email Body *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
                placeholder="Dear {{teacher_name}},&#10;&#10;Thank you for applying..."
              className="min-h-48 resize-none text-base"
            />
            <p className="text-xs text-muted-foreground">
                Use variables like {TEMPLATE_VARIABLES.slice(0, 3).map(v => v.key).join(', ')} to personalize your email
            </p>
          </div>

          {/* Preview Toggle */}
            <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-9"
            >
              <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {/* Preview */}
          {showPreview && (
              <Card className="p-4 space-y-3">
                <h4 className="font-medium text-sm">Preview</h4>
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                  <p className="mt-1 text-sm font-medium">{preview.subject}</p>
              </div>
              <div>
                  <Label className="text-xs text-muted-foreground">Body</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-sans">{preview.body}</pre>
                  </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
              onClick={onClose}
            disabled={sendEmailMutation.isPending}
          >
            Cancel
          </Button>
          <Button
              onClick={handleSend}
            disabled={sendEmailMutation.isPending || !subject.trim() || !body.trim()}
          >
            {sendEmailMutation.isPending ? (
                <>
                  <Mail className="h-4 w-4 mr-2 animate-pulse" />
                  Sending...
                </>
            ) : (
              <>
                  <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
