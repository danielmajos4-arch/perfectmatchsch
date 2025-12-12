import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAnalyticsOverview, getTimeToHireMetrics, getConversionMetrics } from '@/lib/analyticsService';
import { Briefcase, Users, Clock, TrendingUp, CheckCircle } from 'lucide-react';

interface SchoolAnalyticsDashboardProps {
    schoolId: string;
}

export function SchoolAnalyticsDashboard({ schoolId }: SchoolAnalyticsDashboardProps) {
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['analytics-overview', schoolId],
        queryFn: () => getAnalyticsOverview(schoolId),
    });

    const { data: timeToHire, isLoading: timeLoading } = useQuery({
        queryKey: ['time-to-hire', schoolId],
        queryFn: () => getTimeToHireMetrics(schoolId),
    });

    const { data: conversion, isLoading: conversionLoading } = useQuery({
        queryKey: ['conversion-metrics', schoolId],
        queryFn: () => getConversionMetrics(schoolId),
    });

    if (overviewLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                <Card className="p-3 sm:p-4 md:p-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Jobs</CardTitle>
                        <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold">{overview?.totalJobs || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {overview?.activeJobs || 0} active
                        </p>
                    </CardContent>
                </Card>

                <Card className="p-3 sm:p-4 md:p-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Applications</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold">{overview?.totalApplications || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Total received
                        </p>
                    </CardContent>
                </Card>

                <Card className="p-3 sm:p-4 md:p-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Avg Time to Hire</CardTitle>
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold">{overview?.avgTimeToHire || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Days on average
                        </p>
                    </CardContent>
                </Card>

                <Card className="p-3 sm:p-4 md:p-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Offer Acceptance</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold">{overview?.offerAcceptanceRate || 0}%</div>
                        <p className="text-xs text-muted-foreground">
                            Acceptance rate
                        </p>
                    </CardContent>
                </Card>

                <Card className="p-3 sm:p-4 md:p-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                        <CardTitle className="text-xs sm:text-sm font-medium">Conversion Rate</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="p-0 pt-2">
                        <div className="text-xl sm:text-2xl font-bold">
                            {conversion?.conversionRate.overallConversion.toFixed(1) || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            App to hire
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Time to Hire Chart */}
            <Card>
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg">Time to Hire by Position</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                    {timeLoading ? (
                        <Skeleton className="h-48 sm:h-64" />
                    ) : timeToHire && timeToHire.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                            {timeToHire.slice(0, 10).map((metric) => (
                                <div key={metric.jobId} className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-4">
                                    <div className="flex-1 min-w-0 w-full xs:w-auto">
                                        <p className="font-medium text-sm sm:text-base truncate">{metric.jobTitle}</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Posted {new Date(metric.postedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full xs:w-auto">
                                        <div className="flex-1 xs:w-32 bg-muted rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full"
                                                style={{ width: `${Math.min((metric.daysToHire / 90) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium w-16 text-right flex-shrink-0">
                                            {metric.daysToHire} days
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 sm:py-12 text-muted-foreground">
                            <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                            <p className="text-sm sm:text-base">No hiring data available yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg">Hiring Funnel</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                    {conversionLoading ? (
                        <Skeleton className="h-48 sm:h-64" />
                    ) : conversion ? (
                        <div className="space-y-3 sm:space-y-4">
                            <div className="space-y-1.5 sm:space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs sm:text-sm font-medium">Applications</span>
                                    <span className="text-xs sm:text-sm font-bold">{conversion.totalApplications}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-6 sm:h-8">
                                    <div className="bg-blue-500 h-6 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium" style={{ width: '100%' }}>
                                        100%
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 sm:space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs sm:text-sm font-medium">Interviewed</span>
                                    <span className="text-xs sm:text-sm font-bold">{conversion.interviewed}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-6 sm:h-8">
                                    <div className="bg-green-500 h-6 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium" style={{ width: `${conversion.conversionRate.applicationToInterview}%` }}>
                                        {conversion.conversionRate.applicationToInterview.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 sm:space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs sm:text-sm font-medium">Offers Extended</span>
                                    <span className="text-xs sm:text-sm font-bold">{conversion.offersExtended}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-6 sm:h-8">
                                    <div className="bg-yellow-500 h-6 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium" style={{ width: `${conversion.conversionRate.interviewToOffer}%` }}>
                                        {conversion.conversionRate.interviewToOffer.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 sm:space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs sm:text-sm font-medium">Offers Accepted</span>
                                    <span className="text-xs sm:text-sm font-bold">{conversion.offersAccepted}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-6 sm:h-8">
                                    <div className="bg-purple-500 h-6 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium" style={{ width: `${conversion.conversionRate.offerToAcceptance}%` }}>
                                        {conversion.conversionRate.offerToAcceptance.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 sm:py-12 text-muted-foreground">
                            <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                            <p className="text-sm sm:text-base">No conversion data available yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
