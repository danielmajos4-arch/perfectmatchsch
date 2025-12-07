import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, Filter, Eye, FileText, Mail, ExternalLink, Star, X, LayoutGrid, List, CheckSquare, Square, Download, MoreHorizontal, Trash2, MessageCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { getSchoolCandidates, updateCandidateStatus } from '@/lib/matchingService';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateConversation } from '@/lib/conversationService';
import { supabase } from '@/lib/supabaseClient';
import { CandidatePipelineView } from '@/components/CandidatePipelineView';
import { CandidateComparison } from '@/components/CandidateComparison';
import { PortfolioGallery } from '@/components/PortfolioGallery';
import { EmailComposerModal } from '@/components/EmailComposerModal';
import type { CandidateMatchView } from '@shared/matching';
import { formatDistanceToNow } from 'date-fns';
import type { Application, Job, Teacher } from '@shared/schema';
import { useLocation } from 'wouter';

interface CandidateDashboardProps {
  schoolId: string;
  jobId?: string;
}

export function CandidateDashboard({ schoolId, jobId }: CandidateDashboardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMatchView | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    archetype: 'all',
    gradeLevel: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline' | 'compare'>('list');
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkNotesModal, setShowBulkNotesModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [comparisonCandidates, setComparisonCandidates] = useState<CandidateMatchView[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application & { job?: Job; teacher?: Teacher } | null>(null);

  // Handle message button click - navigate to conversation
  const handleMessageTeacher = async (candidate: CandidateMatchView) => {
    try {
      if (!candidate.teacher_id || !schoolId) {
        toast({
          title: 'Error',
          description: 'Missing required information to start conversation.',
          variant: 'destructive',
        });
        return;
      }

      // Get or create conversation (with timeout)
      const convPromise = getOrCreateConversation(
        candidate.teacher_id,
        schoolId,
        candidate.job_id
      );
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Conversation creation timed out. Please try again.')), 10000);
      });

      const { conversation } = await Promise.race([convPromise, timeoutPromise]) as { conversation: any; isNew: boolean };

      // Navigate to messages with conversation ID
      navigate(`/messages?conversation=${conversation.id}`);
    } catch (error: any) {
      console.error('Error getting conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to open conversation.',
        variant: 'destructive',
      });
    }
  };

  const { data: candidates, isLoading } = useQuery<CandidateMatchView[]>({
    queryKey: ['/api/candidates', schoolId, jobId, filters],
    queryFn: async () => {
      return await getSchoolCandidates(schoolId, {
        jobId,
        status: filters.status !== 'all' ? filters.status : undefined,
        archetype: filters.archetype !== 'all' ? filters.archetype : undefined,
      });
    },
    enabled: !!schoolId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ candidateId, status, notes }: { candidateId: string; status: string; notes?: string }) => {
      return await updateCandidateStatus(
        candidateId,
        status as any,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: 'Status updated',
        description: 'Candidate status has been updated.',
      });
      setShowNotesModal(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ candidateIds, status, notes }: { candidateIds: string[]; status: string; notes?: string }) => {
      const promises = candidateIds.map(id =>
        updateCandidateStatus(id, status as any, notes)
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setSelectedCandidates(new Set());
      setShowBulkActions(false);
      setShowBulkStatusModal(false);
      setShowBulkNotesModal(false);
      setBulkStatus('');
      setBulkNotes('');
      toast({
        title: 'Bulk update successful',
        description: `${selectedCandidates.size} candidate(s) updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update candidates',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredCandidates = candidates?.filter((candidate) => {
    const matchesSearch =
      candidate.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.teacher_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.job_title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGrade = filters.gradeLevel === 'all' ||
      candidate.teacher_grade_levels.includes(filters.gradeLevel);

    return matchesSearch && matchesGrade;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      new: { variant: 'default', label: 'New' },
      reviewed: { variant: 'secondary', label: 'Reviewed' },
      contacted: { variant: 'default', label: 'Contacted' },
      shortlisted: { variant: 'default', label: 'Shortlisted' },
      hired: { variant: 'default', label: 'Hired' },
      hidden: { variant: 'secondary', label: 'Hidden' },
    };

    const config = variants[status] || variants.new;
    return <Badge variant={config.variant} className="rounded-full">{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStatusChange = (candidateId: string, newStatus: string) => {
    const candidate = candidates?.find(c => c.id === candidateId);
    if (candidate) {
      setSelectedCandidate(candidate);
      setNotes(candidate.school_notes || '');
      setShowNotesModal(true);
      // Will update after notes modal
    }
  };

  const handleSaveNotes = () => {
    if (!selectedCandidate) return;
    updateStatusMutation.mutate({
      candidateId: selectedCandidate.id,
      status: selectedCandidate.status,
      notes,
    });
  };

  const handleSelectCandidate = (candidateId: string, checked: boolean) => {
    const newSelected = new Set(selectedCandidates);
    if (checked) {
      newSelected.add(candidateId);
    } else {
      newSelected.delete(candidateId);
    }
    setSelectedCandidates(newSelected);
    setShowBulkActions(newSelected.size > 0);

    // Update comparison candidates
    if (checked && newSelected.size <= 3) {
      const candidate = filteredCandidates?.find(c => c.id === candidateId);
      if (candidate && !comparisonCandidates.find(c => c.id === candidateId)) {
        setComparisonCandidates(prev => [...prev, candidate].slice(0, 3));
      }
    } else if (!checked) {
      setComparisonCandidates(prev => prev.filter(c => c.id !== candidateId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredCandidates?.map(c => c.id) || []);
      setSelectedCandidates(allIds);
      setShowBulkActions(allIds.size > 0);
    } else {
      setSelectedCandidates(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus || selectedCandidates.size === 0) return;
    bulkUpdateMutation.mutate({
      candidateIds: Array.from(selectedCandidates),
      status: bulkStatus,
      notes: bulkNotes || undefined,
    });
  };

  const handleBulkExport = () => {
    if (selectedCandidates.size === 0) return;

    const selected = filteredCandidates?.filter(c => selectedCandidates.has(c.id)) || [];

    // Create CSV content
    const headers = ['Name', 'Email', 'Archetype', 'Match Score', 'Status', 'Job Title', 'School', 'Subjects', 'Grade Levels', 'Location', 'Created At'];
    const rows = selected.map(c => [
      c.teacher_name,
      c.teacher_email,
      c.teacher_archetype || 'N/A',
      c.match_score.toString(),
      c.status,
      c.job_title,
      c.school_name,
      c.teacher_subjects.join('; '),
      c.teacher_grade_levels.join('; '),
      c.teacher_location || 'N/A',
      new Date(c.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Exported ${selectedCandidates.size} candidate(s) to CSV.`,
    });
  };

  const isAllSelected = filteredCandidates && filteredCandidates.length > 0 &&
    filteredCandidates.every(c => selectedCandidates.has(c.id));
  const isSomeSelected = selectedCandidates.size > 0 && !isAllSelected;

  const stats = [
    {
      label: 'Total Candidates',
      value: candidates?.length || 0,
      icon: Users,
    },
    {
      label: 'New Candidates',
      value: candidates?.filter(c => c.status === 'new').length || 0,
      icon: Users,
    },
    {
      label: 'Shortlisted',
      value: candidates?.filter(c => c.status === 'shortlisted').length || 0,
      icon: Star,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header - Mobile First */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Candidate Pool</h2>
          <p className="text-sm sm:text-base text-muted-foreground">View and manage candidates matched to your jobs</p>
        </div>
        {/* View Toggle - Mobile First */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
          <Button
            variant={viewMode === 'pipeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pipeline')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Pipeline</span>
          </Button>
          {selectedCandidates.size >= 2 && selectedCandidates.size <= 3 && (
            <Button
              variant={viewMode === 'compare' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('compare')}
              className="gap-2"
            >
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Filters - Mobile First: Stacked on mobile, horizontal on desktop */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search - Full width on mobile */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-10 w-full"
            />
          </div>

          {/* Filters - Grid on mobile, row on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-row gap-3 md:gap-4">
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="h-12 w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.archetype} onValueChange={(value) => setFilters({ ...filters, archetype: value })}>
              <SelectTrigger className="h-12 w-full md:w-48">
                <SelectValue placeholder="Archetype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Archetypes</SelectItem>
                <SelectItem value="The Guide">The Guide</SelectItem>
                <SelectItem value="The Trailblazer">The Trailblazer</SelectItem>
                <SelectItem value="The Changemaker">The Changemaker</SelectItem>
                <SelectItem value="The Connector">The Connector</SelectItem>
                <SelectItem value="The Explorer">The Explorer</SelectItem>
                <SelectItem value="The Leader">The Leader</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.gradeLevel} onValueChange={(value) => setFilters({ ...filters, gradeLevel: value })}>
              <SelectTrigger className="h-12 w-full md:w-48">
                <SelectValue placeholder="Grade Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="Elementary">Elementary</SelectItem>
                <SelectItem value="Middle School">Middle School</SelectItem>
                <SelectItem value="High School">High School</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Toolbar - Mobile First */}
      {showBulkActions && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">
                {selectedCandidates.size} candidate{selectedCandidates.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkStatusModal(true)}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <MoreHorizontal className="h-4 w-4" />
                Update Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkNotesModal(true)}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <FileText className="h-4 w-4" />
                Add Notes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCandidates(new Set());
                  setShowBulkActions(false);
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* View Mode: Comparison */}
      {viewMode === 'compare' && comparisonCandidates.length >= 2 ? (
        <CandidateComparison
          candidates={comparisonCandidates}
          onClose={() => setViewMode('list')}
          onRemove={(candidateId) => {
            setSelectedCandidates(prev => {
              const newSet = new Set(prev);
              newSet.delete(candidateId);
              return newSet;
            });
            setComparisonCandidates(prev => prev.filter(c => c.id !== candidateId));
            if (comparisonCandidates.length <= 2) {
              setViewMode('list');
            }
          }}
        />
      ) : viewMode === 'pipeline' ? (
        <CandidatePipelineView schoolId={schoolId} jobId={jobId} />
      ) : (
        <>
          {/* Candidates List - Mobile First: Cards on mobile, Table on desktop */}
          import {Skeleton} from "@/components/ui/skeleton";

          // ... existing code ...

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 w-full">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredCandidates && filteredCandidates.length > 0 ? (
            <>
              {/* Mobile: Card Layout */}
              <div className="md:hidden space-y-4">
                {filteredCandidates.map((candidate) => (
                  <Card key={candidate.id} className="p-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedCandidates.has(candidate.id)}
                            onCheckedChange={(checked) => handleSelectCandidate(candidate.id, checked as boolean)}
                            className="flex-shrink-0"
                          />
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                              {getInitials(candidate.teacher_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{candidate.teacher_name}</p>
                            <p className="text-sm text-muted-foreground truncate">{candidate.teacher_email}</p>
                          </div>
                        </div>
                        {getStatusBadge(candidate.status)}
                      </div>

                      {/* Job Info */}
                      <div className="border-t pt-3">
                        <p className="font-medium text-foreground text-sm mb-1">{candidate.job_title}</p>
                        <p className="text-xs text-muted-foreground">{candidate.school_name}</p>
                      </div>

                      {/* Match Info & Archetype */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary" className="rounded-full">
                          {candidate.teacher_archetype || 'N/A'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-foreground">{candidate.match_score}</span>
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-11"
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setShowProfileModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 gap-2"
                          onClick={() => handleMessageTeacher(candidate)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 gap-2"
                          onClick={async () => {
                            try {
                              // Fetch application by job_id and teacher_id
                              let application = null;

                              if (candidate.application_id) {
                                const { data: appData } = await supabase
                                  .from('applications')
                                  .select('*, job:jobs(*), teacher:teachers!applications_teacher_id_fkey(*)')
                                  .eq('id', candidate.application_id)
                                  .maybeSingle();
                                application = appData;
                              }

                              if (!application && candidate.job_id && candidate.teacher_id) {
                                const { data: appData } = await supabase
                                  .from('applications')
                                  .select('*, job:jobs(*), teacher:teachers!applications_teacher_id_fkey(*)')
                                  .eq('job_id', candidate.job_id)
                                  .eq('teacher_id', candidate.teacher_id)
                                  .maybeSingle();
                                application = appData;
                              }

                              if (application) {
                                const job = Array.isArray(application.job) ? application.job[0] : application.job;
                                const teacher = Array.isArray(application.teacher) ? application.teacher[0] : application.teacher;
                                setSelectedApplication({
                                  ...application,
                                  job: job as Job,
                                  teacher: teacher as Teacher,
                                } as any);
                                setShowEmailModal(true);
                              } else {
                                toast({
                                  title: 'Application not found',
                                  description: 'Could not find application data.',
                                  variant: 'destructive',
                                });
                              }
                            } catch (error: any) {
                              console.error('Error fetching application:', error);
                              toast({
                                title: 'Error',
                                description: 'Failed to load application data.',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </Button>
                        <Select
                          value={candidate.status}
                          onValueChange={(value) => handleStatusChange(candidate.id, value)}
                        >
                          <SelectTrigger className="h-11 flex-1 min-w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="hired">Hired</SelectItem>
                            <SelectItem value="hidden">Hidden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <Card className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) {
                              (el as unknown as HTMLInputElement).indeterminate = isSomeSelected;
                            }
                          }}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Archetype</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCandidates.has(candidate.id)}
                            onCheckedChange={(checked) => handleSelectCandidate(candidate.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(candidate.teacher_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground">{candidate.teacher_name}</p>
                              <p className="text-sm text-muted-foreground">{candidate.teacher_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full">
                            {candidate.teacher_archetype || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{candidate.match_score}</span>
                            <span className="text-xs text-muted-foreground">pts</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{candidate.job_title}</p>
                            <p className="text-sm text-muted-foreground">{candidate.school_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(candidate.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCandidate(candidate);
                                setShowProfileModal(true);
                              }}
                              title="View Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMessageTeacher(candidate)}
                              title="Message Teacher"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                try {
                                  // Fetch application by job_id and teacher_id (more reliable than by ID)
                                  let application = null;

                                  if (candidate.application_id) {
                                    // Try to fetch by application_id first
                                    const { data: appData, error: appError } = await supabase
                                      .from('applications')
                                      .select(`
                                  *,
                                  job:jobs(*),
                                  teacher:teachers!applications_teacher_id_fkey(*)
                                `)
                                      .eq('id', candidate.application_id)
                                      .maybeSingle();

                                    if (!appError && appData) {
                                      application = appData;
                                    }
                                  }

                                  // If not found by application_id, try by job_id and teacher_id
                                  if (!application && candidate.job_id && candidate.teacher_id) {
                                    const { data: appData, error: appError } = await supabase
                                      .from('applications')
                                      .select(`
                                  *,
                                  job:jobs(*),
                                  teacher:teachers!applications_teacher_id_fkey(*)
                                `)
                                      .eq('job_id', candidate.job_id)
                                      .eq('teacher_id', candidate.teacher_id)
                                      .maybeSingle();

                                    if (!appError && appData) {
                                      application = appData;
                                    }
                                  }

                                  if (application) {
                                    // Ensure job and teacher data are properly structured
                                    const job = Array.isArray(application.job)
                                      ? application.job[0]
                                      : application.job;
                                    const teacher = Array.isArray(application.teacher)
                                      ? application.teacher[0]
                                      : application.teacher;

                                    setSelectedApplication({
                                      ...application,
                                      job: job as Job,
                                      teacher: teacher as Teacher,
                                    } as any);
                                    setShowEmailModal(true);
                                  } else {
                                    toast({
                                      title: 'Application not found',
                                      description: 'Could not find application data for this candidate.',
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (error: any) {
                                  console.error('Error fetching application:', error);
                                  toast({
                                    title: 'Error',
                                    description: error.message || 'Failed to load application data.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              title="Email Applicant"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Select
                              value={candidate.status}
                              onValueChange={(value) => handleStatusChange(candidate.id, value)}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                <SelectItem value="hired">Hired</SelectItem>
                                <SelectItem value="hidden">Hidden</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-2">No candidates found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || filters.status !== 'all' || filters.archetype !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Candidates will appear here when they match your job postings'}
              </p>
            </Card>
          )}
        </>
      )}

      {/* Profile Modal - Mobile Optimized */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">Teacher Profile</DialogTitle>
            <DialogDescription className="text-sm">View candidate details and match information</DialogDescription>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                    {getInitials(selectedCandidate.teacher_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground">{selectedCandidate.teacher_name}</h3>
                  <p className="text-muted-foreground">{selectedCandidate.teacher_email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="rounded-full">
                      {selectedCandidate.teacher_archetype || 'N/A'}
                    </Badge>
                    <Badge variant="default" className="rounded-full">
                      Match: {selectedCandidate.match_score} pts
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Subjects</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.teacher_subjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="rounded-full">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Grade Levels</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.teacher_grade_levels.map((grade) => (
                      <Badge key={grade} variant="secondary" className="rounded-full">
                        {grade}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Match Reason</h4>
                <p className="text-sm text-muted-foreground">{selectedCandidate.match_reason || 'No reason provided'}</p>
              </div>

              {/* Action Buttons - Stack on mobile, row on desktop */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                {selectedCandidate.resume_url && (
                  <Button variant="outline" asChild className="h-11 flex-1 sm:flex-initial">
                    <a href={selectedCandidate.resume_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      View Resume
                    </a>
                  </Button>
                )}
                {selectedCandidate.portfolio_url && (
                  <Button variant="outline" asChild className="h-11 flex-1 sm:flex-initial">
                    <a href={selectedCandidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Portfolio
                    </a>
                  </Button>
                )}
                <Button variant="outline" asChild className="h-11 flex-1 sm:flex-initial">
                  <a href={`mailto:${selectedCandidate.teacher_email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Modal - Mobile Optimized */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">Update Candidate Status</DialogTitle>
            <DialogDescription className="text-sm">Add notes and update candidate status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this candidate..."
                className="min-h-32 text-base"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowNotesModal(false)}
              className="w-full sm:w-auto h-11 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateStatusMutation.isPending}
              className="w-full sm:w-auto h-11 order-1 sm:order-2"
            >
              {updateStatusMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Modal */}
      <Dialog open={showBulkStatusModal} onOpenChange={setShowBulkStatusModal}>
        <DialogContent className="p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">Update Status for {selectedCandidates.size} Candidate(s)</DialogTitle>
            <DialogDescription className="text-sm">
              Select a new status for all selected candidates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">New Status</label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add notes for all selected candidates..."
                className="min-h-24 text-base"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkStatusModal(false);
                setBulkStatus('');
                setBulkNotes('');
              }}
              className="w-full sm:w-auto h-11 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || bulkUpdateMutation.isPending}
              className="w-full sm:w-auto h-11 order-1 sm:order-2"
            >
              {bulkUpdateMutation.isPending ? 'Updating...' : `Update ${selectedCandidates.size} Candidate(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Notes Modal */}
      <Dialog open={showBulkNotesModal} onOpenChange={setShowBulkNotesModal}>
        <DialogContent className="p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">Add Notes to {selectedCandidates.size} Candidate(s)</DialogTitle>
            <DialogDescription className="text-sm">
              Add notes that will be applied to all selected candidates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add notes for all selected candidates..."
                className="min-h-32 text-base"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkNotesModal(false);
                setBulkNotes('');
              }}
              className="w-full sm:w-auto h-11 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (bulkNotes.trim()) {
                  bulkUpdateMutation.mutate({
                    candidateIds: Array.from(selectedCandidates),
                    status: filteredCandidates?.find(c => selectedCandidates.has(c.id))?.status || 'new',
                    notes: bulkNotes,
                  });
                }
              }}
              disabled={!bulkNotes.trim() || bulkUpdateMutation.isPending}
              className="w-full sm:w-auto h-11 order-1 sm:order-2"
            >
              {bulkUpdateMutation.isPending ? 'Saving...' : `Save Notes to ${selectedCandidates.size} Candidate(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Composer Modal */}
      {selectedApplication && selectedApplication.job && (
        <EmailComposerModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedApplication(null);
          }}
          application={selectedApplication}
          job={selectedApplication.job}
          teacher={selectedApplication.teacher || null}
          onSent={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
          }}
        />
      )}
    </div>
  );
}

