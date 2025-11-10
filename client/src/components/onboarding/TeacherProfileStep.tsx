import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const SUBJECTS = [
  'Math', 'Science', 'English', 'History', 'Social Studies', 
  'Art', 'Music', 'PE', 'Special Ed', 'ESL', 'Technology', 'Other'
];

const GRADE_LEVELS = [
  'Pre-K', 'K', '1-2', '3-5', '6-8', '9-12', 'College'
];

const YEARS_EXPERIENCE_OPTIONS = [
  { value: '0-1', label: '0-1 years' },
  { value: '2-5', label: '2-5 years' },
  { value: '6-10', label: '6-10 years' },
  { value: '11-15', label: '11-15 years' },
  { value: '16+', label: '16+ years' },
];

interface TeacherProfileData {
  full_name: string;
  phone: string;
  location: string;
  bio: string;
  years_experience: string;
  subjects: string[];
  grade_levels: string[];
  teaching_philosophy: string;
}

interface TeacherProfileStepProps {
  onNext: (data: TeacherProfileData) => void;
  initialData?: Partial<TeacherProfileData>;
}

export function TeacherProfileStep({ onNext, initialData }: TeacherProfileStepProps) {
  const [formData, setFormData] = useState<TeacherProfileData>({
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    location: initialData?.location || '',
    bio: initialData?.bio || '',
    years_experience: initialData?.years_experience || '',
    subjects: initialData?.subjects || [],
    grade_levels: initialData?.grade_levels || [],
    teaching_philosophy: initialData?.teaching_philosophy || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const toggleGradeLevel = (level: string) => {
    setFormData(prev => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(level)
        ? prev.grade_levels.filter(l => l !== level)
        : [...prev.grade_levels, level]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.years_experience) newErrors.years_experience = 'Years of experience is required';
    if (formData.subjects.length === 0) newErrors.subjects = 'Please select at least one subject';
    if (formData.grade_levels.length === 0) newErrors.grade_levels = 'Please select at least one grade level';
    if (formData.bio && (formData.bio.length < 50 || formData.bio.length > 500)) {
      newErrors.bio = 'Bio must be between 50 and 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="full_name" data-testid="label-full-name">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="full_name"
            data-testid="input-full-name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Enter your full name"
            className={errors.full_name ? 'border-destructive' : ''}
          />
          {errors.full_name && (
            <p className="text-sm text-destructive mt-1" data-testid="error-full-name">{errors.full_name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" data-testid="label-phone">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            data-testid="input-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(555) 123-4567"
            className={errors.phone ? 'border-destructive' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-destructive mt-1" data-testid="error-phone">{errors.phone}</p>
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
            <p className="text-sm text-destructive mt-1" data-testid="error-location">{errors.location}</p>
          )}
        </div>

        <div>
          <Label htmlFor="years_experience" data-testid="label-years-experience">
            Years of Experience <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.years_experience}
            onValueChange={(value) => setFormData({ ...formData, years_experience: value })}
          >
            <SelectTrigger data-testid="select-years-experience" className={errors.years_experience ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select years of experience" />
            </SelectTrigger>
            <SelectContent>
              {YEARS_EXPERIENCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} data-testid={`option-years-${option.value}`}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.years_experience && (
            <p className="text-sm text-destructive mt-1" data-testid="error-years-experience">{errors.years_experience}</p>
          )}
        </div>

        <div>
          <Label data-testid="label-subjects">
            Subjects <span className="text-destructive">*</span>
          </Label>
          <Card className={errors.subjects ? 'border-destructive' : ''}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SUBJECTS.map((subject) => (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject}`}
                      data-testid={`checkbox-subject-${subject.toLowerCase()}`}
                      checked={formData.subjects.includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                    />
                    <Label htmlFor={`subject-${subject}`} className="cursor-pointer font-normal">
                      {subject}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {errors.subjects && (
            <p className="text-sm text-destructive mt-1" data-testid="error-subjects">{errors.subjects}</p>
          )}
        </div>

        <div>
          <Label data-testid="label-grade-levels">
            Grade Levels <span className="text-destructive">*</span>
          </Label>
          <Card className={errors.grade_levels ? 'border-destructive' : ''}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {GRADE_LEVELS.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grade-${level}`}
                      data-testid={`checkbox-grade-${level.toLowerCase()}`}
                      checked={formData.grade_levels.includes(level)}
                      onCheckedChange={() => toggleGradeLevel(level)}
                    />
                    <Label htmlFor={`grade-${level}`} className="cursor-pointer font-normal">
                      {level}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {errors.grade_levels && (
            <p className="text-sm text-destructive mt-1" data-testid="error-grade-levels">{errors.grade_levels}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bio" data-testid="label-bio">
            Bio <span className="text-muted-foreground text-sm">(Optional, 50-500 characters)</span>
          </Label>
          <Textarea
            id="bio"
            data-testid="textarea-bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself and your teaching experience..."
            rows={4}
            className={errors.bio ? 'border-destructive' : ''}
          />
          <div className="flex justify-between mt-1">
            {errors.bio ? (
              <p className="text-sm text-destructive" data-testid="error-bio">{errors.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-bio-count">
                {formData.bio.length} / 500 characters
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="teaching_philosophy" data-testid="label-teaching-philosophy">
            Teaching Philosophy <span className="text-muted-foreground text-sm">(Optional)</span>
          </Label>
          <Textarea
            id="teaching_philosophy"
            data-testid="textarea-teaching-philosophy"
            value={formData.teaching_philosophy}
            onChange={(e) => setFormData({ ...formData, teaching_philosophy: e.target.value })}
            placeholder="Describe your teaching philosophy and approach..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" data-testid="button-next-profile">
          Continue to Quiz
        </Button>
      </div>
    </form>
  );
}
