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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Apply for Position</DialogTitle>
          <DialogDescription>
            Submit your application for this teaching position
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Summary */}
          <Card className="p-4 border rounded-lg">
            <div className="flex items-start gap-4">
              {job.school_logo ? (
                <img
                  src={job.school_logo}
                  alt={job.school_name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {job.school_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-lg truncate">
                  {job.title}
                </h3>
                <p className="text-sm text-muted-foreground">{job.school_name}</p>
                <p className="text-sm text-muted-foreground">{job.location}</p>
              </div>
            </div>
          </Card>

          {/* Cover Letter */}
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
              className="min-h-32 resize-none"
              data-testid="textarea-coverletter"
            />
            <p className="text-xs text-muted-foreground">
              Introduce yourself and explain why you're interested in this position
            </p>
          </div>

          <DialogFooter className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={applyMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={applyMutation.isPending || !coverLetter.trim()}
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
