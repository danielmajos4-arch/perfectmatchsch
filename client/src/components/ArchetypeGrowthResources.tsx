import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Target, Lightbulb, Users, ExternalLink, TrendingUp } from 'lucide-react';
import type { Teacher } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface ArchetypeGrowthResourcesProps {
  teacher: Teacher;
}

interface GrowthResource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'course' | 'community' | 'tool';
  link?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ArchetypeGrowthResources({ teacher }: ArchetypeGrowthResourcesProps) {
  const { data: archetypeInfo } = useQuery({
    queryKey: ['/api/archetype-info', teacher.archetype],
    queryFn: async () => {
      if (!teacher.archetype) return null;
      const { data, error } = await supabase
        .from('user_archetypes')
        .select('*')
        .eq('archetype_name', teacher.archetype)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!teacher.archetype,
    staleTime: 1000 * 60 * 30, // 30 minutes (archetype info rarely changes)
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  const resources: GrowthResource[] = [
    {
      id: 'strengths',
      title: 'Leverage Your Strengths',
      description: archetypeInfo?.strengths?.join(', ') || 'Focus on your unique teaching strengths',
      type: 'article',
      icon: Target,
    },
    {
      id: 'growth',
      title: 'Growth Areas',
      description: archetypeInfo?.growth_areas?.join(', ') || 'Areas to develop further',
      type: 'course',
      icon: TrendingUp,
    },
    {
      id: 'environments',
      title: 'Ideal Environments',
      description: archetypeInfo?.ideal_environments?.join(', ') || 'Find schools that match your style',
      type: 'tool',
      icon: Lightbulb,
    },
    {
      id: 'community',
      title: 'Connect with Peers',
      description: `Join other ${teacher.archetype || 'teachers'} in our community`,
      type: 'community',
      icon: Users,
    },
  ];

  if (!teacher.archetype) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Growth Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Complete the archetype quiz to unlock personalized growth resources.
          </p>
          <Button className="mt-4" asChild>
            <a href="/onboarding/teacher">Take Quiz</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Growth Resources for {teacher.archetype}
          </CardTitle>
          <Badge variant="secondary" className="rounded-full">
            Personalized
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <div
              key={resource.id}
              className="p-4 border border-border rounded-lg hover-elevate transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground mb-1 break-words">{resource.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 break-words">{resource.description}</p>
                  {resource.link && (
                    <Button variant="outline" size="sm" className="gap-1" asChild>
                      <a href={resource.link} target="_blank" rel="noopener noreferrer">
                        Learn More
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {archetypeInfo?.teaching_style && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold text-foreground mb-2 break-words">Your Teaching Style</h4>
            <p className="text-sm text-muted-foreground break-words">{archetypeInfo.teaching_style}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

