import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import type { Job } from '@shared/schema';

interface ApplicationModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationModal({ job, isOpen, onClose }: ApplicationModalProps) {
  const { toast } = useToast();
  const [coverLetter, setCoverLetter] = useState('');

  const applyMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('applications').insert({
        job_id: job.id,
        teacher_id: userData.user.id,
        cover_letter: coverLetter,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Application submitted!',
        description: 'Your application has been sent to the school.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      onClose();
      setCoverLetter('');
    },
    onError: (error: any) => {
      toast({
        title: 'Application failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate();
  };

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
