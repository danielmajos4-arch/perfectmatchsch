import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { FileText, Sparkles, Copy } from 'lucide-react';
import { getApplicationTemplates, personalizeTemplate, incrementTemplateUsage } from '@/lib/templateService';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@shared/schema';
import type { ApplicationTemplate } from '@shared/schema';

interface ApplicationTemplatesProps {
  teacher: Teacher;
  jobTitle: string;
  schoolName: string;
  onTemplateSelected: (coverLetter: string) => void;
}

export function ApplicationTemplates({
  teacher,
  jobTitle,
  schoolName,
  onTemplateSelected,
}: ApplicationTemplatesProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ApplicationTemplate | null>(null);
  const [personalizedText, setPersonalizedText] = useState('');

  const { data: templates, isLoading } = useQuery<ApplicationTemplate[]>({
    queryKey: ['/api/application-templates', teacher.archetype],
    queryFn: () => getApplicationTemplates({
      archetype: teacher.archetype || undefined,
    }),
  });

  const handleSelectTemplate = (template: ApplicationTemplate) => {
    setSelectedTemplate(template);
    
    // Personalize template
    const personalized = personalizeTemplate(template.cover_letter_template, {
      job_title: jobTitle,
      school_name: schoolName,
      teacher_name: teacher.full_name,
      years_experience: teacher.years_experience || 'experienced',
    });

    setPersonalizedText(personalized);
    incrementTemplateUsage(template.id).catch(console.error);
  };

  const handleUseTemplate = () => {
    if (!personalizedText.trim()) {
      toast({
        title: 'No template selected',
        description: 'Please select a template first.',
        variant: 'destructive',
      });
      return;
    }

    onTemplateSelected(personalizedText);
    toast({
      title: 'Template applied',
      description: 'You can edit the cover letter before submitting.',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Application Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates && templates.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{template.name}</h4>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                  {template.archetype && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {template.archetype}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {selectedTemplate && personalizedText && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Personalized Cover Letter</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(personalizedText);
                      toast({
                        title: 'Copied',
                        description: 'Cover letter copied to clipboard.',
                      });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={personalizedText}
                  onChange={(e) => setPersonalizedText(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <Button onClick={handleUseTemplate} className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No templates available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
