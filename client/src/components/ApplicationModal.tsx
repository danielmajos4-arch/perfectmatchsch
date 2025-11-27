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

      // Check if already applied before submission
      const { data: existing } = await supabase
        .from('applications')
        .select('id, status')
        .eq('job_id', job.id)
        .eq('teacher_id', userData.user.id)
        .maybeSingle();

      if (existing) {
        throw new Error('DUPLICATE_APPLICATION');
      }

      // Include portfolio links in cover letter if provided
      let finalCoverLetter = coverLetter;
      if (portfolioLinks.trim()) {
        finalCoverLetter += `\n\nPortfolio Links:\n${portfolioLinks.trim()}`;
      }

      const { error } = await supabase.from('applications').insert({
        job_id: job.id,
        teacher_id: userData.user.id,
        cover_letter: finalCoverLetter,
      });

      if (error) {
        // Handle duplicate key error specifically
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          throw new Error('DUPLICATE_APPLICATION');
        }
        throw error;
      }

      // Get application ID for notification
      let applicationId: string | null = null;
      const { data: applicationData } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', job.id)
        .eq('teacher_id', userData.user.id)
        .single();
      
      applicationId = applicationData?.id || null;

      // Auto-create conversation after successful application
      try {
        const { conversation, isNew } = await getOrCreateConversation(
          userData.user.id, // teacher_id
          job.school_id,    // school_id
          job.id           // job_id
        );

        // Create initial system message if conversation is new
        if (isNew) {
          await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender_id: userData.user.id,
            content: `Application submitted for ${job.title} at ${job.school_name}`,
          });
        }
      } catch (convError) {
        // Log error but don't fail the application
        console.error('Error creating conversation:', convError);
      }

      // Notify school about new application (non-blocking)
      if (applicationId) {
        try {
          const teacherName = teacherProfile?.full_name || 'A teacher';
          await notifyNewApplication(
            job.school_id,
            applicationId,
            teacherName,
            job.title
          );
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
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
