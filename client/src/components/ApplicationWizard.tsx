/**
 * Multi-Step Application Wizard Component
 * 
 * Enhanced application flow with multiple steps and draft saving
 */

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { MatchScoreIndicator } from '@/components/MatchScoreIndicator';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  FileText,
  MapPin,
  DollarSign,
  Briefcase,
  Building2,
  Save
} from 'lucide-react';
import type { Job } from '@shared/schema';

interface ApplicationWizardProps {
  job: Job;
  matchScore?: number;
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'review' | 'cover-letter' | 'confirm';

const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: 'review', label: 'Review Job', description: 'Review job details' },
  { id: 'cover-letter', label: 'Cover Letter', description: 'Write your cover letter' },
  { id: 'confirm', label: 'Confirm', description: 'Review and submit' },
];

export function ApplicationWizard({ job, matchScore, isOpen, onClose }: ApplicationWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>('review');
  const [coverLetter, setCoverLetter] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  // Load draft from localStorage
  useEffect(() => {
    if (isOpen) {
      const draft = localStorage.getItem(`application-draft-${job.id}`);
      if (draft) {
        setCoverLetter(draft);
        setDraftSaved(true);
      }
    }
  }, [isOpen, job.id]);

  // Save draft to localStorage
  const saveDraft = () => {
    localStorage.setItem(`application-draft-${job.id}`, coverLetter);
    setDraftSaved(true);
    toast({
      title: 'Draft saved',
      description: 'Your application draft has been saved.',
    });
  };

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
      
      // Clear draft after successful submission
      localStorage.removeItem(`application-draft-${job.id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Application submitted!',
        description: 'Your application has been sent to the school.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/job-matches'] });
      onClose();
      setCoverLetter('');
      setCurrentStep('review');
      setDraftSaved(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Application failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep === 'review') {
      setCurrentStep('cover-letter');
    } else if (currentStep === 'cover-letter') {
      if (!coverLetter.trim()) {
        toast({
          title: 'Cover letter required',
          description: 'Please write a cover letter before proceeding.',
          variant: 'destructive',
        });
        return;
      }
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'cover-letter') {
      setCurrentStep('review');
    } else if (currentStep === 'confirm') {
      setCurrentStep('cover-letter');
    }
  };

  const handleSubmit = () => {
    applyMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl md:text-2xl">Apply for Position</DialogTitle>
          <DialogDescription className="text-sm">
            Complete the steps below to submit your application
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator - Mobile First */}
        <div className="mb-6 space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const Icon = isCompleted ? CheckCircle2 : Circle;
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : isCompleted
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-background text-muted-foreground border-border'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 1: Review Job */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review Job Details</h3>
              <Card className="p-4 sm:p-6">
                <div className="space-y-4">
                  {/* Job Header */}
                  <div className="flex items-start gap-4">
                    {job.school_logo ? (
                      <img
                        src={job.school_logo}
                        alt={job.school_name}
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-semibold text-primary">
                          {job.school_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl sm:text-2xl font-bold text-foreground mb-2 break-words">
                        {job.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="rounded-full">
                          {job.subject}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          {job.grade_level}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          {job.job_type}
                        </Badge>
                      </div>
                      {matchScore !== undefined && (
                        <div className="mt-3">
                          <MatchScoreIndicator score={matchScore} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">School</p>
                        <p className="text-sm font-medium">{job.school_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-medium">{job.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p className="text-sm font-medium">{job.salary}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="text-sm font-medium">{job.job_type}</p>
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  {job.description && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                    </div>
                  )}

                  {/* Requirements */}
                  {job.requirements && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Requirements</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Step 2: Cover Letter */}
          {currentStep === 'cover-letter' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Write Cover Letter</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveDraft}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Draft
                </Button>
              </div>
              {draftSaved && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ Draft saved automatically
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="coverLetter" className="text-base">
                  Cover Letter <span className="text-muted-foreground">(Required)</span>
                </Label>
                <Textarea
                  id="coverLetter"
                  value={coverLetter}
                  onChange={(e) => {
                    setCoverLetter(e.target.value);
                    setDraftSaved(false);
                    // Auto-save draft
                    localStorage.setItem(`application-draft-${job.id}`, e.target.value);
                  }}
                  placeholder="Write a compelling cover letter explaining why you're a great fit for this position..."
                  className="min-h-48 text-base"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {coverLetter.length} characters
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review & Submit</h3>
              <Card className="p-4 sm:p-6 bg-muted/50">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Job Position</p>
                    <p className="text-base">{job.title} at {job.school_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Cover Letter</p>
                    <div className="p-4 bg-background rounded-lg border max-h-48 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{coverLetter}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer Actions - Mobile First */}
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4 border-t">
          <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
            {currentStep !== 'review' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
          </div>
          <div className="w-full sm:w-auto order-1 sm:order-2">
            {currentStep === 'confirm' ? (
              <Button
                onClick={handleSubmit}
                disabled={applyMutation.isPending}
                className="w-full sm:w-auto gap-2"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

