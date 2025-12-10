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
const MIN_BIO_LENGTH = 50;
const MAX_BIO_LENGTH = 500;
const MIN_PHILOSOPHY_LENGTH = 30;
const MAX_PHILOSOPHY_LENGTH = 400;

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
    const normalizedYears = normalizeYearsExperience(formData.years_experience);
    const completionPayload: CompletionProfile = {
      full_name: formData.full_name?.trim() || null,
      email: teacher.email || null,
      phone: formData.phone?.trim() || null,
      location: formData.location?.trim() || null,
      bio: formData.bio?.trim() || null,
      years_experience: normalizedYears !== null ? String(normalizedYears) : null,
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
    <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95 overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary to-purple-600" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Profile Information</CardTitle>
            <CardDescription className="text-base mt-1">Manage your teaching profile and information</CardDescription>
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
      <CardContent className="space-y-8">
        {/* Profile Photo */}
        <div className="flex items-center gap-8 p-6 bg-muted/30 rounded-xl border border-border/50">
          <div className="relative group">
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-border/50 transition-transform group-hover:scale-105">
              <AvatarImage src={formData.profile_photo_url || undefined} alt={formData.full_name} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                {getInitials(formData.full_name)}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                title="Upload profile photo"
              >
                {isUploadingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
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
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Profile Photo</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {isEditing
                ? 'Click the camera icon to upload a new photo (max 5MB)'
                : 'Upload a photo to make your profile stand out'}
            </p>
            {formData.profile_photo_url && isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-base">Full Name <span className="text-destructive">*</span></Label>
            {isEditing ? (
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="h-11 text-base bg-background/50 focus:bg-background transition-colors"
              />
            ) : (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-base font-medium">{formData.full_name}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base">Phone Number <span className="text-destructive">*</span></Label>
            {isEditing ? (
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="h-11 text-base bg-background/50 focus:bg-background transition-colors"
              />
            ) : (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-base font-medium">{formData.phone}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-base">Location <span className="text-destructive">*</span></Label>
            {isEditing ? (
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="h-11 text-base bg-background/50 focus:bg-background transition-colors"
              />
            ) : (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-base font-medium">{formData.location}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="years_experience" className="text-base">Years of Experience <span className="text-destructive">*</span></Label>
            {isEditing ? (
              <select
                id="years_experience"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                className="w-full h-11 px-3 rounded-md border border-input bg-background/50 focus:bg-background transition-colors text-base"
                required
              >
                <option value="">Select...</option>
                {YEARS_EXPERIENCE.map(years => (
                  <option key={years} value={years}>{years}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-base font-medium">{formData.years_experience}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-base">Bio</Label>
          {isEditing ? (
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= MAX_BIO_LENGTH) {
                  setFormData({ ...formData, bio: value });
                }
              }}
              placeholder="Tell us about yourself..."
              className="min-h-[120px] text-base bg-background/50 focus:bg-background transition-colors resize-y"
              maxLength={MAX_BIO_LENGTH}
            />
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 min-h-[80px]">
              <p className="text-base leading-relaxed">{formData.bio || 'No bio added yet'}</p>
            </div>
          )}
          {isEditing && (
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/{MAX_BIO_LENGTH} characters (minimum {MIN_BIO_LENGTH} required)
            </p>
          )}
        </div>

        {/* Subjects */}
        <div className="space-y-3">
          <Label className="text-base">Subjects <span className="text-destructive">*</span></Label>
          {isEditing ? (
            <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-xl border border-border/50">
              {SUBJECTS.map(subject => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.subjects.includes(subject)
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'bg-background hover:bg-muted border border-border hover:border-primary/50'
                    }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formData.subjects.length > 0 ? (
                formData.subjects.map(subject => (
                  <Badge key={subject} variant="secondary" className="rounded-full px-3 py-1 text-sm">
                    {subject}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No subjects selected</p>
              )}
            </div>
          )}
        </div>

        {/* Grade Levels */}
        <div className="space-y-3">
          <Label className="text-base">Grade Levels <span className="text-destructive">*</span></Label>
          {isEditing ? (
            <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-xl border border-border/50">
              {GRADE_LEVELS.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleGradeLevel(level)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.grade_levels.includes(level)
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'bg-background hover:bg-muted border border-border hover:border-primary/50'
                    }`}
                >
                  {level}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formData.grade_levels.length > 0 ? (
                formData.grade_levels.map(level => (
                  <Badge key={level} variant="secondary" className="rounded-full px-3 py-1 text-sm">
                    {level}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No grade levels selected</p>
              )}
            </div>
          )}
        </div>

        {/* Teaching Philosophy */}
        <div className="space-y-2">
          <Label htmlFor="teaching_philosophy" className="text-base">Teaching Philosophy</Label>
          {isEditing ? (
            <Textarea
              id="teaching_philosophy"
              value={formData.teaching_philosophy}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= MAX_PHILOSOPHY_LENGTH) {
                  setFormData({ ...formData, teaching_philosophy: value });
                }
              }}
              placeholder="Share your teaching philosophy..."
              className="min-h-[150px] text-base bg-background/50 focus:bg-background transition-colors resize-y"
              maxLength={MAX_PHILOSOPHY_LENGTH}
            />
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 min-h-[100px]">
              <p className="text-base whitespace-pre-wrap leading-relaxed">
                {formData.teaching_philosophy || 'No philosophy added yet'}
              </p>
            </div>
          )}
          {isEditing && (
            <p className="text-xs text-muted-foreground text-right">
              {formData.teaching_philosophy.length}/{MAX_PHILOSOPHY_LENGTH} characters (minimum {MIN_PHILOSOPHY_LENGTH} required)
            </p>
          )}
        </div>

        {/* Resume Upload */}
        <div className="space-y-3">
          <Label className="text-base">Resume</Label>
          <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
            {formData.resume_url ? (
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-sm">PDF</span>
                  </div>
                  <div>
                    <p className="font-medium">Resume uploaded</p>
                    <a
                      href={formData.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
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
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:bg-background/50 transition-colors">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-base font-medium text-foreground mb-1">No resume uploaded</p>
                <p className="text-sm text-muted-foreground mb-4">Upload your resume to help schools find you</p>
                {isEditing && (
                  <Button
                    variant="outline"
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
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Upload PDF, DOC, DOCX, or TXT file (max 10MB)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
