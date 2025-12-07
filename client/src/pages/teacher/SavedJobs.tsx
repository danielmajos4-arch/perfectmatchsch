import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SavedJobsGrid } from '@/components/SavedJobsGrid';
import { EmptyState } from '@/components/EmptyState';
import { Search, Filter, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getSavedJobs } from '@/lib/savedJobsService';
import type { SavedJob, Job } from '@shared/schema';

type SavedJobWithDetails = SavedJob & { job: Job };

export default function SavedJobs() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: teacherProfile } = useQuery({
    queryKey: ['/api/teacher-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const { data: savedJobs, isLoading } = useQuery<SavedJobWithDetails[]>({
    queryKey: ['/api/saved-jobs', teacherProfile?.id],
    queryFn: async () => {
      if (!teacherProfile?.id) return [];
      return await getSavedJobs(teacherProfile.id);
    },
    enabled: !!teacherProfile?.id,
  });

  // Filter saved jobs
  const filteredJobs = savedJobs?.filter((savedJob) => {
    if (searchQuery && !savedJob.job.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !savedJob.job.school_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (subjectFilter !== 'all' && savedJob.job.subject !== subjectFilter) return false;
    if (locationFilter !== 'all' && savedJob.job.location !== locationFilter) return false;
    return true;
  }) || [];

  const uniqueSubjects = Array.from(new Set(savedJobs?.map(sj => sj.job.subject) || []));
  const uniqueLocations = Array.from(new Set(savedJobs?.map(sj => sj.job.location) || []));

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Saved Jobs</h1>
            <p className="text-muted-foreground">Jobs you've saved for later</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {uniqueSubjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setSubjectFilter('all');
                  setLocationFilter('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved Jobs Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredJobs.length > 0 ? (
            <SavedJobsGrid
              savedJobs={filteredJobs}
              teacherId={teacherProfile?.id || ''}
            />
          ) : (
            <EmptyState
              icon="bookmark"
              title={searchQuery || subjectFilter !== 'all' || locationFilter !== 'all' ? "No saved jobs found" : "No saved jobs yet"}
              description={
                searchQuery || subjectFilter !== 'all' || locationFilter !== 'all'
                  ? "Try adjusting your search or filter criteria"
                  : "Save jobs you're interested in to view them later. Click the bookmark icon on any job posting to save it."
              }
              action={{
                label: "Browse Jobs",
                href: "/jobs"
              }}
            />
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
