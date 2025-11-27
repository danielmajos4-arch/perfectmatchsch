import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Save, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { uploadProfileImage, uploadDocument } from '@/lib/storageService';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Teacher, InsertTeacher } from '@shared/schema';
import { isProfileComplete, TeacherProfile as CompletionProfile } from '@/lib/profileUtils';

interface TeacherProfileEditorProps {
  teacher: Teacher;
  userId: string;
  onSave?: () => void;
}

const SUBJECTS = ['Math', 'Science', 'English', 'History', 'Social Studies', 'Art', 'Music', 'PE', 'Special Ed', 'ESL', 'Technology', 'Other'];
const GRADE_LEVELS = ['Pre-K', 'K', '1-2', '3-5', '6-8', '9-12', 'College'];
const YEARS_EXPERIENCE = ['0-1 years', '2-5 years', '6-10 years', '11-15 years', '16+ years'];

export function TeacherProfileEditor({ teacher, userId, onSave }: TeacherProfileEditorProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: teacher.full_name || '',
    phone: teacher.phone || '',
    location: teacher.location || '',
    bio: teacher.bio || '',
    years_experience: teacher.years_experience || '',
    subjects: teacher.subjects || [],
    grade_levels: teacher.grade_levels || [],
    teaching_philosophy: teacher.teaching_philosophy || '',
    profile_photo_url: teacher.profile_photo_url || '',
    resume_url: teacher.resume_url || '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<InsertTeacher>) => {
      const { error, data: updatedData } = await supabase
        .from('teachers')
        .update(data)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', userId] });
      toast({
        title: 'Profile updated!',
        description: 'Your profile has been saved successfully.',
      });
      setIsEditing(false);
      onSave?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update profile',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const result = await uploadProfileImage(userId, file);

    if (result.error) {
      toast({
        title: 'Upload failed',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.url) {
      setFormData({ ...formData, profile_photo_url: result.url });
      // Auto-save the image URL
      updateProfileMutation.mutate({ profile_photo_url: result.url });
      toast({
        title: 'Image uploaded!',
        description: 'Your profile photo has been updated.',
      });
    }

    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    const result = await uploadDocument(userId, file, 'resume');

    if (result.error) {
      toast({
        title: 'Upload failed',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.url) {
      setFormData({ ...formData, resume_url: result.url });
      // Auto-save the resume URL
      updateProfileMutation.mutate({ resume_url: result.url });
      toast({
        title: 'Resume uploaded!',
        description: 'Your resume has been uploaded successfully.',
      });
    }

    setIsUploadingResume(false);
    if (resumeInputRef.current) resumeInputRef.current.value = '';
  };

  const toggleSubject = (subject: string) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.includes(subject)
        ? formData.subjects.filter(s => s !== subject)
        : [...formData.subjects, subject]
    });
  };

  const toggleGradeLevel = (level: string) => {
    setFormData({
      ...formData,
      grade_levels: formData.grade_levels.includes(level)
        ? formData.grade_levels.filter(g => g !== level)
        : [...formData.grade_levels, level]
    });
  };

  const normalizeYearsExperience = (value: string) => {
    if (!value) return null;
    const numeric = Number(value.replace(/[^0-9]/g, ''));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  };

  const handleSave = () => {
    const completionPayload: CompletionProfile = {
      full_name: formData.full_name?.trim() || null,
      email: teacher.email || null,
      phone: formData.phone?.trim() || null,
      location: formData.location?.trim() || null,
      bio: formData.bio?.trim() || null,
      years_experience: normalizeYearsExperience(formData.years_experience),
      subjects: formData.subjects,
      grade_levels: formData.grade_levels,
      archetype: teacher.archetype || null,
      teaching_philosophy: formData.teaching_philosophy?.trim() || null,
      certifications: teacher.certifications || [],
    };

    const profileComplete = isProfileComplete(completionPayload);

    updateProfileMutation.mutate({
      full_name: formData.full_name,
      phone: formData.phone,
      location: formData.location,
      bio: formData.bio || null,
      years_experience: formData.years_experience,
      subjects: formData.subjects,
      grade_levels: formData.grade_levels,
      teaching_philosophy: formData.teaching_philosophy || null,
      profile_photo_url: formData.profile_photo_url || null,
      resume_url: formData.resume_url || null,
      profile_complete: profileComplete,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Manage your teaching profile and information</CardDescription>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    full_name: teacher.full_name || '',
                    phone: teacher.phone || '',
                    location: teacher.location || '',
                    bio: teacher.bio || '',
                    years_experience: teacher.years_experience || '',
                    subjects: teacher.subjects || [],
                    grade_levels: teacher.grade_levels || [],
                    teaching_philosophy: teacher.teaching_philosophy || '',
                    profile_photo_url: teacher.profile_photo_url || '',
                    resume_url: teacher.resume_url || '',
                  });
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Photo */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.profile_photo_url || undefined} alt={formData.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                {getInitials(formData.full_name)}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                title="Upload profile photo"
              >
                {isUploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Profile Photo</p>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? 'Click the camera icon to upload a new photo (max 5MB)'
                : 'Upload a photo to make your profile stand out'}
            </p>
            {formData.profile_photo_url && isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setFormData({ ...formData, profile_photo_url: '' });
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Remove Photo
              </Button>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            {isEditing ? (
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-foreground">{formData.full_name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            {isEditing ? (
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-foreground">{formData.phone}</p>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            {isEditing ? (
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-foreground">{formData.location}</p>
            )}
          </div>

          <div>
            <Label htmlFor="years_experience">Years of Experience *</Label>
            {isEditing ? (
              <select
                id="years_experience"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background"
                required
              >
                <option value="">Select...</option>
                {YEARS_EXPERIENCE.map(years => (
                  <option key={years} value={years}>{years}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-foreground">{formData.years_experience}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Bio</Label>
          {isEditing ? (
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              className="mt-1 min-h-24"
              maxLength={500}
            />
          ) : (
            <p className="mt-1 text-sm text-foreground">{formData.bio || 'No bio added yet'}</p>
          )}
          {isEditing && (
            <p className="text-xs text-muted-foreground mt-1">
              {formData.bio.length}/500 characters
            </p>
          )}
        </div>

        {/* Subjects */}
        <div>
          <Label>Subjects *</Label>
          {isEditing ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {SUBJECTS.map(subject => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    formData.subjects.includes(subject)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.subjects.length > 0 ? (
                formData.subjects.map(subject => (
                  <Badge key={subject} variant="secondary" className="rounded-full">
                    {subject}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No subjects selected</p>
              )}
            </div>
          )}
        </div>

        {/* Grade Levels */}
        <div>
          <Label>Grade Levels *</Label>
          {isEditing ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {GRADE_LEVELS.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleGradeLevel(level)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    formData.grade_levels.includes(level)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.grade_levels.length > 0 ? (
                formData.grade_levels.map(level => (
                  <Badge key={level} variant="secondary" className="rounded-full">
                    {level}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No grade levels selected</p>
              )}
            </div>
          )}
        </div>

        {/* Teaching Philosophy */}
        <div>
          <Label htmlFor="teaching_philosophy">Teaching Philosophy</Label>
          {isEditing ? (
            <Textarea
              id="teaching_philosophy"
              value={formData.teaching_philosophy}
              onChange={(e) => setFormData({ ...formData, teaching_philosophy: e.target.value })}
              placeholder="Share your teaching philosophy..."
              className="mt-1 min-h-32"
            />
          ) : (
            <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
              {formData.teaching_philosophy || 'No philosophy added yet'}
            </p>
          )}
        </div>

        {/* Resume Upload */}
        <div>
          <Label>Resume</Label>
          <div className="mt-2 space-y-2">
            {formData.resume_url ? (
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                    <span className="text-primary font-semibold">PDF</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Resume uploaded</p>
                    <a
                      href={formData.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View Resume
                    </a>
                  </div>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, resume_url: '' });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No resume uploaded</p>
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={isUploadingResume}
                  >
                    {isUploadingResume ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Resume
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleResumeUpload}
              className="hidden"
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Upload PDF, DOC, DOCX, or TXT file (max 10MB)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

