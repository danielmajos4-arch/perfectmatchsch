export interface TeacherProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  years_experience: string | null;
  subjects: string[] | null;
  grade_levels: string[] | null;
  archetype: string | null;
  teaching_philosophy: string | null;
  certifications: string[] | null;
}

export function calculateProfileCompletion(profile: TeacherProfile): number {
  const requiredFields = [
    'full_name',
    'email',
    'phone',
    'location',
    'bio',
    'years_experience',
    'subjects',
    'grade_levels',
    'archetype',
    'teaching_philosophy',
  ];

  const completedFields = requiredFields.filter((field) => {
    const value = profile[field as keyof TeacherProfile];
    if (Array.isArray(value)) return value.length > 0;
    // years_experience is now a string, so we check if it's not empty
    return value !== null && value !== '';
  });

  return Math.round((completedFields.length / requiredFields.length) * 100);
}

export function isProfileComplete(profile: TeacherProfile): boolean {
  return calculateProfileCompletion(profile) === 100;
}

export function getMissingFields(profile: TeacherProfile): string[] {
  const fieldLabels: Record<string, string> = {
    full_name: 'Full Name',
    email: 'Email',
    phone: 'Phone Number',
    location: 'Location',
    bio: 'Bio',
    years_experience: 'Years of Experience',
    subjects: 'Subjects',
    grade_levels: 'Grade Levels',
    archetype: 'Teaching Archetype',
    teaching_philosophy: 'Teaching Philosophy',
  };

  const requiredFields = Object.keys(fieldLabels);

  return requiredFields
    .filter((field) => {
      const value = profile[field as keyof TeacherProfile];
      if (Array.isArray(value)) return value.length === 0;
      // years_experience is now a string
      return value === null || value === '';
    })
    .map((field) => fieldLabels[field]);
}



export interface SchoolProfile {
  school_name: string | null;
  school_type: string | null;
  location: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
}

export function calculateSchoolProfileCompletion(profile: SchoolProfile): number {
  const requiredFields = [
    'school_name',
    'school_type',
    'location',
    'description',
  ];

  const completedFields = requiredFields.filter((field) => {
    const value = profile[field as keyof SchoolProfile];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return value > 0;
    return value !== null && value !== '';
  });

  return Math.round((completedFields.length / requiredFields.length) * 100);
}

export function isSchoolProfileComplete(profile: SchoolProfile): boolean {
  // For schools, we consider it complete if required fields are filled
  // We don't require 100% if we have optional fields like website/logo, 
  // but for now let's stick to the required fields defined in calculateSchoolProfileCompletion
  return calculateSchoolProfileCompletion(profile) === 100;
}
