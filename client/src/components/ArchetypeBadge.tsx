import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Sparkles } from 'lucide-react';
import type { Teacher } from '@shared/schema';

interface ArchetypeBadgeProps {
  teacher: Teacher;
  showAnimation?: boolean;
}

const ARCHETYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'The Guide': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  'The Trailblazer': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
  },
  'The Changemaker': {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
  },
  'The Connector': {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500/20',
  },
  'The Explorer': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20',
  },
  'The Leader': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/20',
  },
};

const ARCHETYPE_ICONS: Record<string, string> = {
  'The Guide': '🧭',
  'The Trailblazer': '🚀',
  'The Changemaker': '💡',
  'The Connector': '🤝',
  'The Explorer': '🔍',
  'The Leader': '👑',
};

export function ArchetypeBadge({ teacher, showAnimation = false }: ArchetypeBadgeProps) {
  if (!teacher.archetype) return null;

  const colors = ARCHETYPE_COLORS[teacher.archetype] || ARCHETYPE_COLORS['The Guide'];
  const icon = ARCHETYPE_ICONS[teacher.archetype] || '⭐';

  return (
    <Card className={`p-4 ${colors.bg} ${colors.border} border-2 ${showAnimation ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 ${colors.bg} rounded-lg`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">Your Teaching Archetype</p>
          <div className="flex items-center gap-2">
            <p className={`font-bold text-lg ${colors.text}`}>{teacher.archetype}</p>
            {showAnimation && (
              <Sparkles className={`h-4 w-4 ${colors.text} animate-spin`} />
            )}
          </div>
          {teacher.archetype_tags && teacher.archetype_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {teacher.archetype_tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs rounded-full">
                  {tag}
                </Badge>
              ))}
              {teacher.archetype_tags.length > 3 && (
                <Badge variant="secondary" className="text-xs rounded-full">
                  +{teacher.archetype_tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
        <Award className={`h-6 w-6 ${colors.text}`} />
      </div>
    </Card>
  );
}

