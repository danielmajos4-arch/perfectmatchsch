import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { calculateProfileCompletion } from '@/lib/profileUtils';

export function ProfileCompletionBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { user, role } = useAuth();

  const { data: teacher } = useQuery({
    queryKey: ['banner-teacher-profile', user?.id],
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

  if (!teacher || dismissed || role !== 'teacher') {
    return null;
  }

  const completionPercentage = calculateProfileCompletion(teacher);

  if (completionPercentage === 100) {
    return null;
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          Your profile is {completionPercentage}% complete. Complete it to access jobs and get matched with schools.
        </span>
        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Button size="sm" variant="default">
              Complete Profile
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}


