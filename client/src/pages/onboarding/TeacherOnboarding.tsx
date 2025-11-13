import { useState } from 'react';
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
import { QuizWithOptions, UserArchetype, InsertTeacher } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import logoUrl from '@assets/New logo-15_1762774603259.png';

type OnboardingStep = 'profile' | 'quiz' | 'results';

const ARCHETYPE_MAPPING: Record<string, string> = {
  mentor: "The Guide",
  innovator: "The Trailblazer",
  advocate: "The Changemaker",
  collaborator: "The Connector",
  specialist: "The Explorer",
  leader: "The Leader"
};

export default function TeacherOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  const [profileData, setProfileData] = useState<any>(null);
  const [archetypeData, setArchetypeData] = useState<UserArchetype | null>(null);
  const [error, setError] = useState('');

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

  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('=== PROFILE SAVE DEBUG START ===');

      try {
        // 1. Check if user is authenticated
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        console.log('1. Auth User:', {
          exists: !!authUser,
          userId: authUser?.id,
          email: authUser?.email,
          error: userError,
          contextUser: user ? { id: user.id, email: user.email } : null
        });

        if (!user) {
          console.error('1. ERROR: No user found in context');
          throw new Error('No user found');
        }

        // 2. First check if user exists in users table (required for foreign key)
        const { data: userRecord, error: userRecordError } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', user.id)
          .maybeSingle();

        console.log('2a. User Record Check (users table):', {
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
          console.log('2b. User record not found, creating it...');
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

          console.log('2b. Create User Result:', {
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
            console.error('Failed to create user record:', createUserError);
            throw new Error(`Failed to create user record: ${createUserError.message}`);
          }
        }

        // 3. Check if teacher record exists
        const { data: existingTeacher, error: checkError } = await supabase
          .from('teachers')
          .select('id, user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('2c. Existing Teacher Record:', {
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
        profile_complete: false,
      };

        console.log('3. Attempting to save with user_id:', user.id);
        console.log('4. Data to save:', {
          ...teacherData,
          subjects: teacherData.subjects,
          grade_levels: teacherData.grade_levels
        });

        // 5. Use UPSERT to handle both insert and update in one operation
        // This avoids race conditions and handles the UNIQUE constraint properly
        console.log('5. Upserting teacher record (insert or update)...');
        const { data: upsertedData, error: upsertError } = await supabase
        .from('teachers')
          .upsert(teacherData, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
        .single();

        console.log('5. Upsert Result:', {
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
          console.log('5b. Upsert failed, trying fallback insert/update...');

      if (existingTeacher) {
            console.log('5b. Fallback: Updating existing teacher record...');
            const { data: updatedData, error: updateError } = await supabase
          .from('teachers')
          .update(teacherData)
              .eq('user_id', user.id)
              .select()
              .single();

            console.log('5b. Fallback Update Result:', {
              success: !!updatedData,
              data: updatedData,
              error: updateError
            });

            if (updateError) throw updateError;
      } else {
            console.log('5b. Fallback: Inserting new teacher record...');
            const { data: insertedData, error: insertError } = await supabase
              .from('teachers')
              .insert(teacherData)
              .select()
              .single();

            console.log('5b. Fallback Insert Result:', {
              success: !!insertedData,
              data: insertedData,
              error: insertError
            });

            if (insertError) throw insertError;
          }
        }

        // 6. Verify the save worked - FINAL DATABASE CHECK
        const { data: verifyTeacher, error: verifyError } = await supabase
          .from('teachers')
          .select('id, user_id, full_name, email, phone, location, subjects, grade_levels, profile_complete, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('6. Final Database Verification:', {
          exists: !!verifyTeacher,
          data: verifyTeacher,
          error: verifyError,
          profileComplete: verifyTeacher?.profile_complete,
          hasSubjects: (verifyTeacher?.subjects?.length || 0) > 0,
          hasGradeLevels: (verifyTeacher?.grade_levels?.length || 0) > 0
        });

        if (!verifyTeacher) {
          throw new Error('CRITICAL: Profile save verification failed - record not found in database after save operation');
      }

        console.log('✅ PROFILE CONFIRMED SAVED TO DATABASE');
        console.log('✅ Saved Data:', {
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

        console.log('=== PROFILE SAVE DEBUG END: SUCCESS ===');
      return teacherData;

      } catch (error: any) {
        console.error('=== PROFILE SAVE DEBUG END: FAILED ===');
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error,
          stack: error.stack
        });
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Verify the save actually worked
      console.log('=== PROFILE SAVE SUCCESS - VERIFYING ===');
      
      if (user?.id) {
        // Import verification function
        const { verifyProfileSave } = await import('@/utils/verifyProfileSave');
        const verification = await verifyProfileSave(user.id, {
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          location: data.location
        });

        if (verification.success) {
          console.log('✅ Profile verified and saved successfully!');
          setProfileData(data);
          setCurrentStep('quiz');
          setError('');
        } else {
          console.error('❌ Profile save verification failed:', verification.errors);
          setError(`Profile saved but verification failed: ${verification.errors.join(', ')}`);
          // Still proceed to quiz, but log the issue
          setProfileData(data);
          setCurrentStep('quiz');
        }
      } else {
        // Fallback if no user
      setProfileData(data);
      setCurrentStep('quiz');
      setError('');
      }
    },
    onError: (error: any) => {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
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

      console.log('4. Top archetype:', topArchetype, '→ Mapped to:', finalArchetypeName);

      // Update teacher profile with quiz results
      console.log('5. Updating teacher profile with quiz results...');
      const { error: updateError, data: updateData } = await supabase
        .from('teachers')
        .update({
          quiz_result: answers,
          archetype: finalArchetypeName,
          profile_complete: true
        })
        .eq('user_id', user.id)
        .select();

      console.log('5. Teacher update result:', {
        success: !updateError,
        error: updateError,
        data: updateData
      });

      if (updateError) {
        console.error('Failed to update teacher profile:', updateError);
        throw updateError;
      }

      // Fetch archetype information
      console.log('6. Fetching archetype information for:', finalArchetypeName);
      const { data: archetypeInfo, error: fetchError } = await supabase
        .from('user_archetypes')
        .select('*')
        .eq('archetype_name', finalArchetypeName)
        .maybeSingle();

      console.log('6. Archetype fetch result:', {
        success: !!archetypeInfo,
        data: archetypeInfo ? {
          id: archetypeInfo.id,
          archetype_name: archetypeInfo.archetype_name,
          hasDescription: !!archetypeInfo.archetype_description,
          strengthsCount: archetypeInfo.strengths?.length || 0
        } : null,
        error: fetchError
      });

      if (fetchError) {
        console.error('Failed to fetch archetype info:', fetchError);
        // If table doesn't exist or query fails, create a fallback response
        console.log('6b. Creating fallback archetype info...');
        const fallbackArchetype = {
          id: 'fallback',
          user_id: null,
          archetype_name: finalArchetypeName,
          archetype_description: `You are ${finalArchetypeName}, a unique teaching archetype determined by your quiz responses.`,
          strengths: ['Adaptability', 'Student-focused', 'Dedicated'],
          growth_areas: ['Continued professional development', 'Building on strengths'],
          ideal_environments: ['Supportive school culture', 'Collaborative teams'],
          teaching_style: 'Personalized and student-centered'
        };
        console.log('6b. Using fallback archetype:', fallbackArchetype);
        console.log('=== QUIZ SUBMISSION DEBUG END: SUCCESS (with fallback) ===');
        return fallbackArchetype;
      }

      if (!archetypeInfo) {
        console.warn('Archetype not found in database, using fallback');
        const fallbackArchetype = {
          id: 'fallback',
          user_id: null,
          archetype_name: finalArchetypeName,
          archetype_description: `You are ${finalArchetypeName}, a unique teaching archetype determined by your quiz responses.`,
          strengths: ['Adaptability', 'Student-focused', 'Dedicated'],
          growth_areas: ['Continued professional development', 'Building on strengths'],
          ideal_environments: ['Supportive school culture', 'Collaborative teams'],
          teaching_style: 'Personalized and student-centered'
        };
        console.log('=== QUIZ SUBMISSION DEBUG END: SUCCESS (with fallback) ===');
        return fallbackArchetype;
      }

      console.log('=== QUIZ SUBMISSION DEBUG END: SUCCESS ===');
      return archetypeInfo;
    },
    onSuccess: (data) => {
      setArchetypeData(data);
      setCurrentStep('results');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
    },
    onError: (error: any) => {
      console.error('Error submitting quiz:', error);
      setError('Failed to calculate archetype. Please try again.');
    },
  });

  const handleProfileSubmit = (data: any) => {
    saveProfileMutation.mutate(data);
  };

  const handleQuizComplete = (answers: Record<string, string>) => {
    submitQuizMutation.mutate(answers);
  };

  const handleBackToProfile = () => {
    setCurrentStep('profile');
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-step-title">
              {currentStep === 'profile' && 'Step 1: Basic Profile'}
              {currentStep === 'quiz' && 'Step 2: Teaching Archetype Quiz'}
              {currentStep === 'results' && 'Your Teaching Archetype'}
            </CardTitle>
            <CardDescription data-testid="text-step-description">
              {currentStep === 'profile' && 'Tell us about your teaching background and experience'}
              {currentStep === 'quiz' && 'Answer 8 questions to discover your unique teaching style'}
              {currentStep === 'results' && 'Learn about your strengths and ideal teaching environment'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 'profile' && (
              <TeacherProfileStep
                onNext={handleProfileSubmit}
                initialData={profileData}
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
              <ArchetypeResults archetype={archetypeData} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
