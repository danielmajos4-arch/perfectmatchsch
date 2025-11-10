import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, GraduationCap } from 'lucide-react';
import { TeacherProfileStep } from '@/components/onboarding/TeacherProfileStep';
import { ArchetypeQuiz } from '@/components/onboarding/ArchetypeQuiz';
import { ArchetypeResults } from '@/components/onboarding/ArchetypeResults';
import { supabase } from '@/lib/supabaseClient';
import { QuizWithOptions, UserArchetype, InsertTeacher } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

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
      const { data, error } = await supabase
        .from('quiz_with_options')
        .select('*')
        .order('question_order');

      if (error) throw error;

      const groupedQuestions = data.reduce((acc: any[], row: any) => {
        const existingQuestion = acc.find(q => q.question_id === row.question_id);
        
        const option = {
          id: row.option_id,
          question_id: row.question_id,
          text: row.option_text,
          scores: row.scores
        };

        if (existingQuestion) {
          existingQuestion.options.push(option);
        } else {
          acc.push({
            question_id: row.question_id,
            question: row.question,
            question_order: row.question_order,
            options: [option]
          });
        }

        return acc;
      }, []);

      return groupedQuestions.sort((a, b) => a.question_order - b.question_order);
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error('No user found');

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

      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingTeacher) {
        const { error } = await supabase
          .from('teachers')
          .update(teacherData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teachers')
          .insert([teacherData]);

        if (error) throw error;
      }

      return teacherData;
    },
    onSuccess: (data) => {
      setProfileData(data);
      setCurrentStep('quiz');
      setError('');
    },
    onError: (error: any) => {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      if (!user || !quizData) throw new Error('Missing required data');

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

        if (selectedOption?.scores) {
          Object.entries(selectedOption.scores).forEach(([archetype, score]) => {
            archetypeScores[archetype] = (archetypeScores[archetype] || 0) + Number(score);
          });
        }
      });

      const topArchetype = Object.entries(archetypeScores)
        .sort(([, a], [, b]) => b - a)[0][0];

      const finalArchetypeName = ARCHETYPE_MAPPING[topArchetype] || topArchetype;

      const { error: updateError } = await supabase
        .from('teachers')
        .update({
          quiz_result: answers,
          archetype: finalArchetypeName,
          profile_complete: true
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const { data: archetypeInfo, error: fetchError } = await supabase
        .from('user_archetypes')
        .select('*')
        .eq('archetype_name', finalArchetypeName)
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

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
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="h-8 w-8 text-primary" data-testid="icon-graduation-cap" />
            </div>
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-onboarding-title">
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
