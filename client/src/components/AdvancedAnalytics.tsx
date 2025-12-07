import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
// Charts can be added later with recharts if needed
import { TrendingUp, Users, Clock, Target, Award } from 'lucide-react';
import { 
  getApplicationFunnel, 
  getTimeToHireMetrics, 
  getTeacherSuccessMetrics,
  getProfileStrength,
  type ApplicationFunnel 
} from '@/lib/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';

interface AdvancedAnalyticsProps {
  schoolId?: string;
  teacherId?: string;
}

export function AdvancedAnalytics({ schoolId, teacherId }: AdvancedAnalyticsProps) {
  // School Analytics
  const { data: funnel, isLoading: funnelLoading } = useQuery<ApplicationFunnel>({
    queryKey: ['/api/application-funnel', schoolId],
    queryFn: () => getApplicationFunnel(schoolId!),
    enabled: !!schoolId,
  });

  const { data: timeToHire, isLoading: timeToHireLoading } = useQuery({
    queryKey: ['/api/time-to-hire', schoolId],
    queryFn: () => getTimeToHireMetrics(schoolId!),
    enabled: !!schoolId,
  });

  // Teacher Analytics
  const { data: successMetrics, isLoading: successLoading } = useQuery({
    queryKey: ['/api/teacher-success-metrics', teacherId],
    queryFn: () => getTeacherSuccessMetrics(teacherId!),
    enabled: !!teacherId,
  });

  const { data: profileStrength, isLoading: strengthLoading } = useQuery({
    queryKey: ['/api/profile-strength', teacherId],
    queryFn: () => getProfileStrength(teacherId!),
    enabled: !!teacherId,
  });

  if (schoolId) {
    return (
      <div className="space-y-6">
        {/* Application Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Application Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <Skeleton className="h-64" />
            ) : funnel ? (
              <div className="space-y-6">
                {/* Funnel Visualization */}
                <div className="space-y-3">
                  {[
                    { label: 'Total Applications', value: funnel.totalApplications, color: 'bg-blue-500' },
                    { label: 'Under Review', value: funnel.underReview, color: 'bg-yellow-500' },
                    { label: 'Interviews Scheduled', value: funnel.interviewsScheduled, color: 'bg-purple-500' },
                    { label: 'Offers Made', value: funnel.offersMade, color: 'bg-green-500' },
                    { label: 'Offers Accepted', value: funnel.offersAccepted, color: 'bg-emerald-500' },
                  ].map((stage, index) => {
                    const percentage = funnel.totalApplications > 0
                      ? (stage.value / funnel.totalApplications) * 100
                      : 0;
                    return (
                      <div key={stage.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{stage.label}</span>
                          <span className="font-medium">{stage.value}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`${stage.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Conversion Rates */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Review → Interview</p>
                    <p className="text-lg font-bold">{funnel.conversionRates.reviewToInterview.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Interview → Offer</p>
                    <p className="text-lg font-bold">{funnel.conversionRates.interviewToOffer.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Offer → Acceptance</p>
                    <p className="text-lg font-bold">{funnel.conversionRates.offerToAcceptance.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Overall Conversion</p>
                    <p className="text-lg font-bold">{funnel.conversionRates.overallConversion.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Time to Hire */}
        {timeToHireLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        ) : timeToHire && timeToHire.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time to Hire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeToHire.map((metric) => (
                  <div key={metric.jobId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{metric.jobTitle}</p>
                      <p className="text-sm text-muted-foreground">{metric.daysToHire} days</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Average Time to Hire</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      timeToHire.reduce((sum, m) => sum + m.daysToHire, 0) / timeToHire.length
                    )} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  if (teacherId) {
    return (
      <div className="space-y-6">
        {/* Success Metrics */}
        {successLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        ) : successMetrics ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Application Success Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Applications</p>
                  <p className="text-2xl font-bold">{successMetrics.totalApplications}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Under Review</p>
                  <p className="text-2xl font-bold">{successMetrics.underReview}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Interviews</p>
                  <p className="text-2xl font-bold">{successMetrics.interviewsScheduled}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Offers Received</p>
                  <p className="text-2xl font-bold">{successMetrics.offersReceived}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className="text-3xl font-bold text-primary">{successMetrics.successRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  <p className="text-3xl font-bold">{successMetrics.averageResponseTime} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Profile Strength */}
        {strengthLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        ) : profileStrength ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Profile Strength
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Score</span>
                    <span className="text-2xl font-bold">{profileStrength.score}/100</span>
                  </div>
                  <Progress value={profileStrength.score} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Basic Info</p>
                    <p className="text-lg font-bold">{profileStrength.breakdown.basicInfo}/25</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Experience</p>
                    <p className="text-lg font-bold">{profileStrength.breakdown.experience}/30</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Portfolio</p>
                    <p className="text-lg font-bold">{profileStrength.breakdown.portfolio}/25</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Engagement</p>
                    <p className="text-lg font-bold">{profileStrength.breakdown.engagement}/20</p>
                  </div>
                </div>
                {profileStrength.recommendations.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Recommendations:</p>
                    <ul className="space-y-1">
                      {profileStrength.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span>•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return null;
}
