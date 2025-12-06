import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { TeacherProfileStep } from '@/components/onboarding/TeacherProfileStep';
import { ArchetypeQuiz } from '@/components/onboarding/ArchetypeQuiz';
import { ArchetypeResults } from '@/components/onboarding/ArchetypeResults';
import { supabase } from '@/lib/supabaseClient';
import { QuizWithOptions, UserArchetype, InsertTeacher, Teacher } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
const logoUrl = '/images/logo.png';
import { getMissingFields, isProfileComplete, calculateProfileCompletion, TeacherProfile as CompletionProfile } from '@/lib/profileUtils';

type OnboardingStep = 'profile' | 'quiz' | 'results';

const ARCHETYPE_MAPPING: Record<string, string> = {
  mentor: "The Guide",
  innovator: "The Trailblazer",
  advocate: "The Changemaker",
  collaborator: "The Connector",
  specialist: "The Explorer",
  leader: "The Leader"
};

interface ProfileFormData {
  full_name: string;
  phone: string;
  location: string;
  bio?: string | null;
  years_experience: string;
  subjects: string[];
  grade_levels: string[];
  teaching_philosophy?: string | null;
  certifications?: string[];
}

const normalizeYearsExperience = (value?: string | null) => {
  if (!value) return null;
  const numeric = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
};

