/**
 * Admin Users Management Page
 * 
 * View and manage all users on the platform
 * Search, filter, and view user details
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Search,
  Eye,
  GraduationCap,
  Building2,
  Shield,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface UserDetails extends User {
  teacher?: {
    phone: string;
    location: string;
    years_experience: string;
    subjects: string[];
    grade_levels: string[];
    archetype: string | null;
    profile_complete: boolean;
  };
  school?: {
    school_name: string;
    school_type: string;
    location: string;
    website: string | null;
    profile_complete: boolean;
  };
}

const ITEMS_PER_PAGE = 10;

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Fetch users with pagination
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery, roleFilter, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('id, email, full_name, role, created_at', { count: 'exact' });

      // Apply role filter
      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { users: data as User[], totalCount: count || 0 };
    },
  });

  const totalPages = Math.ceil((usersData?.totalCount || 0) / ITEMS_PER_PAGE);

  // Fetch user details when viewing
  const handleViewUser = async (user: User) => {
    try {
      let userDetails: UserDetails = { ...user };

      if (user.role === 'teacher') {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('phone, location, years_experience, subjects, grade_levels, archetype, profile_complete')
          .eq('user_id', user.id)
          .single();
        
        if (teacherData) {
          userDetails.teacher = teacherData;
        }
      } else if (user.role === 'school') {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('school_name, school_type, location, website, profile_complete')
          .eq('user_id', user.id)
          .single();
        
        if (schoolData) {
          userDetails.school = schoolData;
        }
      }

      setSelectedUser(userDetails);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'teacher':
        return <GraduationCap className="h-4 w-4" />;
      case 'school':
        return <Building2 className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'default';
      case 'school':
        return 'secondary';
      case 'admin':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AuthenticatedLayout showMobileNav>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-muted-foreground">
              View and manage all platform users
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
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select 
                value={roleFilter} 
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="school">Schools</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {usersData?.totalCount || 0} total users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : usersData?.users && usersData.users.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {getInitials(user.full_name || user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.full_name || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                              {getRoleIcon(user.role)}
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUser(user)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
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
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || roleFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'No users have signed up yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedUser && getInitials(selectedUser.full_name || selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p>{selectedUser?.full_name || 'Unknown User'}</p>
                  <Badge variant={getRoleBadgeVariant(selectedUser?.role || '')} className="gap-1 mt-1">
                    {selectedUser && getRoleIcon(selectedUser.role)}
                    {selectedUser?.role}
                  </Badge>
                </div>
              </DialogTitle>
              <DialogDescription>User details and profile information</DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Joined
                    </p>
                    <p className="font-medium">{format(new Date(selectedUser.created_at), 'MMMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Teacher Profile */}
                {selectedUser.teacher && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" /> Teacher Profile
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p>{selectedUser.teacher.location || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Experience</p>
                        <p>{selectedUser.teacher.years_experience || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Archetype</p>
                        <p>{selectedUser.teacher.archetype || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profile Status</p>
                        <Badge variant={selectedUser.teacher.profile_complete ? 'default' : 'secondary'}>
                          {selectedUser.teacher.profile_complete ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Subjects</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedUser.teacher.subjects?.map((subject) => (
                            <Badge key={subject} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          )) || 'None'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* School Profile */}
                {selectedUser.school && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> School Profile
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2">
                        <p className="text-muted-foreground">School Name</p>
                        <p className="font-medium">{selectedUser.school.school_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p>{selectedUser.school.school_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p>{selectedUser.school.location}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Website</p>
                        <p>{selectedUser.school.website || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profile Status</p>
                        <Badge variant={selectedUser.school.profile_complete ? 'default' : 'secondary'}>
                          {selectedUser.school.profile_complete ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}

