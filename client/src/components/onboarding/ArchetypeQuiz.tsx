import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { QuizWithOptions, QuizOption } from '@shared/schema';

interface ArchetypeQuizProps {
  quizData: QuizWithOptions[];
  onComplete: (answers: Record<string, string>) => void;
  onBack: () => void;
  loading?: boolean;
}

export function ArchetypeQuiz({ quizData, onComplete, onBack, loading }: ArchetypeQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const totalQuestions = quizData.length;
  const currentQuestion = quizData[currentQuestionIndex];
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const canGoNext = answers[currentQuestion?.question_id];
  
  if (totalQuestions === 0) {
    return (
      <Alert variant="destructive" data-testid="alert-no-questions">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No quiz questions available. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  const handleNext = () => {
    if (!canGoNext) {
      setError('Please select an answer before continuing');
      return;
    }
    setError('');
    
    if (isLastQuestion) {
      onComplete(answers);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setError('');
    } else {
      onBack();
    }
  };

  const handleAnswerSelect = (optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.question_id]: optionId
    }));
    setError('');
  };

  if (!currentQuestion) {
    return (
      <Alert variant="destructive" data-testid="alert-quiz-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load quiz questions. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span data-testid="text-question-number">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span data-testid="text-progress-percentage">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} data-testid="progress-quiz" />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <h2 className="text-xl font-semibold" data-testid={`text-question-${currentQuestionIndex + 1}`}>
            {currentQuestion.question}
          </h2>

          <RadioGroup
            value={answers[currentQuestion.question_id] || ''}
            onValueChange={handleAnswerSelect}
            className="space-y-3"
          >
            {currentQuestion.options.map((option: QuizOption, index: number) => (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  answers[currentQuestion.question_id] === option.id
                    ? 'border-primary bg-primary/5'
                    : ''
                }`}
                onClick={() => handleAnswerSelect(option.id)}
              >
                <CardContent className="flex items-start space-x-3 p-4">
                  <RadioGroupItem
                    value={option.id}
                    id={option.id}
                    data-testid={`radio-option-${index + 1}`}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer font-normal text-base"
                  >
                    {option.text}
                  </Label>
                </CardContent>
              </Card>
            ))}
          </RadioGroup>

          {error && (
            <Alert variant="destructive" data-testid="alert-answer-required">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          data-testid="button-previous"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentQuestionIndex === 0 ? 'Back to Profile' : 'Previous'}
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext || loading}
          data-testid="button-next-quiz"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Calculating...
            </>
          ) : isLastQuestion ? (
            'Submit Quiz'
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
