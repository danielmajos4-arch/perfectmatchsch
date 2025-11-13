import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { JobCard } from '@/components/JobCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdvancedJobFilters, type JobFilters } from '@/components/AdvancedJobFilters';
import { SavedSearches } from '@/components/SavedSearches';
import { SearchSuggestions } from '@/components/SearchSuggestions';
import { EmptyState } from '@/components/EmptyState';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { addToSearchHistory } from '@/lib/savedSearchService';
import type { Job } from '@shared/schema';
import { subDays, subWeeks, subMonths } from 'date-fns';

export default function Jobs() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<JobFilters>>({
    subject: 'all',
    gradeLevel: 'all',
    jobType: 'all',
    salaryMin: 0,
    salaryMax: 200000,
    datePosted: 'all',
    schoolType: 'all',
    benefits: [],
    location: '',
  });

  // Read search query from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchQuery(decodeURIComponent(searchParam));
    }
  }, [location]);

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_at', { ascending: false });

      if (error) throw error;
      return data as Job[];
    },
  });

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs.filter((job) => {
      // Search query
      const matchesSearch =
        !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());

      // Subject filter
      const matchesSubject = !filters.subject || filters.subject === 'all' || job.subject === filters.subject;

      // Grade level filter
      const matchesGradeLevel = !filters.gradeLevel || filters.gradeLevel === 'all' || job.grade_level === filters.gradeLevel;

      // Job type filter
      const matchesJobType = !filters.jobType || filters.jobType === 'all' || job.job_type === filters.jobType;

      // Salary filter (parse salary string like "$50,000 - $60,000")
      const matchesSalary = (() => {
        if (!filters.salaryMin && !filters.salaryMax) return true;
        if (!job.salary) return true;
        
        const salaryStr = job.salary.replace(/[^0-9-]/g, '');
        const parts = salaryStr.split('-').map(s => parseInt(s.trim()));
        const jobMin = parts[0] || 0;
        const jobMax = parts[1] || jobMin;
        
        return (jobMax >= (filters.salaryMin || 0)) && (jobMin <= (filters.salaryMax || 200000));
      })();

      // Date posted filter
      const matchesDatePosted = (() => {
        if (!filters.datePosted || filters.datePosted === 'all') return true;
        
        const postedDate = new Date(job.posted_at);
        const now = new Date();
        
        switch (filters.datePosted) {
          case 'today':
            return postedDate >= subDays(now, 1);
          case 'week':
            return postedDate >= subWeeks(now, 1);
          case 'month':
            return postedDate >= subMonths(now, 1);
          case '3months':
            return postedDate >= subMonths(now, 3);
          default:
            return true;
        }
      })();

      // Location filter
      const matchesLocation = !filters.location || 
        job.location.toLowerCase().includes(filters.location.toLowerCase());

      // Benefits filter (check if job.benefits contains any selected benefit)
      const matchesBenefits = !filters.benefits || filters.benefits.length === 0 ||
        (job.benefits && filters.benefits.some(benefit => 
          job.benefits.toLowerCase().includes(benefit.toLowerCase())
        ));

      return matchesSearch && matchesSubject && matchesGradeLevel && 
             matchesJobType && matchesSalary && matchesDatePosted && 
             matchesLocation && matchesBenefits;
    });
  }, [jobs, searchQuery, filters]);

  // Save search to history when filters change (debounced)
  useEffect(() => {
    if (user?.id && filteredJobs.length >= 0 && (searchQuery || Object.keys(filters).some(k => {
      const val = filters[k as keyof JobFilters];
      return val !== 'all' && val !== '' && val !== 0 && (!Array.isArray(val) || val.length > 0);
    }))) {
      const timeoutId = setTimeout(() => {
        addToSearchHistory(
          user.id,
          searchQuery || null,
          filters,
          filteredJobs.length
        ).catch(console.error);
      }, 2000); // Debounce: save after 2 seconds of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, searchQuery, JSON.stringify(filters), filteredJobs.length]);

  return (
    <AuthenticatedLayout>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
        {/* Header - Mobile First */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
            Teaching Positions
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Discover your next teaching opportunity
          </p>
        </div>

        {/* Filters - Mobile First */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-6 md:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="Search by title, school, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-10 sm:pl-12 text-base"
              data-testid="input-search"
            />
            {searchQuery.length >= 2 && (
              <SearchSuggestions
                searchQuery={searchQuery}
                onSelectSuggestion={setSearchQuery}
                userId={user?.id}
              />
            )}
          </div>
          <Select 
            value={filters.subject || 'all'} 
            onValueChange={(value) => setFilters({ ...filters, subject: value })}
          >
            <SelectTrigger className="h-12 w-full sm:w-full md:w-64 text-base" data-testid="select-subject">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Science">Science</SelectItem>
              <SelectItem value="History">History</SelectItem>
              <SelectItem value="Art">Art</SelectItem>
              <SelectItem value="Music">Music</SelectItem>
              <SelectItem value="Physical Education">Physical Education</SelectItem>
              <SelectItem value="Special Education">Special Education</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters & Saved Searches */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 md:mb-8">
          <div className="lg:col-span-2">
            <AdvancedJobFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters({
                subject: 'all',
                gradeLevel: 'all',
                jobType: 'all',
                salaryMin: 0,
                salaryMax: 200000,
                datePosted: 'all',
                schoolType: 'all',
                benefits: [],
                location: '',
              })}
            />
          </div>
          {user?.id && (
            <div className="lg:col-span-1">
              <SavedSearches
                userId={user.id}
                currentSearchQuery={searchQuery}
                currentFilters={filters}
                onApplySearch={(query, filters) => {
                  setSearchQuery(query || '');
                  setFilters(filters);
                }}
              />
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Skeleton className="h-16 w-16 sm:h-12 sm:w-12 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredJobs?.length === 0 && (
          <EmptyState
            icon="search"
            title="No jobs found"
            description={searchQuery || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== 0 && (!Array.isArray(v) || v.length > 0))
              ? "Try adjusting your search or filters to find more opportunities."
              : "New job postings appear here regularly. Check back soon!"}
            action={searchQuery || Object.values(filters).some(v => v !== 'all' && v !== '' && v !== 0 && (!Array.isArray(v) || v.length > 0)) ? {
              label: "Clear Filters",
              onClick: () => {
                setSearchQuery('');
                setFilters({
                  subject: 'all',
                  gradeLevel: 'all',
                  jobType: 'all',
                  salaryMin: 0,
                  salaryMax: 200000,
                  datePosted: 'all',
                  schoolType: 'all',
                  benefits: [],
                  location: '',
                });
              }
            } : undefined}
          />
        )}

        {/* Job List */}
        {!isLoading && filteredJobs && filteredJobs.length > 0 && (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
