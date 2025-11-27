import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { JobCard } from '@/components/JobCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/contexts/AuthContext';
import { ProfileCompletionGate } from '@/components/ProfileCompletionGate';

type SortOption = 'date' | 'salary-desc' | 'salary-asc' | 'relevance';

export default function Jobs() {
  const { role } = useAuth();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;
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
      
      // Map employment_type to job_type for UI consistency
      return (data || []).map(job => ({
        ...job,
        job_type: (job as any).employment_type || (job as any).job_type
      })) as Job[];
    },
  });

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

    const filtered = jobs.filter((job) => {
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

    // Sort filtered jobs
    const sorted = [...filtered];
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
        break;
      case 'salary-desc':
        sorted.sort((a, b) => {
          const aSalary = parseInt(a.salary.replace(/[^0-9]/g, '')) || 0;
          const bSalary = parseInt(b.salary.replace(/[^0-9]/g, '')) || 0;
          return bSalary - aSalary;
        });
        break;
      case 'salary-asc':
        sorted.sort((a, b) => {
          const aSalary = parseInt(a.salary.replace(/[^0-9]/g, '')) || 0;
          const bSalary = parseInt(b.salary.replace(/[^0-9]/g, '')) || 0;
          return aSalary - bSalary;
        });
        break;
      case 'relevance':
        // Sort by relevance (title match > school name match > location match)
        sorted.sort((a, b) => {
          const query = searchQuery.toLowerCase();
          const aTitle = a.title.toLowerCase().includes(query) ? 3 : 0;
          const aSchool = a.school_name.toLowerCase().includes(query) ? 2 : 0;
          const aLocation = a.location.toLowerCase().includes(query) ? 1 : 0;
          const aScore = aTitle + aSchool + aLocation;
          
          const bTitle = b.title.toLowerCase().includes(query) ? 3 : 0;
          const bSchool = b.school_name.toLowerCase().includes(query) ? 2 : 0;
          const bLocation = b.location.toLowerCase().includes(query) ? 1 : 0;
          const bScore = bTitle + bSchool + bLocation;
          
          return bScore - aScore;
        });
        break;
    }
    return sorted;
  }, [jobs, searchQuery, filters, sortBy]);

  // Pagination
  const totalPages = Math.ceil((filteredJobs?.length || 0) / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const paginatedJobs = filteredJobs?.slice(startIndex, endIndex) || [];

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, JSON.stringify(filters), sortBy]);

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

  const content = (
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
          <div className="flex flex-col sm:flex-row gap-3">
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
          <div className="flex items-center gap-2 sm:ml-auto">
            <Label htmlFor="sort" className="text-sm font-medium whitespace-nowrap hidden sm:inline">Sort:</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger id="sort" className="h-12 w-full sm:w-[200px] text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Posted (Newest)</SelectItem>
                <SelectItem value="salary-desc">Salary (High to Low)</SelectItem>
                <SelectItem value="salary-asc">Salary (Low to High)</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <>
          <div className="space-y-4">
              {paginatedJobs.map((job) => (
                <JobCard key={job.id} job={job} showQuickApply={true} />
            ))}
          </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} - {Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length} jobs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-10"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-10 w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-10"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );

  // For teachers, wrap content in profile completion gate
  if (role === 'teacher') {
    return <ProfileCompletionGate>{content}</ProfileCompletionGate>;
  }

  // Schools and unauthenticated users see jobs page normally
  return content;
}