export default function TeacherOnboarding() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  const [profileData, setProfileData] = useState<ProfileFormData | null>(null);
  const [archetypeData, setArchetypeData] = useState<UserArchetype | null>(null);
  const [error, setError] = useState('');
  const profileInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isTransitioningRef = useRef(false);

  // Track component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Email verification guard - redirect if email not verified
  useEffect(() => {
    if (user && !user.email_confirmed_at) {
      console.log('[TeacherOnboarding] Email not verified, redirecting to verification page');
      window.history.replaceState({ usr: { email: user.email } }, '', '/verify-email');
      setLocation('/verify-email');
    }
  }, [user, setLocation]);

  const { data: teacherProfile, isLoading: teacherProfileLoading } = useQuery<Teacher | null>({
    queryKey: ['teacher-onboarding-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('[TeacherOnboarding] Fetching profile for user:', user.id);

      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          location,
          bio,
          years_experience,
          subjects,
          grade_levels,
          teaching_philosophy,
          certifications,
          archetype,
          quiz_result,
          profile_complete,
          profile_photo_url,
          resume_url,
          portfolio_url,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[TeacherOnboarding] Profile fetch error:', error);
        throw error;
      }

      console.log('[TeacherOnboarding] Profile loaded:', data ? 'Found' : 'Not found');
      return data as Teacher | null;
    },
    enabled: !!user?.id,
    retry: 2,
    retryDelay: 1000,
  });

  const isTeacher = user?.user_metadata?.role === 'teacher';
  const shouldEnforceGuard = isTeacher && !teacherProfile?.profile_complete;

  useEffect(() => {
    if (!profileInitializedRef.current && teacherProfile && isMountedRef.current) {
      setProfileData({
        full_name: teacherProfile.full_name || user?.user_metadata?.full_name || '',
        phone: teacherProfile.phone || '',
        location: teacherProfile.location || '',
        bio: teacherProfile.bio || '',
        years_experience: teacherProfile.years_experience || '',
        subjects: teacherProfile.subjects || [],
        grade_levels: teacherProfile.grade_levels || [],
        teaching_philosophy: teacherProfile.teaching_philosophy || '',
        certifications: teacherProfile.certifications || [],
      });
      profileInitializedRef.current = true;
    }
  }, [teacherProfile, user]);

  // Fixed: Only redirect if profile is complete AND we're not on results step AND not already transitioning
  useEffect(() => {
    // Don't run if component is unmounted or we're transitioning
    if (!isMountedRef.current || isTransitioningRef.current) return;

    // Only redirect if:
    // 1. Profile is complete
    // 2. We're not on results step (we want to show results first)
    // 3. We're not already on dashboard
    // 4. We're not currently on quiz step (let quiz complete first)
    if (
      teacherProfile?.profile_complete &&
      currentStep !== 'results' &&
      currentStep !== 'quiz' &&
      location !== '/teacher/dashboard'
    ) {
      setLocation('/teacher/dashboard');
    }
  }, [teacherProfile?.profile_complete, currentStep, setLocation, location]);

  useEffect(() => {
    if (!shouldEnforceGuard) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Your profile is incomplete. Are you sure you want to leave?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldEnforceGuard]);

  useEffect(() => {
    if (!shouldEnforceGuard) return;

    const enforceOnboarding = (event: PopStateEvent) => {
      event.preventDefault();
      setLocation('/onboarding/teacher');
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', enforceOnboarding);
    return () => window.removeEventListener('popstate', enforceOnboarding);
  }, [shouldEnforceGuard, setLocation]);

  const { data: quizData, isLoading: loadingQuiz, error: quizError } = useQuery<QuizWithOptions[]>({
    queryKey: ['quiz-questions'],
    queryFn: async () => {
      console.log('=== QUIZ DATA LOAD DEBUG START ===');

      // Try quiz_with_options view first
      let data, error;

      try {
        const result = await supabase
          .from('quiz_with_options')
          .select('*')
          .order('question_order');

        data = result.data;
        error = result.error;

        console.log('1. quiz_with_options view result:', {
          hasData: !!data,
          dataLength: data?.length || 0,
          error: error,
          firstRow: data?.[0]
        });
      } catch (viewError) {
        console.log('1a. quiz_with_options view failed, trying direct tables...', viewError);
        // Fallback: query tables directly
        const questionsResult = await supabase
          .from('archetype_quiz_questions')
          .select('*')
          .order('question_order');

        const optionsResult = await supabase
          .from('archetype_quiz_options')
          .select('*');

        console.log('1b. Direct table queries:', {
          questions: questionsResult.data?.length || 0,
          options: optionsResult.data?.length || 0,
          questionsError: questionsResult.error,
          optionsError: optionsResult.error
        });

        if (questionsResult.error || optionsResult.error) {
          throw questionsResult.error || optionsResult.error;
        }

        // Group manually
        const grouped = (questionsResult.data || []).map((q: any) => ({
          question_id: q.question_id,
          question: q.question,
          question_order: q.question_order,
          options: (optionsResult.data || [])
            .filter((opt: any) => opt.question_id === q.question_id)
            .map((opt: any) => ({
              id: opt.id,
              question_id: opt.question_id,
              text: opt.text,
              scores: opt.scores
            }))
        }));

        console.log('1c. Grouped data:', {
          questionsCount: grouped.length,
          optionsPerQuestion: grouped.map(q => q.options.length)
        });

        return grouped.sort((a, b) => a.question_order - b.question_order);
      }

      if (error) {
        console.error('Quiz data error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No quiz data returned from database');
        return [];
      }

      console.log('2a. Raw data from view (first 3 rows):', data.slice(0, 3));

      // Group questions with their options
      const groupedQuestions = data.reduce((acc: any[], row: any) => {
        // Find if this question already exists in our accumulator
        let existingQuestion = acc.find(q => q.question_id === row.question_id);

        // Create option object from row data
        const option = {
          id: row.option_id || row.id,
          question_id: row.question_id,
          text: row.option_text || row.text,
          scores: row.scores || {}
        };

        // Validate option has required fields
        if (!option.id || !option.text) {
          console.warn('Skipping invalid option:', option, 'from row:', row);
          return acc;
        }

        if (existingQuestion) {
          // Question exists, add option to it
          if (!existingQuestion.options) {
            existingQuestion.options = [];
          }
          existingQuestion.options.push(option);
        } else {
          // New question, create it with first option
          acc.push({
            question_id: row.question_id,
            question: row.question,
            question_order: row.question_order,
            options: [option]
          });
        }

        return acc;
      }, []);

      const sorted = groupedQuestions.sort((a, b) => a.question_order - b.question_order);

      console.log('2b. Grouped and sorted quiz data:', {
        questionsCount: sorted.length,
        questionsWithOptions: sorted.map(q => ({
          question_id: q.question_id,
          question: q.question?.substring(0, 50) + '...',
          question_order: q.question_order,
          optionsCount: q.options?.length || 0,
          options: q.options?.map((o: any) => ({
            id: o.id,
            text: o.text?.substring(0, 40) + '...',
            hasScores: !!o.scores
          }))
        }))
      });

      // CRITICAL CHECK: Verify every question has options
      const questionsWithoutOptions = sorted.filter(q => !q.options || q.options.length === 0);
      if (questionsWithoutOptions.length > 0) {
        console.error('❌ QUESTIONS WITHOUT OPTIONS FOUND:', questionsWithoutOptions);
        console.error('This should not happen! Check database data.');
      } else {
        console.log('✅ All questions have options!');
      }

      // Verify minimum options per question
      const questionsWithFewOptions = sorted.filter(q => q.options && q.options.length < 4);
      if (questionsWithFewOptions.length > 0) {
        console.warn('⚠️ Some questions have fewer than 4 options:', questionsWithFewOptions.map(q => ({
          question_id: q.question_id,
          optionsCount: q.options.length
        })));
      }

      console.log('=== QUIZ DATA LOAD DEBUG END ===');

      return sorted;
    },
  });

  const getCompletionPayload = useCallback(
    (overrides: Partial<CompletionProfile> = {}) => {
      if (!user) return null;
      const source = profileData || teacherProfile;
      if (!source) return null;

      const certifications = source.certifications ?? teacherProfile?.certifications ?? [];
      const archetypeValue =
        overrides.archetype ??
        archetypeData?.archetype_name ??
        teacherProfile?.archetype ??
        null;

      return {
        full_name: (source.full_name || user.user_metadata?.full_name || '').trim(),
        email: user.email || null,
        phone: source.phone || null,
        location: source.location || null,
        bio: source.bio || null,
        years_experience: normalizeYearsExperience(source.years_experience),
        subjects: source.subjects || [],
        grade_levels: source.grade_levels || [],
        archetype: archetypeValue,
        teaching_philosophy: source.teaching_philosophy || null,
        certifications,
        ...overrides,
      } as CompletionProfile;
    },
    [user, profileData, teacherProfile, archetypeData]
  );

  const onboardingComplete = useMemo(() => {
    const payload = getCompletionPayload();
    return payload ? isProfileComplete(payload) : false;
  }, [getCompletionPayload]);

  const incompleteFields = useMemo(() => {
    if (onboardingComplete) return [];
    const payload = getCompletionPayload();
    return payload ? getMissingFields(payload) : [];
  }, [onboardingComplete, getCompletionPayload]);

  const saveProfileMutation = useMutation({
    retry: 1,
    retryDelay: 1000,
    mutationFn: async (data: any) => {
      console.log('[SAVE] ========================================');
      console.log('[SAVE] Step 1: Starting mutation');
      console.log('[SAVE] Input data:', data);
      console.log('[SAVE] ========================================');

      try {
        // 1. Check if user is authenticated (use AuthContext user directly)
        console.log('[SAVE] Step 2: Checking user from AuthContext...');
        if (!user) {
          console.error('[SAVE] ERROR: No user found in AuthContext');
          throw new Error('No user found. Please log in again.');
        }
        console.log('[SAVE] Step 3: User authenticated:', { userId: user.id, email: user.email });

        // 2. First check if user exists in users table (required for foreign key)
        console.log('[SAVE] Step 5: Checking user record in users table...');
        const { data: userRecord, error: userRecordError } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[SAVE] Step 6: User record check result:', {
          exists: !!userRecord,
          data: userRecord,
          error: userRecordError,
          errorDetails: userRecordError ? {
            code: userRecordError.code,
            message: userRecordError.message,
            details: userRecordError.details,
            hint: userRecordError.hint
          } : null
        });

        // If user doesn't exist in users table, create it
        if (!userRecord && !userRecordError) {
          console.log('[SAVE] Step 7: User record not found, creating it...');
          const { data: newUserRecord, error: createUserError } = await supabase
            .from('users')
            .insert([{
              id: user.id,
              email: user.email || '',
              role: user.user_metadata?.role || 'teacher',
              full_name: user.user_metadata?.full_name || data.full_name || ''
            }])
            .select()
            .single();

          console.log('[SAVE] Step 8: User creation result:', {
            success: !!newUserRecord,
            data: newUserRecord,
            error: createUserError,
            errorDetails: createUserError ? {
              code: createUserError.code,
              message: createUserError.message,
              details: createUserError.details,
              hint: createUserError.hint
            } : null
          });

          if (createUserError) {
            console.error('[SAVE] ERROR at Step 8: Failed to create user record:', createUserError);
            throw new Error(`Failed to create user record: ${createUserError.message}`);
          }
          console.log('[SAVE] Step 9: User record created successfully');
        } else {
          console.log('[SAVE] Step 7: User record already exists, skipping creation');
        }

        // 3. Check if teacher record exists
        console.log('[SAVE] Step 10: Checking for existing teacher record...');
        const { data: existingTeacher, error: checkError } = await supabase
          .from('teachers')
          .select('id, user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[SAVE] Step 11: Teacher record check result:', {
          exists: !!existingTeacher,
          data: existingTeacher,
          error: checkError,
          errorDetails: checkError ? {
            code: checkError.code,
            message: checkError.message,
            details: checkError.details,
            hint: checkError.hint
          } : null
        });

        // 4. Prepare data to save
        console.log('[SAVE] Step 12: Preparing teacher data...');
        const teacherData: InsertTeacher = {
          user_id: user.id,
          full_name: data.full_name,
          email: user.email || '',
          phone: data.phone,
          location: data.location,
          bio: data.bio || null,
          years_experience: data.years_experience,
          subjects: data.subjects,
          grade_levels: data.grade_levels,
          teaching_philosophy: data.teaching_philosophy || null,
          certifications: data.certifications || teacherProfile?.certifications || [],
          profile_complete: false,
        };

        console.log('[SAVE] Step 13: Teacher data prepared:', {
          user_id: teacherData.user_id,
          full_name: teacherData.full_name,
          email: teacherData.email,
          phone: teacherData.phone,
          location: teacherData.location,
          bio_length: teacherData.bio?.length || 0,
          years_experience: teacherData.years_experience,
          subjects_count: teacherData.subjects?.length || 0,
          subjects: teacherData.subjects,
          grade_levels_count: teacherData.grade_levels?.length || 0,
          grade_levels: teacherData.grade_levels,
          certifications_count: teacherData.certifications?.length || 0,
          profile_complete: teacherData.profile_complete
        });

        // 5. Use UPSERT to handle both insert and update in one operation
        console.log('[SAVE] Step 14: Starting UPSERT operation...');
        console.log('[SAVE] Step 14a: About to call supabase.from("teachers").upsert()...');

        const { data: upsertedData, error: upsertError } = await supabase
          .from('teachers')
          .upsert(teacherData, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        console.log('[SAVE] Step 15: UPSERT completed, processing result...');
        console.log('[SAVE] Step 16: Upsert result:', {
          success: !!upsertedData,
          data: upsertedData,
          error: upsertError,
          errorDetails: upsertError ? {
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint
          } : null
        });

        if (upsertError) {
          // If upsert fails, try separate insert/update as fallback
          console.log('[SAVE] Step 17: UPSERT failed, trying fallback insert/update...');

          if (existingTeacher) {
            console.log('[SAVE] Step 18: Fallback - Updating existing teacher record...');
            const { data: updatedData, error: updateError } = await supabase
              .from('teachers')
              .update(teacherData)
              .eq('user_id', user.id)
              .select()
              .single();

            console.log('[SAVE] Step 19: Fallback update result:', {
              success: !!updatedData,
              data: updatedData,
              error: updateError
            });

            if (updateError) {
              console.error('[SAVE] ERROR at Step 19: Fallback update failed:', updateError);
              throw updateError;
            }
            console.log('[SAVE] Step 20: Fallback update succeeded');
          } else {
            console.log('[SAVE] Step 18: Fallback - Inserting new teacher record...');
            const { data: insertedData, error: insertError } = await supabase
              .from('teachers')
              .insert(teacherData)
              .select()
              .single();

            console.log('[SAVE] Step 19: Fallback insert result:', {
              success: !!insertedData,
              data: insertedData,
              error: insertError
            });

            if (insertError) {
              console.error('[SAVE] ERROR at Step 19: Fallback insert failed:', insertError);
              throw insertError;
            }
            console.log('[SAVE] Step 20: Fallback insert succeeded');
          }
        } else {
          console.log('[SAVE] Step 17: UPSERT succeeded, no fallback needed');
        }

        // 6. Verify the save worked - FINAL DATABASE CHECK
        console.log('[SAVE] Step 21: Starting final database verification...');
        const { data: verifyTeacher, error: verifyError } = await supabase
          .from('teachers')
          .select('id, user_id, full_name, email, phone, location, subjects, grade_levels, profile_complete, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[SAVE] Step 22: Verification query completed');
        console.log('[SAVE] Step 23: Final verification result:', {
          exists: !!verifyTeacher,
          data: verifyTeacher,
          error: verifyError,
          profileComplete: verifyTeacher?.profile_complete,
          hasSubjects: (verifyTeacher?.subjects?.length || 0) > 0,
          hasGradeLevels: (verifyTeacher?.grade_levels?.length || 0) > 0
        });

        if (!verifyTeacher) {
          console.error('[SAVE] ERROR at Step 23: Verification failed - no teacher record found');
          throw new Error('CRITICAL: Profile save verification failed - record not found in database after save operation');
        }

        console.log('[SAVE] Step 24: Verification successful!');
        console.log('[SAVE] ✅ PROFILE CONFIRMED SAVED TO DATABASE');
        console.log('[SAVE] ✅ Saved Data:', {
          id: verifyTeacher.id,
          user_id: verifyTeacher.user_id,
          full_name: verifyTeacher.full_name,
          email: verifyTeacher.email,
          phone: verifyTeacher.phone,
          location: verifyTeacher.location,
          subjects: verifyTeacher.subjects,
          grade_levels: verifyTeacher.grade_levels,
          profile_complete: verifyTeacher.profile_complete,
          created_at: verifyTeacher.created_at
        });

        console.log('[SAVE] Step 25: Preparing to return data');
        console.log('[SAVE] ========================================');
        console.log('[SAVE] SUCCESS - Returning teacher data');
        console.log('[SAVE] ========================================');
        return teacherData;

      } catch (error: any) {
        console.error('[SAVE] ========================================');
        console.error('[SAVE] EXCEPTION CAUGHT IN TRY/CATCH');
        console.error('[SAVE] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error,
          stack: error.stack
        });
        console.error('[SAVE] ========================================');
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('=== PROFILE SAVE SUCCESS ===');
      console.log('Saved data:', data);

      // Always set profile data and transition to quiz
      if (isMountedRef.current) {
        setProfileData({
          ...data,
          certifications: data.certifications || teacherProfile?.certifications || [],
        });

        console.log('✅ Transitioning to quiz step...');
        setCurrentStep('quiz');
        setError('');
      }

      // Invalidate queries after state update
      if (user?.id) {
        setTimeout(() => {
          if (isMountedRef.current && user?.id) {
            queryClient.invalidateQueries({ queryKey: ['teacher-onboarding-profile', user.id] });
          }
        }, 50);
      }

      console.log('=== PROFILE SAVE SUCCESS - COMPLETE ===');
    },
    onError: (error: any) => {
      console.error('=== PROFILE SAVE ERROR ===', error);

      // Show user-friendly error
      const errorMessage = error?.message || 'Failed to save profile';
      setError(`Unable to save profile: ${errorMessage}. Please check your connection and try again.`);

      // Still try to proceed if we have the data client-side
      // This prevents users from getting permanently stuck
      if (profileData) {
        console.log('⚠️ Attempting to proceed with cached profile data');
        toast({
          title: 'Warning',
          description: 'Profile may not be fully saved. You can continue the quiz and we\'ll save your data later.',
          variant: 'destructive',
        });
      }
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      console.log('=== QUIZ SUBMISSION DEBUG START ===');

      if (!user || !quizData) {
        console.error('Missing required data:', { user: !!user, quizData: !!quizData });
        throw new Error('Missing required data');
      }

      console.log('1. Calculating archetype scores from answers:', Object.keys(answers).length, 'answers');

      const archetypeScores: Record<string, number> = {
        leader: 0,
        innovator: 0,
        mentor: 0,
        advocate: 0,
        collaborator: 0,
        specialist: 0
      };

      Object.entries(answers).forEach(([questionId, selectedOptionId]) => {
        const question = quizData.find(q => q.question_id === questionId);
        const selectedOption = question?.options.find(opt => opt.id === selectedOptionId);

        console.log('2. Processing answer:', {
          questionId,
          selectedOptionId,
          hasQuestion: !!question,
          hasOption: !!selectedOption,
          scores: selectedOption?.scores
        });

        if (selectedOption?.scores) {
          Object.entries(selectedOption.scores).forEach(([archetype, score]) => {
            archetypeScores[archetype] = (archetypeScores[archetype] || 0) + Number(score);
          });
        }
      });

      console.log('3. Final archetype scores:', archetypeScores);

      // Sort by score (descending), then by key (ascending) for tiebreaker
      const sortedArchetypes = Object.entries(archetypeScores)
        .sort(([keyA, scoreA], [keyB, scoreB]) => {
          if (scoreB !== scoreA) {
            return scoreB - scoreA; // Higher score first
          }
          return keyA.localeCompare(keyB); // Alphabetical tiebreaker
        });

      const topArchetype = sortedArchetypes[0][0];

      console.log('3b. Sorted archetypes (with tiebreaker):', sortedArchetypes);

      const finalArchetypeName = ARCHETYPE_MAPPING[topArchetype] || topArchetype;
      const completionPayload = getCompletionPayload({ archetype: finalArchetypeName });
      const profileIsComplete = completionPayload ? isProfileComplete(completionPayload) : false;

      console.log('4. Top archetype:', topArchetype, '→ Mapped to:', finalArchetypeName);

      // Create fallback archetype helper (defined early so it's available everywhere)
      const createFallbackArchetype = () => ({
        id: 'fallback',
        user_id: null,
        archetype_name: finalArchetypeName,
        archetype_description: `You are ${finalArchetypeName}, a unique teaching archetype determined by your quiz responses.`,
        strengths: ['Adaptability', 'Student-focused', 'Dedicated'],
        growth_areas: ['Continued professional development', 'Building on strengths'],
        ideal_environments: ['Supportive school culture', 'Collaborative teams'],
        teaching_style: 'Personalized and student-centered'
      });

      // Update teacher profile with quiz results (with AbortController timeout)
      console.log('5. Updating teacher profile with quiz results...');
      const updateController = new AbortController();
      const updateTimeoutId = setTimeout(() => {
        console.warn('5. Update timeout triggered after 8 seconds');
        updateController.abort();
      }, 8000); // 8 second timeout

      try {
        const { error: updateError, data: updateData } = await supabase
          .from('teachers')
          .update({
            quiz_result: answers,
            archetype: finalArchetypeName,
            profile_complete: profileIsComplete
          })
          .eq('user_id', user.id)
          .select()
          .abortSignal(updateController.signal);

        clearTimeout(updateTimeoutId);

        console.log('5b. Teacher update result:', {
          success: !updateError,
          error: updateError,
          data: updateData
        });

        if (updateError) {
          console.error('5c. Failed to update teacher profile:', updateError);
        }
      } catch (updateErr: any) {
        clearTimeout(updateTimeoutId);
        if (updateErr.name === 'AbortError') {
          console.warn('5c. Database update aborted due to timeout - proceeding with fallback');
        } else {
          console.error('5c. Update error:', updateErr);
        }
        // Continue to fetch archetype info or use fallback
      }

      // Fetch archetype information (with AbortController timeout)
      console.log('6. Fetching archetype information for:', finalArchetypeName);
      const fetchController = new AbortController();
      const fetchTimeoutId = setTimeout(() => {
        console.warn('6. Fetch timeout triggered after 5 seconds');
        fetchController.abort();
      }, 5000); // 5 second timeout

      try {
        const { data: archetypeInfo, error: fetchError } = await supabase
          .from('user_archetypes')
          .select('*')
          .eq('archetype_name', finalArchetypeName)
          .maybeSingle();

        clearTimeout(fetchTimeoutId);

        console.log('6b. Archetype fetch result:', {
          success: !!archetypeInfo,
          data: archetypeInfo ? {
            id: archetypeInfo.id,
            archetype_name: archetypeInfo.archetype_name,
            hasDescription: !!archetypeInfo.archetype_description,
            strengthsCount: archetypeInfo.strengths?.length || 0
          } : null,
          error: fetchError
        });

        if (fetchError || !archetypeInfo) {
          console.log('6c. Using fallback archetype due to fetch error or missing data');
          const fallbackArchetype = createFallbackArchetype();
          console.log('=== QUIZ SUBMISSION DEBUG END: SUCCESS (with fallback) ===');
          return fallbackArchetype;
        }

        console.log('=== QUIZ SUBMISSION DEBUG END: SUCCESS ===');
        return archetypeInfo;
      } catch (fetchErr: any) {
        clearTimeout(fetchTimeoutId);
        if (fetchErr.name === 'AbortError') {
          console.warn('6c. Archetype fetch aborted due to timeout - using fallback');
        } else {
          console.error('6c. Fetch error:', fetchErr);
        }
        const fallbackArchetype = createFallbackArchetype();
        console.log('=== QUIZ SUBMISSION DEBUG END: SUCCESS (with fallback due to error) ===');
        return fallbackArchetype;
      }
    },
    onSuccess: (data) => {
      console.log('7. onSuccess called with data:', data?.archetype_name);

      // Guard against updates after unmount
      if (!isMountedRef.current) {
        console.warn('7. Component unmounted, skipping state update');
        return;
      }

      // Set transitioning flag to prevent useEffect from interfering
      isTransitioningRef.current = true;

      setArchetypeData(data);
      setCurrentStep('results');
      setError('');

      // Delay query invalidation to avoid triggering re-renders during transition
      // Use setTimeout to let the state update complete first
      setTimeout(() => {
        if (isMountedRef.current) {
          queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['teacher-onboarding-profile', user.id] });
          }
          // Clear transitioning flag after a short delay
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 100);
        }
      }, 50);

      console.log('7b. State updated - should now show results step');
    },
    onError: (error: any) => {
      console.error('Error submitting quiz:', error);
      setError('Failed to calculate archetype. Please try again.');
    },
  });

  const handleProfileSubmit = useCallback((data: ProfileFormData) => {
    // TEMPORARILY DISABLED - was causing legitimate saves to be blocked
    // The isPending check is too aggressive and blocks the first save attempt
    // if (saveProfileMutation.isPending) {
    //   console.log('[TeacherOnboarding] Save already in progress, ignoring duplicate call');
    //   return;
    // }

    console.log('[TeacherOnboarding] ========================================');
    console.log('[TeacherOnboarding] STARTING PROFILE SAVE');
    console.log('[TeacherOnboarding] Profile data:', data);
    console.log('[TeacherOnboarding] isPending:', saveProfileMutation.isPending);
    console.log('[TeacherOnboarding] ========================================');

    saveProfileMutation.mutate({
      ...data,
      certifications: data.certifications || teacherProfile?.certifications || [],
    });
  }, [saveProfileMutation, teacherProfile?.certifications]);

  const handleQuizComplete = (answers: Record<string, string>) => {
    submitQuizMutation.mutate(answers);
  };

  const handleBackToProfile = () => {
    setCurrentStep('profile');
  };

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');
      const payload = getCompletionPayload();
      if (!payload) throw new Error('Incomplete profile data');

      const { error } = await supabase
        .from('teachers')
        .update({
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          location: payload.location,
          bio: payload.bio,
          years_experience: payload.years_experience,
          subjects: payload.subjects,
          grade_levels: payload.grade_levels,
          archetype: payload.archetype,
          teaching_philosophy: payload.teaching_philosophy,
          certifications: payload.certifications || [],
          profile_complete: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['teacher-onboarding-profile', user.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/teacher-profile', user.id] });
      }
      setLocation('/teacher/dashboard');
    },
    onError: () => {
      setError('Failed to complete onboarding. Please try again.');
    },
  });

  const handleContinueToDashboard = () => {
    // Allow users to proceed even if profile isn't 100% complete
    // Photo and resume can be added later from dashboard
    if (completeOnboardingMutation.isPending) return;

    // If profile is complete, mark it as complete
    // Otherwise, just redirect to dashboard (profile_complete stays false)
    const payload = getCompletionPayload();
    if (payload && isProfileComplete(payload)) {
      completeOnboardingMutation.mutate();
    } else {
      // Still redirect to dashboard, but don't mark as complete
      setLocation('/teacher/dashboard');
    }
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  if (teacherProfileLoading && !teacherProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your onboarding data...</p>
        </div>
      </div>
    );
  }

  const stepProgress = {
    profile: { step: 1, total: 3, label: 'Profile' },
    quiz: { step: 2, total: 3, label: 'Archetype Quiz' },
    results: { step: 3, total: 3, label: 'Results' },
  };

  const currentProgress = stepProgress[currentStep];
  const progressPercentage = (currentProgress.step / currentProgress.total) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-4 sm:py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Progress Indicator - Mobile Optimized */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="font-semibold text-foreground">Step {currentProgress.step} of {currentProgress.total}</span>
            <span className="font-semibold text-primary">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 sm:h-3 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] transition-all duration-500 ease-out rounded-full shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={currentStep === 'profile' ? 'font-semibold text-primary' : ''}>Profile</span>
            <span className={currentStep === 'quiz' ? 'font-semibold text-primary' : ''}>Quiz</span>
            <span className={currentStep === 'results' ? 'font-semibold text-primary' : ''}>Results</span>
          </div>
        </div>

        <div className="text-center space-y-3">
          <div className="flex justify-center mb-6">
            <img
              src={logoUrl}
              alt="PerfectMatchSchools"
              className="h-28 w-auto drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2)) brightness(1.35) contrast(1.55) saturate(2.1)',
                transform: 'scale(1.08)'
              }}
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent" data-testid="text-onboarding-title">
            Welcome to PerfectMatchSchools
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-onboarding-subtitle">
            {currentStep === 'profile' && "Let's create your teaching profile"}
            {currentStep === 'quiz' && "Discover your teaching archetype"}
            {currentStep === 'results' && "Your teaching archetype"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" data-testid="alert-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-medium border-border/50">
          <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl" data-testid="text-step-title">
              {currentStep === 'profile' && 'Step 1: Basic Profile'}
              {currentStep === 'quiz' && 'Step 2: Teaching Archetype Quiz'}
              {currentStep === 'results' && 'Your Teaching Archetype'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2" data-testid="text-step-description">
              {currentStep === 'profile' && 'Tell us about your teaching background and experience'}
              {currentStep === 'quiz' && 'Answer 8 questions to discover your unique teaching style'}
              {currentStep === 'results' && 'Learn about your strengths and ideal teaching environment'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {currentStep === 'profile' && (
              <TeacherProfileStep
                onNext={handleProfileSubmit}
                initialData={profileData ? {
                  ...profileData,
                  bio: profileData.bio ?? undefined,
                  teaching_philosophy: profileData.teaching_philosophy ?? undefined
                } : undefined}
                isLoading={saveProfileMutation.isPending}
              />
            )}

            {currentStep === 'quiz' && (
              <>
                {loadingQuiz && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" data-testid="spinner-loading-quiz" />
                      <p className="text-muted-foreground">Loading quiz questions...</p>
                    </div>
                  </div>
                )}

                {quizError && (
                  <Alert variant="destructive" data-testid="alert-quiz-load-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load quiz questions. Please try again.
                    </AlertDescription>
                  </Alert>
                )}

                {!loadingQuiz && !quizError && quizData && (
                  <ArchetypeQuiz
                    quizData={quizData}
                    onComplete={handleQuizComplete}
                    onBack={handleBackToProfile}
                    loading={submitQuizMutation.isPending}
                  />
                )}
              </>
            )}

            {currentStep === 'results' && archetypeData && (
              <>
                {!onboardingComplete && (
                  <Alert className="mb-6 border-primary/20 bg-primary/5">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          Almost there! Your profile is {(() => {
                            const payload = getCompletionPayload();
                            return payload ? Math.round(calculateProfileCompletion(payload)) : 0;
                          })()}% complete.
                        </p>
                        {incompleteFields.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Complete these fields for better matches:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {incompleteFields.map((field) => (
                                <li key={field} className="flex items-center gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{field}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          You can complete your profile later from the dashboard. Photo and resume are optional.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                <ArchetypeResults
                  archetype={archetypeData}
                  onContinue={handleContinueToDashboard}
                  continueDisabled={completeOnboardingMutation.isPending}
                  continueDisabledMessage={
                    completeOnboardingMutation.isPending
                      ? 'Saving your profile...'
                      : undefined
                  }
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
