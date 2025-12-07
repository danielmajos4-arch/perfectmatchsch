import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { ApplicationDetailModal } from '@/components/ApplicationDetailModal';
import { EmptyState } from '@/components/EmptyState';
import { Search, Filter, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getTeacherApplications, getApplicationsByStatus, searchApplications } from '@/lib/applicationService';
import type { Application, Job } from '@shared/schema';

type ApplicationWithJob = Application & { job: Job };

export default function MyApplications() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);

  const { data: allApplications, isLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ['/api/applications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getTeacherApplications(user.id);
    },
    enabled: !!user?.id,
  });

  // Filter applications
  const filteredApplications = allApplications?.filter((app) => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (searchQuery && !app.job?.school_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  const statusCounts = {
    all: allApplications?.length || 0,
    pending: allApplications?.filter(a => a.status === 'pending').length || 0,
    under_review: allApplications?.filter(a => a.status === 'under_review').length || 0,
    interview_scheduled: allApplications?.filter(a => a.status === 'interview_scheduled').length || 0,
    offer_made: allApplications?.filter(a => a.status === 'offer_made').length || 0,
    rejected: allApplications?.filter(a => a.status === 'rejected').length || 0,
    withdrawn: allApplications?.filter(a => a.status === 'withdrawn').length || 0,
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Applications</h1>
            <p className="text-muted-foreground">Track and manage all your job applications</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by school name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                    <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                    <SelectItem value="under_review">Under Review ({statusCounts.under_review})</SelectItem>
                    <SelectItem value="interview_scheduled">Interview Scheduled ({statusCounts.interview_scheduled})</SelectItem>
                    <SelectItem value="offer_made">Offer Made ({statusCounts.offer_made})</SelectItem>
                    <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn ({statusCounts.withdrawn})</SelectItem>
                  </SelectContent>
                </Select>
                <Link href="/jobs">
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Browse Jobs
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Applications List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredApplications.length > 0 ? (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <div
                  key={application.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedApplication(application)}
                >
                  <ApplicationTimeline application={application} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="file"
              title={searchQuery || statusFilter !== 'all' ? "No applications found" : "No applications yet"}
              description={
                searchQuery || statusFilter !== 'all'
                  ? "Try adjusting your search or filter criteria"
                  : "Start applying to teaching positions! Your applications will appear here with status updates and next steps."
              }
              action={{
                label: "Browse Jobs",
                href: "/jobs"
              }}
            />
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          open={!!selectedApplication}
          onOpenChange={(open) => !open && setSelectedApplication(null)}
        />
      )}
    </AuthenticatedLayout>
  );
}
