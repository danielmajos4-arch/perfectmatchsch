import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
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
  { value: '1', label: '1 year' },
  { value: '2-5', label: '2-5 years' },
  { value: '6-10', label: '6-10 years' },
  { value: '11-15', label: '11-15 years' },
  { value: '16+', label: '16+ years' },
];

const MIN_BIO_LENGTH = 50;
const MIN_BIO_MAX = 500;
const MIN_PHILOSOPHY_LENGTH = 30;

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

export const TeacherProfileStep = memo(function TeacherProfileStep({ onNext, initialData }: TeacherProfileStepProps) {
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
  const previousInitialDataRef = useRef<Partial<TeacherProfileData> | undefined>(initialData);

  useEffect(() => {
    if (!initialData) return;

    const prevInitialData = previousInitialDataRef.current;
    
    // Deep comparison to prevent unnecessary updates
    const hasMeaningfulChange =
      !prevInitialData ||
      Object.entries(initialData).some(([key, value]) => {
        const typedKey = key as keyof TeacherProfileData;
        const prevValue = prevInitialData[typedKey];
        
        // Handle array comparison
        if (Array.isArray(value) && Array.isArray(prevValue)) {
          if (value.length !== prevValue.length) return true;
          return value.some((v, i) => v !== prevValue[i]);
        }
        
        return value !== prevValue;
      });

    if (!hasMeaningfulChange) {
      return;
    }

    setFormData((prev) => {
      // Only update if there are actual changes
      const hasChanges = Object.entries(initialData).some(([key, value]) => {
        const typedKey = key as keyof TeacherProfileData;
        const prevValue = prev[typedKey];
        
        if (Array.isArray(value) && Array.isArray(prevValue)) {
          if (value.length !== prevValue.length) return true;
          return value.some((v, i) => v !== prevValue[i]);
        }
        
        return value !== prevValue;
      });
      
      if (!hasChanges) {
        return prev; // Return same reference to prevent re-render
      }
      
      return {
        ...prev,
        ...initialData,
      };
    });

    previousInitialDataRef.current = initialData;
  }, [initialData]);

  const toggleSubject = useCallback((subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  }, []);

  const toggleGradeLevel = useCallback((level: string) => {
    setFormData(prev => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(level)
        ? prev.grade_levels.filter(l => l !== level)
        : [...prev.grade_levels, level],
    }));
  }, []);

  const handleYearsExperienceChange = useCallback((value: string) => {
    // Prevent unnecessary updates if value hasn't changed
    setFormData(prev => {
      const currentValue = prev.years_experience || '';
      if (currentValue === value) {
        return prev; // Return same reference if unchanged to prevent re-render
      }
      return {
        ...prev,
        years_experience: value,
      };
    });
  }, []);

  const handleFullNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, full_name: e.target.value }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, phone: e.target.value }));
  }, []);

  const handleLocationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, location: e.target.value }));
  }, []);

  const handleBioChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, bio: e.target.value }));
  }, []);

  const handleTeachingPhilosophyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, teaching_philosophy: e.target.value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.years_experience) {
      newErrors.years_experience = 'Years of experience is required';
    } else if (formData.years_experience === '0') {
      newErrors.years_experience = 'Please enter at least 1 year of experience';
    }
    if (formData.subjects.length === 0) newErrors.subjects = 'Please select at least one subject';
    if (formData.grade_levels.length === 0) newErrors.grade_levels = 'Please select at least one grade level';
    if (!formData.bio.trim()) {
      newErrors.bio = 'Bio is required';
    } else if (formData.bio.length < MIN_BIO_LENGTH || formData.bio.length > MIN_BIO_MAX) {
      newErrors.bio = `Bio must be between ${MIN_BIO_LENGTH} and ${MIN_BIO_MAX} characters`;
    }
    if (!formData.teaching_philosophy.trim()) {
      newErrors.teaching_philosophy = 'Teaching philosophy is required';
    } else if (formData.teaching_philosophy.trim().length < MIN_PHILOSOPHY_LENGTH) {
      newErrors.teaching_philosophy = `Teaching philosophy must be at least ${MIN_PHILOSOPHY_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Form submission handler - memoized to prevent re-renders
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext({
        ...formData,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        teaching_philosophy: formData.teaching_philosophy.trim(),
      });
    }
  }, [formData, onNext, validateForm]);

  const requiredFieldStatuses = useMemo(() => {
    return [
      Boolean(formData.full_name.trim()),
      Boolean(formData.phone.trim()),
      Boolean(formData.location.trim()),
      Boolean(formData.years_experience && formData.years_experience !== '0'),
      formData.subjects.length > 0,
      formData.grade_levels.length > 0,
      Boolean(formData.bio.trim() && formData.bio.length >= MIN_BIO_LENGTH),
      Boolean(formData.teaching_philosophy.trim() && formData.teaching_philosophy.trim().length >= MIN_PHILOSOPHY_LENGTH),
    ];
  }, [formData]);

  const completedRequiredFields = requiredFieldStatuses.filter(Boolean).length;
  const totalRequiredFields = requiredFieldStatuses.length;
  const isFormComplete = completedRequiredFields === totalRequiredFields;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg bg-muted/40 px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          Required fields complete: {completedRequiredFields} / {totalRequiredFields}
        </p>
        {!isFormComplete && (
          <p className="text-xs text-muted-foreground">
            Finish all required fields to continue
          </p>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="full_name" data-testid="label-full-name">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="full_name"
            data-testid="input-full-name"
            value={formData.full_name}
            onChange={handleFullNameChange}
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
            onChange={handlePhoneChange}
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
            onChange={handleLocationChange}
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
            value={formData.years_experience || ''}
            onValueChange={handleYearsExperienceChange}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {SUBJECTS.map((subject) => (
                  <div key={subject} className="flex items-center space-x-2 min-h-[44px]">
                    <Checkbox
                      id={`subject-${subject}`}
                      data-testid={`checkbox-subject-${subject.toLowerCase()}`}
                      checked={formData.subjects.includes(subject)}
                      onCheckedChange={() => toggleSubject(subject)}
                      className="h-5 w-5"
                    />
                    <Label htmlFor={`subject-${subject}`} className="cursor-pointer font-normal text-sm sm:text-base">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {GRADE_LEVELS.map((level) => (
                  <div key={level} className="flex items-center space-x-2 min-h-[44px]">
                    <Checkbox
                      id={`grade-${level}`}
                      data-testid={`checkbox-grade-${level.toLowerCase()}`}
                      checked={formData.grade_levels.includes(level)}
                      onCheckedChange={() => toggleGradeLevel(level)}
                      className="h-5 w-5"
                    />
                    <Label htmlFor={`grade-${level}`} className="cursor-pointer font-normal text-sm sm:text-base">
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
            Bio <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="bio"
            data-testid="textarea-bio"
            value={formData.bio}
            onChange={handleBioChange}
            placeholder="Tell us about yourself and your teaching experience..."
            rows={4}
            className={errors.bio ? 'border-destructive' : ''}
          />
          <div className="flex justify-between mt-1">
            {errors.bio ? (
              <p className="text-sm text-destructive" data-testid="error-bio">{errors.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-bio-count">
                {formData.bio.length} / {MIN_BIO_MAX} characters
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="teaching_philosophy" data-testid="label-teaching-philosophy">
            Teaching Philosophy <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="teaching_philosophy"
            data-testid="textarea-teaching-philosophy"
            value={formData.teaching_philosophy}
            onChange={handleTeachingPhilosophyChange}
            placeholder="Describe your teaching philosophy and approach..."
            rows={3}
          />
          {errors.teaching_philosophy ? (
            <p className="text-sm text-destructive mt-1" data-testid="error-teaching-philosophy">
              {errors.teaching_philosophy}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {formData.teaching_philosophy.length} characters
            </p>
          )}
        </div>
      </div>

      {!isFormComplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete all required fields before continuing to the archetype quiz.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" data-testid="button-next-profile" disabled={!isFormComplete} className="w-full sm:w-auto min-h-12">
          Continue to Quiz
        </Button>
      </div>
    </form>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if onNext function reference changes or initialData actually changes
  if (prevProps.onNext !== nextProps.onNext) {
    return false; // Re-render if onNext changes
  }
  
  // Deep comparison of initialData
  if (prevProps.initialData === nextProps.initialData) {
    return true; // Skip re-render if same reference
  }
  
  if (!prevProps.initialData && !nextProps.initialData) {
    return true; // Skip re-render if both are undefined
  }
  
  if (!prevProps.initialData || !nextProps.initialData) {
    return false; // Re-render if one is undefined and other isn't
  }
  
  // Deep comparison of all fields
  const prev = prevProps.initialData;
  const next = nextProps.initialData;
  
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    const prevValue = prev[key as keyof typeof prev];
    const nextValue = next[key as keyof typeof next];
    
    if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
      if (prevValue.length !== nextValue.length) {
        return false; // Re-render if array lengths differ
      }
      if (prevValue.some((v, i) => v !== nextValue[i])) {
        return false; // Re-render if array contents differ
      }
    } else if (prevValue !== nextValue) {
      return false; // Re-render if values differ
    }
  }
  
  return true; // Skip re-render if all values are the same
});
