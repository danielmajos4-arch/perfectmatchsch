import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, TrendingUp, School } from 'lucide-react';
import { UserArchetype } from '@shared/schema';
import { useLocation } from 'wouter';

interface ArchetypeResultsProps {
  archetype: UserArchetype;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueDisabledMessage?: string;
}

export function ArchetypeResults({
  archetype,
  onContinue,
  continueDisabled = false,
  continueDisabledMessage,
}: ArchetypeResultsProps) {
  const [, setLocation] = useLocation();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (continueDisabled) {
      return;
    }

    if (onContinue) {
      onContinue();
    } else {
      setLocation('/teacher/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      {showConfetti && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 animate-bounce">
            <Sparkles className="h-10 w-10 text-primary" data-testid="icon-sparkles" />
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-archetype-name">
          {archetype.archetype_name}
        </h1>
        <p className="text-lg text-muted-foreground" data-testid="text-archetype-description">
          {archetype.archetype_description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Your Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {archetype.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2" data-testid={`text-strength-${index}`}>
                <Badge variant="secondary" className="mt-0.5">✓</Badge>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Growth Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {archetype.growth_areas.map((area, index) => (
              <li key={index} className="flex items-start gap-2" data-testid={`text-growth-${index}`}>
                <Badge variant="outline" className="mt-0.5">→</Badge>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            Ideal Environments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {archetype.ideal_environments.map((environment, index) => (
              <li key={index} className="flex items-start gap-2" data-testid={`text-environment-${index}`}>
                <Badge variant="secondary" className="mt-0.5">★</Badge>
                <span>{environment}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Your Teaching Style</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground" data-testid="text-teaching-style">
            {archetype.teaching_style}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleContinue}
          data-testid="button-continue-dashboard"
          className="px-8"
          disabled={continueDisabled}
        >
          Continue to Dashboard
        </Button>
      </div>
      {continueDisabled && continueDisabledMessage && (
        <p className="text-center text-sm text-destructive" data-testid="text-onboarding-incomplete">
          {continueDisabledMessage}
        </p>
      )}
    </div>
  );
}
