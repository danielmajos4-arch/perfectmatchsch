/**
 * Application Details Step Component
 * 
 * Configures which application fields are required/optional for a job posting
 */

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, FileEdit, Linkedin, Calendar, Globe, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ApplicationField {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  alwaysRequired?: boolean;
}

export const APPLICATION_FIELDS: ApplicationField[] = [
  {
    key: 'resume',
    label: 'Resume',
    description: 'Teacher\'s resume or CV',
    icon: <FileText className="h-4 w-4" />,
    alwaysRequired: true,
  },
  {
    key: 'cover_letter',
    label: 'Cover Letter',
    description: 'Personalized cover letter for this position',
    icon: <FileEdit className="h-4 w-4" />,
  },
  {
    key: 'desired_salary',
    label: 'Desired Salary',
    description: 'Teacher\'s salary expectations',
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    key: 'linkedin_url',
    label: 'LinkedIn Profile',
    description: 'Link to teacher\'s LinkedIn profile',
    icon: <Linkedin className="h-4 w-4" />,
  },
  {
    key: 'date_available',
    label: 'Date Available',
    description: 'When the teacher can start',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    key: 'website_portfolio',
    label: 'Website/Portfolio',
    description: 'Link to teacher\'s portfolio or website',
    icon: <Globe className="h-4 w-4" />,
  },
];

interface ApplicationDetailsStepProps {
  applicationRequirements: Record<string, boolean>;
  onRequirementsChange: (requirements: Record<string, boolean>) => void;
}

export function ApplicationDetailsStep({
  applicationRequirements,
  onRequirementsChange,
}: ApplicationDetailsStepProps) {
  const handleFieldToggle = (fieldKey: string, required: boolean) => {
    // Resume is always required, so prevent unchecking it
    if (fieldKey === 'resume' && !required) {
      return;
    }

    onRequirementsChange({
      ...applicationRequirements,
      [fieldKey]: required,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Configure Application Requirements</h3>
        <p className="text-sm text-muted-foreground">
          Select which fields are required or optional for candidates applying to this position.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Resume is always required and cannot be disabled. All other fields are optional.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {APPLICATION_FIELDS.map((field) => {
          const isRequired = applicationRequirements[field.key] ?? (field.key === 'resume');
          const isDisabled = field.alwaysRequired;

          return (
            <Card key={field.key} className="transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 text-muted-foreground">
                      {field.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Label
                          htmlFor={`field-${field.key}`}
                          className="text-base font-medium cursor-pointer"
                        >
                          {field.label}
                        </Label>
                        {isRequired && (
                          <Badge variant="default" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {field.alwaysRequired && (
                          <Badge variant="secondary" className="text-xs">
                            Always Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {field.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Optional</span>
                    <Checkbox
                      id={`field-${field.key}`}
                      checked={isRequired}
                      onCheckedChange={(checked) =>
                        handleFieldToggle(field.key, checked === true)
                      }
                      disabled={isDisabled}
                      className="h-5 w-5"
                    />
                    <span className="text-sm text-muted-foreground">Required</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

