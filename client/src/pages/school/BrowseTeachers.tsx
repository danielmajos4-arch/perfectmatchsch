import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, MapPin, Briefcase, Award, Mail, Star } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { trackProfileView } from '@/lib/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import type { Teacher } from '@shared/schema';

const SUBJECTS = ['Math', 'Science', 'English', 'History', 'Social Studies', 'Art', 'Music', 'PE', 'Special Ed', 'ESL', 'Technology', 'Other'];
const GRADE_LEVELS = ['Pre-K', 'K', '1-2', '3-5', '6-8', '9-12', 'College'];

export default function BrowseTeachers() {
  const { user, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');

  // Get school profile
  const { data: schoolProfile } = useQuery({
    queryKey: ['/api/school-profile', user?.id],
    queryFn: async () => {
      if (!user?.id || role !== 'school') return null;
      const { data, error } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && role === 'school',
  });

  // Get all teachers
  const { data: teachers, isLoading } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers', subjectFilter, gradeFilter, locationFilter, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('*')
        .eq('profile_complete', true);

      if (subjectFilter !== 'all') {
        query = query.contains('subjects', [subjectFilter]);
      }

      if (gradeFilter !== 'all') {
        query = query.contains('grade_levels', [gradeFilter]);
      }

      // Sort
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'experience') {
        // Note: This is a simplified sort - you might want to parse years_experience
        query = query.order('years_experience', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Teacher[];
    },
  });

  // Filter by search query and location
  const filteredTeachers = teachers?.filter(teacher => {
    if (searchQuery && !teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !teacher.bio?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (locationFilter !== 'all' && teacher.location !== locationFilter) {
      return false;
    }
    return true;
  }) || [];

  const uniqueLocations = Array.from(new Set(teachers?.map(t => t.location) || [])).filter(Boolean);

  const handleViewProfile = (teacherId: string) => {
    if (schoolProfile?.id) {
      trackProfileView(teacherId, schoolProfile.id, 'search').catch(console.error);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Browse Teachers</h1>
            <p className="text-muted-foreground">Discover talented teachers looking for opportunities</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or bio..."
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
                    {SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Grade Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {GRADE_LEVELS.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <MapPin className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently Active</SelectItem>
                    <SelectItem value="experience">Most Experienced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredTeachers.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Found {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map(teacher => (
                  <Card key={teacher.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={teacher.profile_photo_url || undefined} />
                          <AvatarFallback>
                            {teacher.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link href={`/teachers/${teacher.id}`} onClick={() => handleViewProfile(teacher.id)}>
                            <h3 className="font-semibold hover:text-primary cursor-pointer truncate">
                              {teacher.full_name}
                            </h3>
                          </Link>
                          {teacher.archetype && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {teacher.archetype}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{teacher.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" />
                          <span>{teacher.years_experience}</span>
                        </div>
                      </div>

                      {teacher.subjects && teacher.subjects.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {teacher.subjects.slice(0, 3).map(subject => (
                              <Badge key={subject} variant="outline" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                            {teacher.subjects.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{teacher.subjects.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {teacher.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {teacher.bio}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Link href={`/teachers/${teacher.id}`} className="flex-1" onClick={() => handleViewProfile(teacher.id)}>
                          <Button variant="outline" size="sm" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                        {role === 'school' && (
                          <Link href={`/messages?teacher=${teacher.id}`} className="flex-1">
                            <Button size="sm" className="w-full">
                              <Mail className="h-3 w-3 mr-1" />
                              Message
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-lg font-medium mb-2">No teachers found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setSubjectFilter('all');
                  setGradeFilter('all');
                  setLocationFilter('all');
                }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
