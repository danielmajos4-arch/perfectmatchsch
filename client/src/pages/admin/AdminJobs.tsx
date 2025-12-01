/**
 * Admin Jobs Management Page
 * 
 * View and manage all job postings on the platform
 * Search, filter, view details, and deactivate jobs if needed
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Briefcase, 
  Search,
  Eye,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
  department: string;
  subject: string;
  grade_level: string;
  job_type: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  benefits: string;
  school_name: string;
  school_id: string;
  is_active: boolean;
  posted_at: string;
  application_count?: number;
}

const ITEMS_PER_PAGE = 10;

export default function AdminJobs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [toggleJobId, setToggleJobId] = useState<string | null>(null);
  const [toggleJobActive, setToggleJobActive] = useState<boolean>(false);

  // Fetch jobs with pagination
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['admin-jobs', searchQuery, statusFilter, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' });

      // Apply status filter
      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,school_name.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.order('posted_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Get application counts for each job
      const jobsWithCounts = await Promise.all(
        (data || []).map(async (job) => {
          const { count } = await supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', job.id);
          
          return { ...job, application_count: count || 0 };
        })
      );

      return { jobs: jobsWithCounts as Job[], totalCount: count || 0 };
    },
  });

  const totalPages = Math.ceil((jobsData?.totalCount || 0) / ITEMS_PER_PAGE);

  // Toggle job status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ jobId, isActive }: { jobId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: isActive })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
      toast({
        title: 'Job updated',
        description: `Job has been ${toggleJobActive ? 'activated' : 'deactivated'}.`,
      });
      setToggleJobId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update job status.',
        variant: 'destructive',
      });
    },
  });

  const handleToggleStatus = (job: Job) => {
    setToggleJobId(job.id);
    setToggleJobActive(!job.is_active);
  };

  const confirmToggleStatus = () => {
    if (toggleJobId) {
      toggleStatusMutation.mutate({ jobId: toggleJobId, isActive: toggleJobActive });
    }
  };

  return (
    <AuthenticatedLayout showMobileNav>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
              Jobs Management
            </h1>
            <p className="text-muted-foreground">
              View and manage all job postings
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or school..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Job Postings</CardTitle>
            <CardDescription>
              {jobsData?.totalCount || 0} total jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : jobsData?.jobs && jobsData.jobs.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Title</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Applications</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobsData.jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
                                <Briefcase className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{job.title}</p>
                                <p className="text-xs text-muted-foreground">{job.department}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{job.school_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{job.location}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{job.application_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={job.is_active ? 'default' : 'secondary'}>
                              {job.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(job.posted_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedJob(job);
                                  setShowJobModal(true);
                                }}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(job)}
                                className="gap-1"
                              >
                                {job.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-green-500" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No jobs found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'No jobs have been posted yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Details Modal */}
        <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p>{selectedJob?.title}</p>
                  <Badge variant={selectedJob?.is_active ? 'default' : 'secondary'} className="mt-1">
                    {selectedJob?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </DialogTitle>
              <DialogDescription>Job posting details</DialogDescription>
            </DialogHeader>

            {selectedJob && (
              <div className="space-y-6 mt-4">
                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">School</p>
                      <p className="text-sm font-medium">{selectedJob.school_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{selectedJob.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Salary</p>
                      <p className="text-sm font-medium">{selectedJob.salary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Posted</p>
                      <p className="text-sm font-medium">{format(new Date(selectedJob.posted_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm">{selectedJob.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="text-sm">{selectedJob.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Grade Level</p>
                    <p className="text-sm">{selectedJob.grade_level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Job Type</p>
                    <p className="text-sm">{selectedJob.job_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Applications</p>
                    <p className="text-sm font-medium">{selectedJob.application_count || 0}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Description
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedJob.description}
                  </p>
                </div>

                {/* Requirements */}
                {selectedJob.requirements && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedJob.requirements}
                    </p>
                  </div>
                )}

                {/* Benefits */}
                {selectedJob.benefits && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Benefits</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedJob.benefits}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Toggle Status Confirmation */}
        <AlertDialog open={!!toggleJobId} onOpenChange={() => setToggleJobId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {toggleJobActive ? 'Activate Job?' : 'Deactivate Job?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {toggleJobActive
                  ? 'This will make the job visible to teachers and open for applications.'
                  : 'This will hide the job from teachers and prevent new applications.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmToggleStatus}
                className={toggleJobActive ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {toggleJobActive ? 'Activate' : 'Deactivate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthenticatedLayout>
  );
}

