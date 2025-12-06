/**
 * Multi-Step Job Posting Wizard Component
 * 
 * Enhanced job posting flow with multiple steps including application requirements configuration
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Briefcase,
  FileText,
  Save
} from 'lucide-react';
import { HiringTeamSelector, type TeamMember } from './HiringTeamSelector';
import { ApplicationDetailsStep, APPLICATION_FIELDS } from './ApplicationDetailsStep';

type WizardStep = 'job-info' | 'application-details' | 'hiring-team' | 'review';

const STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: 'job-info', label: 'Job Information', description: 'Basic job details' },
  { id: 'application-details', label: 'Application Details', description: 'Configure required fields' },
  { id: 'hiring-team', label: 'Hiring Team', description: 'Manage team access' },
  { id: 'review', label: 'Review', description: 'Review and submit' },
];

const DEPARTMENTS = [
  'Mathematics',
  'Science',
  'English/Language Arts',
  'Social Studies',
  'Special Education',
  'Physical Education',
  'Arts',
  'Technology/Computer Science',
  'Foreign Languages',
  'Administration',
  'Other'
];

const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Temporary',
  'Substitute'
] as const;

const GRADE_LEVELS = [
  'Pre-K',
  'Kindergarten',
  'Elementary (1-5)',
  'Middle School (6-8)',
  'High School (9-12)',
  'All Grades'
];

const ARCHETYPES = [
  'The Guide',
  'The Trailblazer',
  'The Changemaker',
  'The Connector',
  'The Explorer',
  'The Leader'
];

export interface JobPostingFormData {
  title: string;
  department: string;
  subject: string;
  grade_level: string;
  job_type: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  benefits: string;
  school_name: string;
  archetype_tags: string[];
  start_date?: string;
  application_deadline?: string;
  application_requirements: Record<string, boolean>;
  team_members: TeamMember[];
}

interface JobPostingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobPostingFormData) => Promise<void>;
  initialData?: Partial<JobPostingFormData>;
  isSubmitting?: boolean;
}

const defaultApplicationRequirements: Record<string, boolean> = {
  resume: true,
  cover_letter: false,
  desired_salary: false,
  linkedin_url: false,
  date_available: false,
  website_portfolio: false,
};

export function JobPostingWizard({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}: JobPostingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('job-info');
  const [formData, setFormData] = useState<JobPostingFormData>({
    title: '',
    department: '',
    subject: '',
    grade_level: '',
    job_type: '',
    location: '',
    salary: '',
    description: '',
    requirements: '',
    benefits: '',
    school_name: '',
    archetype_tags: [],
    start_date: '',
    application_deadline: '',
    application_requirements: defaultApplicationRequirements,
    team_members: [],
  });

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...formData,
          ...initialData,
          application_requirements: initialData.application_requirements || defaultApplicationRequirements,
          team_members: initialData.team_members || [],
        });
      } else {
        // Reset to defaults when creating new job
        setFormData({
          title: '',
          department: '',
          subject: '',
          grade_level: '',
          job_type: '',
          location: '',
          salary: '',
          description: '',
          requirements: '',
          benefits: '',
          school_name: '',
          archetype_tags: [],
          start_date: '',
          application_deadline: '',
          application_requirements: defaultApplicationRequirements,
          team_members: [],
        });
      }
      setCurrentStep('job-info');
    }
  }, [isOpen, initialData]);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 'job-info':
        return (
          formData.title.trim() !== '' &&
          formData.department.trim() !== '' &&
          formData.subject.trim() !== '' &&
          formData.grade_level.trim() !== '' &&
          formData.job_type.trim() !== '' &&
          formData.location.trim() !== '' &&
          formData.salary.trim() !== '' &&
          formData.description.trim() !== '' &&
          formData.requirements.trim() !== '' &&
          formData.benefits.trim() !== '' &&
          formData.school_name.trim() !== ''
        );
      case 'application-details':
        return true;
      case 'hiring-team':
        return true; // Optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      onSubmit(formData);
      return;
    }

    // Default submission logic if no onSubmit provided
    // This would be similar to the createJobMutation in SchoolDashboard
    // But for now we expect the parent to handle it via onSubmit
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'job-info':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="h-12"
                  placeholder="e.g., Mathematics, English"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level *</Label>
                <Select value={formData.grade_level} onValueChange={(value) => setFormData({ ...formData, grade_level: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment Type *</Label>
                <Select value={formData.job_type} onValueChange={(value) => setFormData({ ...formData, job_type: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salary Range *</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="e.g., $50,000 - $70,000"
                  required
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="min-h-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements *</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                required
                className="min-h-24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits *</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                required
                className="min-h-24"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Desired Teaching Archetypes (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select archetypes that would be a good fit for this position.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ARCHETYPES.map((archetype) => (
                  <label
                    key={archetype}
                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Checkbox
                      checked={formData.archetype_tags.includes(archetype)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, archetype_tags: [...formData.archetype_tags, archetype] });
                        } else {
                          setFormData({ ...formData, archetype_tags: formData.archetype_tags.filter(t => t !== archetype) });
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{archetype}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'application-details':
        return (
          <ApplicationDetailsStep
            applicationRequirements={formData.application_requirements}
            onRequirementsChange={(requirements) =>
              setFormData({ ...formData, application_requirements: requirements })
            }
          />
        );

      case 'hiring-team':
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Hiring Team</h3>
              <p className="text-sm text-muted-foreground">
                Add colleagues who should have access to this job's candidates.
              </p>
            </div>
            <HiringTeamSelector
              initialMembers={formData.team_members || []}
              onChange={(members) => setFormData({ ...formData, team_members: members })}
            />
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Review Your Job Posting</h3>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Job Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Title:</span> {formData.title}</div>
                    <div><span className="text-muted-foreground">School:</span> {formData.school_name}</div>
                    <div><span className="text-muted-foreground">Department:</span> {formData.department}</div>
                    <div><span className="text-muted-foreground">Subject:</span> {formData.subject}</div>
                    <div><span className="text-muted-foreground">Grade Level:</span> {formData.grade_level}</div>
                    <div><span className="text-muted-foreground">Employment Type:</span> {formData.job_type}</div>
                    <div><span className="text-muted-foreground">Location:</span> {formData.location}</div>
                    <div><span className="text-muted-foreground">Salary:</span> {formData.salary}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.description}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Requirements</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.requirements}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Benefits</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.benefits}</p>
                </div>

                {formData.archetype_tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Desired Archetypes</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.archetype_tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Application Requirements</h4>
                  <div className="space-y-2">
                    {APPLICATION_FIELDS.map(field => {
                      const isRequired = formData.application_requirements[field.key] ?? false;
                      return (
                        <div key={field.key} className="flex items-center gap-2 text-sm">
                          {isRequired ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{field.label}</span>
                          {isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {formData.team_members && formData.team_members.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Hiring Team</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.team_members.map(member => (
                        <Badge key={member.email} variant="secondary">{member.email} ({member.role})</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl md:text-2xl">
            {initialData ? 'Edit Job Posting' : 'Post a New Job'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Complete all steps to create your job posting
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  {index <= currentStepIndex ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={`ml-2 text-sm font-medium ${index === currentStepIndex ? 'text-primary' :
                    index < currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            {currentStepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            {currentStepIndex < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="flex-1 sm:flex-initial"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex-1 sm:flex-initial"
              >
                {isSubmitting ? 'Submitting...' : (initialData ? 'Update Job' : 'Post Job')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

