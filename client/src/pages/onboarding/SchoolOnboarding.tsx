import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, Camera, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { uploadProfileImage } from '@/lib/storageService';
import { InsertSchool } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { createDefaultTemplates } from '@/utils/defaultTemplates';
import { useToast } from '@/hooks/use-toast';
import logoUrl from '@assets/New logo-15_1762774603259.png';

const SCHOOL_TYPES = [
  'Public',
  'Private',
  'Charter',
  'Montessori',
  'International',
  'Online',
  'Other'
];

export default function SchoolOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    school_name: '',
    school_type: '',
    location: '',
    description: '',
    website: '',
    logo_url: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveSchoolMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error('No user found');

      const schoolData: InsertSchool = {
        user_id: user.id,
        school_name: data.school_name,
        school_type: data.school_type,
        location: data.location,
        description: data.description,
        website: data.website || null,
        logo_url: data.logo_url || null,
        profile_complete: true,
      };

      const { data: existingSchool } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingSchool) {
        const { error } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schools')
          .insert([schoolData]);

        if (error) throw error;

        // Create default email templates for new schools
        try {
          await createDefaultTemplates(user.id);
        } catch (error) {
          console.error('Error creating default templates:', error);
          // Don't fail the onboarding if templates fail to create
        }
      }

      return schoolData;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/school-profile', user.id] });
      }
      setLocation('/school/dashboard');
    },
    onError: (error: any) => {
      console.error('Error saving school profile:', error);
      setErrors({ submit: 'Failed to save profile. Please try again.' });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.school_name.trim()) newErrors.school_name = 'School name is required';
    if (!formData.school_type) newErrors.school_type = 'School type is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }
    
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingLogo(true);
    try {
      const result = await uploadProfileImage(user.id, file);
      
      if (result.error) {
        toast({
          title: 'Upload failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      setFormData(prev => ({ ...prev, logo_url: result.url }));
      toast({
        title: 'Logo uploaded',
        description: 'Your school logo has been uploaded successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      saveSchoolMutation.mutate(formData);
    }
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img 
              src={logoUrl} 
              alt="PerfectMatchSchools" 
              className="h-24 w-auto drop-shadow-2xl" 
              style={{ 
                filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2)) brightness(1.35) contrast(1.55) saturate(2.1)',
                transform: 'scale(1.08)'
              }}
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent" data-testid="text-onboarding-title">
            Welcome to PerfectMatchSchools
          </h1>
          <p className="text-muted-foreground" data-testid="text-onboarding-subtitle">
            Create your school profile to start posting jobs and connecting with teachers
          </p>
        </div>

        {errors.submit && (
          <Alert variant="destructive" data-testid="alert-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.submit}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-step-title">School Profile</CardTitle>
            <CardDescription data-testid="text-step-description">
              Tell us about your school and what makes it special
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* School Logo Upload */}
              <div className="flex flex-col items-center gap-4 pb-4 border-b">
                <Label className="text-base font-medium">
                  School Logo <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <Avatar className="h-28 w-28 border-2 border-dashed border-muted-foreground/30">
                    <AvatarImage src={formData.logo_url || undefined} alt="School logo" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Building2 className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    title="Upload school logo"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Upload your school's logo (JPEG, PNG, or WebP, max 5MB)
                </p>
              </div>

              <div>
                <Label htmlFor="school_name" data-testid="label-school-name">
                  School Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="school_name"
                  data-testid="input-school-name"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  placeholder="Enter school name"
                  className={errors.school_name ? 'border-destructive' : ''}
                />
                {errors.school_name && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-school-name">
                    {errors.school_name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="school_type" data-testid="label-school-type">
                  School Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.school_type}
                  onValueChange={(value) => setFormData({ ...formData, school_type: value })}
                >
                  <SelectTrigger
                    data-testid="select-school-type"
                    className={errors.school_type ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select school type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_TYPES.map((type) => (
                      <SelectItem key={type} value={type} data-testid={`option-type-${type.toLowerCase()}`}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.school_type && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-school-type">
                    {errors.school_type}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="location" data-testid="label-location">
                  Location <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location"
                  data-testid="input-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, State"
                  className={errors.location ? 'border-destructive' : ''}
                />
                {errors.location && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-location">
                    {errors.location}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description" data-testid="label-description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  data-testid="textarea-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your school's culture, mission, and values..."
                  rows={6}
                  className={errors.description ? 'border-destructive' : ''}
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? (
                    <p className="text-sm text-destructive" data-testid="error-description">
                      {errors.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-description-count">
                      {formData.description.length} characters (minimum 50)
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="website" data-testid="label-website">
                  Website <span className="text-muted-foreground text-sm">(Optional)</span>
                </Label>
                <Input
                  id="website"
                  data-testid="input-website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.example.com"
                  className={errors.website ? 'border-destructive' : ''}
                />
                {errors.website && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-website">
                    {errors.website}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={saveSchoolMutation.isPending}
                  data-testid="button-submit"
                >
                  {saveSchoolMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
