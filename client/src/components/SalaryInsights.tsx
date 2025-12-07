import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Info } from 'lucide-react';
import { getSalaryInsights } from '@/lib/salaryService';
import { Skeleton } from '@/components/ui/skeleton';
import type { Teacher } from '@shared/schema';

interface SalaryInsightsProps {
  teacher: Teacher;
}

export function SalaryInsights({ teacher }: SalaryInsightsProps) {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['/api/salary-insights', teacher.id],
    queryFn: () => {
      // Get insights for primary subject and grade level
      const primarySubject = teacher.subjects?.[0] || 'Other';
      const primaryGrade = teacher.grade_levels?.[0] || 'K-12';
      
      return getSalaryInsights({
        subject: primarySubject,
        gradeLevel: primaryGrade,
        location: teacher.location,
        yearsExperience: teacher.years_experience,
      });
    },
    enabled: !!teacher.subjects && teacher.subjects.length > 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Salary data not available for your profile yet. Check back soon!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Salary Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground mb-2">Teachers with your experience earn:</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(insights.salaryMin)}
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(insights.salaryMax)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Median: {formatCurrency(insights.salaryMedian)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Minimum</p>
            <p className="text-lg font-semibold">{formatCurrency(insights.salaryMin)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Median</p>
            <p className="text-lg font-semibold">{formatCurrency(insights.salaryMedian)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Maximum</p>
            <p className="text-lg font-semibold">{formatCurrency(insights.salaryMax)}</p>
          </div>
        </div>

        {insights.sampleSize > 0 && (
          <div className="pt-2">
            <Badge variant="secondary" className="text-xs">
              Based on {insights.sampleSize} salary data point{insights.sampleSize !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Use this data to negotiate fair compensation. Consider your experience, certifications, and the school's location when evaluating offers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
