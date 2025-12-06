import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import type { Teacher } from '@shared/schema';

interface ArchetypeBadgeProps {
  teacher: Teacher;
  showAnimation?: boolean;
}

const ARCHETYPE_COLORS: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  'The Guide': {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  'The Trailblazer': {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  'The Changemaker': {
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
  },
  'The Connector': {
    bg: 'bg-pink-50 dark:bg-pink-950/20',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
  },
  'The Explorer': {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  'The Leader': {
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
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
    <Card className={`${colors.bg} ${colors.border} border overflow-hidden`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          Your Teaching Archetype
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
      <div className="flex items-center gap-3">
          <div className={`p-2.5 ${colors.iconBg} rounded-lg`}>
            <Award className={`h-5 w-5 ${colors.text}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
              {teacher.archetype}
            </h3>
          {teacher.archetype_tags && teacher.archetype_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
              {teacher.archetype_tags.slice(0, 3).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className={`text-xs rounded-md ${colors.iconBg} ${colors.text} border-0`}
                  >
                  {tag}
                </Badge>
              ))}
              {teacher.archetype_tags.length > 3 && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs rounded-md ${colors.iconBg} ${colors.text} border-0`}
                  >
                    +{teacher.archetype_tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
