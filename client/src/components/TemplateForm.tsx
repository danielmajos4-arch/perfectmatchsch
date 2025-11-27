/**
 * Template Form Component
 * 
 * Form for creating and editing email templates
 * Includes variable picker for merge fields
 */

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TEMPLATE_VARIABLES, type TemplateVariable } from '@/utils/templateUtils';
import { Plus, X } from 'lucide-react';
import type { EmailTemplate } from '@/pages/EmailTemplates';

interface TemplateFormProps {
  template?: EmailTemplate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'rejection', label: 'Rejection' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'general', label: 'General' },
];

export function TemplateForm({ template, onSuccess, onCancel }: TemplateFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showVariablePicker, setShowVariablePicker] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category || 'general');
      setSubject(template.subject);
      setBody(template.body);
      setIsDefault(template.is_default);
    }
  }, [template]);

  const insertVariable = (variable: TemplateVariable, field: 'subject' | 'body') => {
    const variableKey = variable.key;
    const textarea = field === 'subject' ? document.getElementById('subject-input') as HTMLInputElement : 
                    document.getElementById('body-textarea') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = field === 'subject' ? subject : body;
      const newText = text.substring(0, start) + variableKey + text.substring(end);
      
      if (field === 'subject') {
        setSubject(newText);
      } else {
        setBody(newText);
      }
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableKey.length, start + variableKey.length);
      }, 0);
    } else {
      // Fallback: append to end
      if (field === 'subject') {
        setSubject(prev => prev + variableKey);
      } else {
        setBody(prev => prev + variableKey);
      }
    }
    
    setShowVariablePicker(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!name.trim()) throw new Error('Template name is required');
      if (!subject.trim()) throw new Error('Subject is required');
      if (!body.trim()) throw new Error('Body is required');

      const templateData = {
        school_id: user.id,
        name: name.trim(),
        category: category || null,
        subject: subject.trim(),
        body: body.trim(),
        is_default: isDefault,
      };

      if (template) {
        // Update existing
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', template.id)
          .eq('school_id', user.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('email_templates')
          .insert([templateData]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: template ? 'Template updated' : 'Template created',
        description: `Your email template has been ${template ? 'updated' : 'created'} successfully.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save template',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Name */}
      <div className="space-y-2">
        <Label htmlFor="template-name">Template Name *</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard Rejection Letter"
          required
          className="h-11"
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category" className="h-11">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Email Subject *</Label>
          <Popover open={showVariablePicker} onOpenChange={setShowVariablePicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
              >
                <Plus className="h-3 w-3" />
                Insert Variable
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Available Variables
                </p>
                {TEMPLATE_VARIABLES.map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => insertVariable(variable, 'subject')}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors"
                  >
                    <div className="font-medium text-foreground">{variable.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {variable.key}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Input
          id="subject-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Interview Invitation - {{job_title}}"
          required
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Use variables like {`{{teacher_name}}`} or {`{{job_title}}`} to personalize emails
        </p>
      </div>

      {/* Body */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="body">Email Body *</Label>
          <Popover open={showVariablePicker} onOpenChange={setShowVariablePicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
              >
                <Plus className="h-3 w-3" />
                Insert Variable
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Available Variables
                </p>
                {TEMPLATE_VARIABLES.map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => insertVariable(variable, 'body')}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors"
                  >
                    <div className="font-medium text-foreground">{variable.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {variable.key}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Textarea
          id="body-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Dear {{teacher_name}},&#10;&#10;Thank you for applying..."
          required
          className="min-h-48 resize-none text-base"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {TEMPLATE_VARIABLES.slice(0, 5).map((variable) => (
            <Badge
              key={variable.key}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-muted"
              onClick={() => {
                const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const newText = body.substring(0, start) + variable.key + body.substring(end);
                  setBody(newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + variable.key.length, start + variable.key.length);
                  }, 0);
                }
              }}
            >
              {variable.key}
            </Badge>
          ))}
        </div>
      </div>

      {/* Set as Default */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-default"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(checked === true)}
        />
        <Label htmlFor="is-default" className="text-sm font-normal cursor-pointer">
          Set as default template for this category
        </Label>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saveMutation.isPending}
          className="flex-1 sm:flex-initial h-11"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="flex-1 sm:flex-initial h-11"
        >
          {saveMutation.isPending
            ? 'Saving...'
            : template
            ? 'Update Template'
            : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}

