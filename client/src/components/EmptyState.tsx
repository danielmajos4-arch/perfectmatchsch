/**
 * Empty State Component
 * 
 * Beautiful, consistent empty states throughout the app
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  Search,
  Briefcase,
  FileText,
  Users,
  MessageCircle,
  Heart,
  Star,
  AlertCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

const iconMap = {
  inbox: Inbox,
  search: Search,
  briefcase: Briefcase,
  file: FileText,
  users: Users,
  message: MessageCircle,
  heart: Heart,
  star: Star,
  alert: AlertCircle,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon as keyof typeof iconMap] : null;
  const IconElement = IconComponent ? <IconComponent className="h-12 w-12" /> : icon;

  return (
    <Card className={cn("p-8 md:p-12 text-center", className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        {IconElement && (
          <div className="p-4 rounded-full bg-muted/50 text-muted-foreground animate-in zoom-in-50 duration-500">
            {IconElement}
          </div>
        )}
        <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        </div>
        {action && (
          <div className="pt-2 animate-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
            {action.href ? (
              <Link href={action.href}>
                <Button className="scale-on-hover">
                  {action.label}
                </Button>
              </Link>
            ) : action.onClick ? (
              <Button onClick={action.onClick} className="scale-on-hover">
                {action.label}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

