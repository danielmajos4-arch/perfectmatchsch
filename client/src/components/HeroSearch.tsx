import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function HeroSearch() {
  const [searchType, setSearchType] = useState<'teachers' | 'schools'>('teachers');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLocation] = useLocation();
  const { user, role } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If user is authenticated, redirect to appropriate dashboard or jobs page
    if (user) {
      if (searchType === 'teachers' && role === 'teacher') {
        // Teacher searching for jobs - go to jobs page
        if (searchQuery.trim()) {
          setLocation(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          setLocation('/jobs');
        }
      } else if (searchType === 'schools' && role === 'school') {
        // School searching for teachers - go to jobs page (or candidates page if exists)
        if (searchQuery.trim()) {
          setLocation(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
          setLocation('/jobs');
        }
      } else {
        // Authenticated but wrong role - redirect to their dashboard
        if (role === 'teacher') {
          setLocation('/teacher/dashboard');
        } else if (role === 'school') {
          setLocation('/school/dashboard');
        } else {
          setLocation('/dashboard');
        }
      }
      return;
    }

    // If user is NOT authenticated, redirect to register with role pre-selected
    const selectedRole = searchType === 'teachers' ? 'teacher' : 'school';
    setLocation(`/register?role=${selectedRole}`);
  };

  return (
    <div className="w-full max-w-2xl">
      <Tabs value={searchType} onValueChange={(value) => setSearchType(value as 'teachers' | 'schools')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-800/50 h-10 md:h-11">
          <TabsTrigger 
            value="teachers" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-300 font-medium text-sm md:text-base"
          >
            Find Teachers
          </TabsTrigger>
          <TabsTrigger 
            value="schools"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-300 font-medium text-sm md:text-base"
          >
            Browse Schools
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSearch} className="w-full">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={
                searchType === 'teachers'
                  ? 'Search by role, skills, or keywords'
                  : 'Search by subject, location, or school name'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 md:h-14 text-sm md:text-base bg-white border-gray-300 focus-visible:ring-2 focus-visible:ring-primary text-gray-900"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-12 md:h-14 px-6 md:px-8 font-semibold whitespace-nowrap bg-gray-900 hover:bg-gray-800 text-white"
          >
            Search
          </Button>
        </div>
      </form>
    </div>
  );
}

