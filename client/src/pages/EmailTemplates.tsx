/**
 * Email Templates Page
 * 
 * Allows schools to create, edit, and manage email templates
 * for communicating with teacher applicants
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { TEMPLATE_VARIABLES, type TemplateVariable } from '@/utils/templateUtils';
import { Plus, Edit, Trash2, Eye, Mail, FileText, MessageSquare, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export interface EmailTemplate {
  id: string;
  school_id: string;
  name: string;
  subject: string;
  body: string;
  category: 'rejection' | 'interview' | 'offer' | 'general' | 'request_info' | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_CATEGORIES = [
  { value: 'rejection', label: 'Rejection', icon: XCircle, color: 'destructive' },
  { value: 'interview', label: 'Interview Invitation', icon: MessageSquare, color: 'default' },
  { value: 'offer', label: 'Job Offer', icon: CheckCircle, color: 'default' },
  { value: 'request_info', label: 'Request Info', icon: HelpCircle, color: 'default' },
  { value: 'general', label: 'General', icon: FileText, color: 'secondary' },
] as const;

export default function EmailTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'general' as EmailTemplate['category'],
    subject: '',
    body: '',
    is_default: false,
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('school_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data: result, error } = await supabase
        .from('email_templates')
        .insert([{ ...data, school_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Template created!',
        description: 'Your email template has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create template',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<EmailTemplate> & { id: string }) => {
      const { id, ...updateData } = data;
      const { data: result, error } = await supabase
        .from('email_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Template updated!',
        description: 'Your email template has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update template',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Template deleted',
        description: 'The template has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete template',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general',
      subject: '',
      body: '',
      is_default: false,
    });
    setSelectedTemplate(null);
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      category: template.category || 'general',
      subject: template.subject,
      body: template.body,
      is_default: template.is_default,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedTemplate || !formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate({ ...formData, id: selectedTemplate.id });
  };

  const handleDelete = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const insertVariable = (variable: TemplateVariable, field: 'subject' | 'body') => {
    const currentValue = formData[field];
    const textarea = document.getElementById(`${field}-textarea`) as HTMLTextAreaElement;
    const cursorPos = textarea?.selectionStart || currentValue.length;
    const newValue = currentValue.slice(0, cursorPos) + variable.key + currentValue.slice(cursorPos);
    
    setFormData({ ...formData, [field]: newValue });
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(cursorPos + variable.key.length, cursorPos + variable.key.length);
      }
    }, 0);
  };

  const getCategoryInfo = (category: string | null) => {
    return TEMPLATE_CATEGORIES.find(c => c.value === category) || TEMPLATE_CATEGORIES[TEMPLATE_CATEGORIES.length - 1];
  };

  return (
    <AuthenticatedLayout>
      <div className="px-4 md:px-8 py-6 md:py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Email Templates</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Create and manage email templates for communicating with applicants
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="w-full sm:w-auto h-11"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="h-9"
          >
            All ({templates.length})
          </Button>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const count = templates.filter(t => t.category === cat.value).length;
            return (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className="h-9"
              >
                <cat.icon className="h-4 w-4 mr-2" />
                {cat.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-12 w-12" />}
            title="No templates yet"
            description={
              selectedCategory === 'all'
                ? "Create your first email template to streamline communication with applicants."
                : `No ${getCategoryInfo(selectedCategory).label.toLowerCase()} templates yet.`
            }
            action={{
              label: "Create Template",
              onClick: () => {
                resetForm();
                if (selectedCategory !== 'all') {
                  setFormData({ ...formData, category: selectedCategory as EmailTemplate['category'] });
                }
                setIsCreateModalOpen(true);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredTemplates.map((template) => {
              const categoryInfo = getCategoryInfo(template.category);
              return (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg font-semibold line-clamp-1">{template.name}</CardTitle>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <categoryInfo.icon className="h-4 w-4" />
                      <span>{categoryInfo.label}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                      {template.subject}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        className="h-9 flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        className="h-9"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template)}
                        className="h-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditModalOpen ? 'Edit Template' : 'Create New Template'}</DialogTitle>
              <DialogDescription>
                {isEditModalOpen ? 'Update your email template' : 'Create a reusable email template with dynamic variables'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Rejection Letter"
                  className="h-11"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || 'general'}
                  onValueChange={(value) => setFormData({ ...formData, category: value as EmailTemplate['category'] })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Select
                    onValueChange={(value) => {
                      const variable = TEMPLATE_VARIABLES.find(v => v.key === value);
                      if (variable) insertVariable(variable, 'subject');
                    }}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue placeholder="Insert Variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <SelectItem key={variable.key} value={variable.key}>
                          {variable.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Interview Invitation - {{job_title}}"
                  className="h-11"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body">Email Body *</Label>
                  <Select
                    onValueChange={(value) => {
                      const variable = TEMPLATE_VARIABLES.find(v => v.key === value);
                      if (variable) insertVariable(variable, 'body');
                    }}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue placeholder="Insert Variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <SelectItem key={variable.key} value={variable.key}>
                          {variable.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  id="body-textarea"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Dear {{teacher_name}},&#10;&#10;Thank you for applying..."
                  className="min-h-48 resize-none text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like {TEMPLATE_VARIABLES.slice(0, 3).map(v => v.key).join(', ')} to personalize your emails
                </p>
              </div>

              {/* Default Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
                  Set as default template for this category
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={isEditModalOpen ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEditModalOpen
                  ? 'Update Template'
                  : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                Preview of {selectedTemplate?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                  <p className="mt-1 text-sm font-medium">{selectedTemplate.subject}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Body</Label>
                  <div className="mt-1 p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {selectedTemplate.body}
                    </pre>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsPreviewModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthenticatedLayout>
  );
}
