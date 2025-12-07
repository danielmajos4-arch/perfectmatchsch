import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Briefcase, 
  Award, 
  GraduationCap, 
  Mail, 
  Download, 
  ExternalLink,
  Eye,
  Clock,
  BookOpen,
  Star
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { trackProfileView } from '@/lib/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Link } from 'wouter';
import { useEffect } from 'react';
import type { Teacher } from '@shared/schema';

export default function PublicProfile() {
  const [, params] = useRoute('/teachers/:teacherId');
  const teacherId = params?.teacherId;
  const { user, role } = useAuth();

  // Get teacher profile
  const { data: teacher, isLoading } = useQuery<Teacher>({
    queryKey: ['/api/public-teacher-profile', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (error) throw error;
      return data as Teacher;
    },
    enabled: !!teacherId,
  });

  // Get school profile if logged in as school
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

  // Track profile view if school is viewing
  useEffect(() => {
    if (teacher?.id && schoolProfile?.id && role === 'school') {
      trackProfileView(teacher.id, schoolProfile.id, 'direct_link').catch(console.error);
    }
  }, [teacher?.id, schoolProfile?.id, role]);

  // Get profile view stats
  const { data: viewStats } = useQuery({
    queryKey: ['/api/profile-views', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const { data, error } = await supabase
        .from('profile_views')
        .select('viewed_at', { count: 'exact', head: true })
        .eq('teacher_id', teacherId);
      if (error) throw error;
      return { total: data?.length || 0 };
    },
    enabled: !!teacherId,
  });

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto px-4 py-12">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!teacher) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-2xl font-bold mb-4">Teacher Not Found</h1>
            <p className="text-muted-foreground mb-6">This teacher profile doesn't exist or has been removed.</p>
            <Link href="/teachers">
              <Button>Browse Teachers</Button>
            </Link>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Hero Section */}
          <Card className="mb-6 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-500/20" />
            <CardContent className="pt-0 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 -mt-16">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                  <AvatarImage src={teacher.profile_photo_url || undefined} />
                  <AvatarFallback className="text-3xl">
                    {teacher.full_name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3 pt-16 sm:pt-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl font-bold">{teacher.full_name}</h1>
                    {teacher.archetype && (
                      <Badge className="text-sm px-3 py-1">
                        {teacher.archetype}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{teacher.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      <span>{teacher.years_experience} experience</span>
                    </div>
                    {viewStats && (
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4" />
                        <span>{viewStats.total} profile views</span>
                      </div>
                    )}
                  </div>
                  {role === 'school' && (
                    <div className="flex gap-3 pt-2">
                      <Link href={`/messages?teacher=${teacher.id}`}>
                        <Button>
                          <Mail className="h-4 w-4 mr-2" />
                          Message Teacher
                        </Button>
                      </Link>
                      <Button variant="outline">
                        <Star className="h-4 w-4 mr-2" />
                        Save Profile
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{teacher.subjects?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Subjects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{teacher.grade_levels?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Grade Levels</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{teacher.certifications?.length || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Certifications</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{viewStats?.total || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Profile Views</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              {teacher.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{teacher.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Teaching Philosophy */}
              {teacher.teaching_philosophy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Teaching Philosophy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{teacher.teaching_philosophy}</p>
                  </CardContent>
                </Card>
              )}

              {/* Experience & Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Experience & Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Subject Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects?.map(subject => (
                        <Badge key={subject} variant="secondary">{subject}</Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Grade Levels</h4>
                    <div className="flex flex-wrap gap-2">
                      {teacher.grade_levels?.map(level => (
                        <Badge key={level} variant="secondary">{level}</Badge>
                      ))}
                    </div>
                  </div>
                  {teacher.certifications && teacher.certifications.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-2">Certifications</h4>
                        <div className="flex flex-wrap gap-2">
                          {teacher.certifications.map(cert => (
                            <Badge key={cert} variant="outline" className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Portfolio Section */}
              {(teacher.resume_url || teacher.portfolio_url) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio & Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {teacher.resume_url && (
                      <a
                        href={teacher.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        Download Resume
                      </a>
                    )}
                    {teacher.portfolio_url && (
                      <a
                        href={teacher.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Portfolio
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Archetype Badge */}
              {teacher.archetype && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Teaching Archetype</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-3">
                      <Badge className="text-lg px-4 py-2">{teacher.archetype}</Badge>
                      <p className="text-sm text-muted-foreground">
                        This teacher's personality and teaching style based on our comprehensive assessment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium">{teacher.years_experience}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{teacher.location}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profile Views</span>
                    <span className="font-medium">{viewStats?.total || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
