import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { calculateProfileCompletion, getMissingFields } from '@/lib/profileUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import type { ReactNode } from 'react';

interface ProfileCompletionGateProps {
  children: ReactNode;
  requiredCompletion?: number; // Default 100
  showWarningAt?: number; // Show warning below this %
}

export function ProfileCompletionGate({
  children,
  requiredCompletion = 100,
}: ProfileCompletionGateProps) {
  const { user, role } = useAuth();

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && role === 'teacher',
  });

  if (role !== 'teacher') {
    // Only gate teacher experiences
    return <>{children}</>;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading your profile...</div>;
  }

  if (!teacher) {
    return <>{children}</>;
  }

  const completionPercentage = calculateProfileCompletion(teacher);
  const missingFields = getMissingFields(teacher);
  const isComplete = completionPercentage >= requiredCompletion;

  // If profile is complete, show content
  if (isComplete) {
    return <>{children}</>;
  }

  // Profile is incomplete - show gate
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <Card className="p-8">
        <div className="text-center mb-8">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Complete Your Profile First</h1>
          <p className="text-muted-foreground">
            To access jobs and get matched with schools, you need to complete your teacher profile.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm font-bold">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Information</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Please complete these fields:</p>
            <ul className="list-disc list-inside space-y-1">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex justify-center gap-4">
          <Link href="/profile">
            <Button size="lg" className="gap-2">
              Complete Profile <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold mb-3">Why complete your profile?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Get matched with schools that align with your teaching style</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Receive personalized job recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Stand out to potential employers</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Access exclusive features and opportunities</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}


