import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { getOrCreateConversation } from '@/lib/conversationService';
import { notifyNewApplication } from '@/lib/notificationService';
import type { Job, Teacher } from '@shared/schema';

interface ApplicationModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationModal({ job, isOpen, onClose }: ApplicationModalProps) {
  const { toast } = useToast();
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState('');

  // Get teacher profile to show resume
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: teacherProfile } = useQuery<Teacher>({
    queryKey: ['/api/teacher-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Teacher | null;
    },
    enabled: !!user?.id,
  });

  // Check if already applied
  const { data: existingApplication } = useQuery({
    queryKey: ['application-status', job.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('applications')
        .select('id, status')
        .eq('job_id', job.id)
        .eq('teacher_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking application status:', error);
      }
      return data;
    },
    enabled: !!user?.id && isOpen,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check if already applied before submission (with timeout)
      const checkController = new AbortController();
      const checkTimeoutId = setTimeout(() => checkController.abort(), 5000);
      
      let existing = null;
      try {
        const { data } = await supabase
        .from('applications')
        .select('id, status')
        .eq('job_id', job.id)
        .eq('teacher_id', userData.user.id)
          .maybeSingle()
          .abortSignal(checkController.signal);
        existing = data;
        clearTimeout(checkTimeoutId);
      } catch (checkErr: any) {
        clearTimeout(checkTimeoutId);
        if (checkErr.name === 'AbortError') {
          console.warn('Duplicate check timeout - proceeding with insert');
        } else if (checkErr.code !== 'PGRST116') {
          throw checkErr;
        }
      }

      if (existing) {
        throw new Error('DUPLICATE_APPLICATION');
      }

      // Include portfolio links in cover letter if provided
      let finalCoverLetter = coverLetter;
      if (portfolioLinks.trim()) {
        finalCoverLetter += `\n\nPortfolio Links:\n${portfolioLinks.trim()}`;
      }

      // Insert application (with timeout)
      const insertController = new AbortController();
      const insertTimeoutId = setTimeout(() => insertController.abort(), 8000);
      
      let insertError = null;
      try {
        const { error } = await supabase
          .from('applications')
          .insert({
        job_id: job.id,
        teacher_id: userData.user.id,
        cover_letter: finalCoverLetter,
          })
          .abortSignal(insertController.signal);
        insertError = error;
        clearTimeout(insertTimeoutId);
      } catch (insertErr: any) {
        clearTimeout(insertTimeoutId);
        if (insertErr.name === 'AbortError') {
          throw new Error('Application submission timed out. Please try again.');
        }
        throw insertErr;
      }

      if (insertError) {
        // Handle duplicate key error specifically
        if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
          throw new Error('DUPLICATE_APPLICATION');
        }
        throw insertError;
      }

      // Get application ID for notification (with timeout)
      let applicationId: string | null = null;
      const fetchController = new AbortController();
      const fetchTimeoutId = setTimeout(() => fetchController.abort(), 5000);
      
      try {
      const { data: applicationData } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', job.id)
        .eq('teacher_id', userData.user.id)
          .single()
          .abortSignal(fetchController.signal);
      applicationId = applicationData?.id || null;
        clearTimeout(fetchTimeoutId);
      } catch (fetchErr: any) {
        clearTimeout(fetchTimeoutId);
        if (fetchErr.name === 'AbortError') {
          console.warn('Application ID fetch timeout - application was inserted but ID fetch failed');
          // Application was inserted, so we'll proceed without the ID
        } else {
          console.error('Error fetching application ID:', fetchErr);
        }
      }

      // Auto-create conversation after successful application (with timeout)
      try {
        const convController = new AbortController();
        const convTimeoutId = setTimeout(() => convController.abort(), 10000);
        
        let conversation = null;
        let isNew = false;
        
        try {
          // Note: getOrCreateConversation doesn't support AbortController directly
          // We'll wrap it in a Promise.race with timeout
          const convPromise = getOrCreateConversation(
          userData.user.id, // teacher_id
          job.school_id,    // school_id
          job.id           // job_id
        );

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Conversation creation timeout')), 10000);
          });
          
          const result = await Promise.race([convPromise, timeoutPromise]) as { conversation: any; isNew: boolean };
          conversation = result.conversation;
          isNew = result.isNew;
          clearTimeout(convTimeoutId);
        } catch (convErr: any) {
          clearTimeout(convTimeoutId);
          if (convErr.message === 'Conversation creation timeout') {
            console.warn('Conversation creation timeout - skipping');
          } else {
            throw convErr;
          }
        }

        // Create initial system message if conversation is new (with timeout)
        if (conversation && isNew) {
          const msgController = new AbortController();
          const msgTimeoutId = setTimeout(() => msgController.abort(), 5000);
          
          try {
            await supabase
              .from('messages')
              .insert({
            conversation_id: conversation.id,
            sender_id: userData.user.id,
            content: `Application submitted for ${job.title} at ${job.school_name}`,
              })
              .abortSignal(msgController.signal);
            clearTimeout(msgTimeoutId);
          } catch (msgErr: any) {
            clearTimeout(msgTimeoutId);
            if (msgErr.name !== 'AbortError') {
              console.error('Error creating initial message:', msgErr);
            }
          }
        }
      } catch (convError) {
        // Log error but don't fail the application
        console.error('Error creating conversation:', convError);
      }

      // Notify school about new application (non-blocking, fire-and-forget)
      if (applicationId) {
        // Don't await - fire and forget to prevent blocking
        notifyNewApplication(
            job.school_id,
            applicationId,
          teacherProfile?.full_name || 'A teacher',
            job.title
        ).catch((notifError) => {
          console.error('Error sending notification:', notifError);
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Application submitted!',
        description: 'Your application has been sent to the school.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/job-matches', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['application-status', job.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/has-applied', user?.id, job.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      onClose();
      setCoverLetter('');
      setPortfolioLinks('');
    },
    onError: (error: any) => {
      if (error.message === 'DUPLICATE_APPLICATION' || error.code === '23505' || error.message?.includes('duplicate key')) {
        toast({
          title: 'Already applied',
          description: 'You have already applied to this position. Check "My Applications" to view your application status.',
          variant: 'destructive',
          action: {
            label: 'View Applications',
            onClick: () => {
              // Navigate to teacher dashboard applications tab
              window.location.href = '/teacher/dashboard#applications';
            },
          },
        });
      } else {
        toast({
          title: 'Application failed',
          description: error.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
      console.error('Application error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate();
  };

  // If already applied, show status instead of form
  if (existingApplication) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">Application Status</DialogTitle>
            <DialogDescription className="text-sm">
              You have already applied to this position
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Application Status</p>
                  <Badge variant="secondary" className="mt-2">
                    {existingApplication.status || 'Pending'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = '/teacher/dashboard#applications';
                  }}
                >
                  View All Applications
                </Button>
              </div>
            </Card>
            <DialogFooter>
              <Button onClick={onClose} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl md:text-2xl">Apply for Position</DialogTitle>
          <DialogDescription className="text-sm">
            Submit your application for this teaching position
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Job Summary - Mobile First */}
          <Card className="p-3 sm:p-4 border rounded-lg">
            <div className="flex items-start gap-3 sm:gap-4">
              {job.school_logo ? (
                <img
                  src={job.school_logo}
                  alt={job.school_name}
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-lg font-semibold text-primary">
                    {job.school_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base sm:text-lg break-words">
                  {job.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{job.school_name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{job.location}</p>
              </div>
            </div>
          </Card>

          {/* Resume Section */}
          {teacherProfile?.resume_url && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Resume</Label>
              <Card className="p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Resume attached</p>
                    <p className="text-xs text-muted-foreground">From your profile</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-9"
                  >
                    <a href={teacherProfile.resume_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {!teacherProfile?.resume_url && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No resume uploaded</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Consider uploading your resume to your profile for better application success.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cover Letter - Mobile Optimized */}
          <div className="space-y-2">
            <Label htmlFor="coverLetter" className="text-sm font-medium">
              Cover Letter <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="coverLetter"
              placeholder="Explain why you're a great fit for this position..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              required
              className="min-h-32 resize-none text-base"
              data-testid="textarea-coverletter"
            />
            <p className="text-xs text-muted-foreground">
              Introduce yourself and explain why you're interested in this position
            </p>
          </div>

          {/* Portfolio Links - Optional */}
          <div className="space-y-2">
            <Label htmlFor="portfolioLinks" className="text-sm font-medium">
              Portfolio Links (Optional)
            </Label>
            <Textarea
              id="portfolioLinks"
              placeholder="Add links to your portfolio, teaching samples, or other relevant work (one per line)"
              value={portfolioLinks}
              onChange={(e) => setPortfolioLinks(e.target.value)}
              className="min-h-24 resize-none text-base"
              data-testid="textarea-portfolio"
            />
            <p className="text-xs text-muted-foreground">
              Share links to your teaching portfolio, sample lesson plans, or other relevant work
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={applyMutation.isPending}
              className="w-full sm:w-auto h-11 order-2 sm:order-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={applyMutation.isPending || !coverLetter.trim()}
              className="w-full sm:w-auto h-11 order-1 sm:order-2"
              data-testid="button-submit-application"
            >
              {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
