/**
 * Candidate Pipeline View Component
 * 
 * Kanban board view for managing candidates through the hiring pipeline
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  FileText,
  Mail,
  MoreVertical,
  GripVertical
} from 'lucide-react';
import { getSchoolCandidates, updateCandidateStatus } from '@/lib/matchingService';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { CandidateMatchView } from '@shared/matching';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CandidatePipelineViewProps {
  schoolId: string;
  jobId?: string;
}

type CandidateStatus = 'new' | 'reviewed' | 'contacted' | 'shortlisted' | 'hired' | 'rejected';

interface StatusColumn {
  id: CandidateStatus;
  label: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
}

const statusColumns: StatusColumn[] = [
  {
    id: 'new',
    label: 'New',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'reviewed',
    label: 'Reviewed',
    icon: Eye,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    id: 'contacted',
    label: 'Contacted',
    icon: Mail,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    id: 'shortlisted',
    label: 'Shortlisted',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    id: 'hired',
    label: 'Hired',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
];

export function CandidatePipelineView({ schoolId, jobId }: CandidatePipelineViewProps) {
  const { toast } = useToast();
  const [draggedCandidate, setDraggedCandidate] = useState<CandidateMatchView | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMatchView | null>(null);

  const { data: candidates, isLoading } = useQuery<CandidateMatchView[]>({
    queryKey: ['/api/candidates', schoolId, jobId],
    queryFn: async () => {
      return await getSchoolCandidates(schoolId, { jobId });
    },
    enabled: !!schoolId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ candidateId, status }: { candidateId: string; status: CandidateStatus }) => {
      return await updateCandidateStatus(candidateId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: 'Status updated',
        description: 'Candidate moved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDragStart = (candidate: CandidateMatchView) => {
    setDraggedCandidate(candidate);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: CandidateStatus) => {
    e.preventDefault();
    if (draggedCandidate && draggedCandidate.status !== targetStatus) {
      updateStatusMutation.mutate({
        candidateId: draggedCandidate.id,
        status: targetStatus,
      });
    }
    setDraggedCandidate(null);
  };

  const handleStatusChange = (candidate: CandidateMatchView, newStatus: CandidateStatus) => {
    if (candidate.status !== newStatus) {
      updateStatusMutation.mutate({
        candidateId: candidate.id,
        status: newStatus,
      });
    }
  };

  const getCandidatesByStatus = (status: CandidateStatus) => {
    return candidates?.filter(c => c.status === status) || [];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const stats = {
    total: candidates?.length || 0,
    new: getCandidatesByStatus('new').length,
    shortlisted: getCandidatesByStatus('shortlisted').length,
    hired: getCandidatesByStatus('hired').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading candidates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats - Mobile First */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Candidate Pipeline</h2>
          <p className="text-sm text-muted-foreground">Drag and drop candidates to move them through stages</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{stats.total} Total</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{stats.new} New</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">{stats.shortlisted} Shortlisted</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{stats.hired} Hired</span>
          </div>
        </div>
      </div>

      {/* Kanban Board - Mobile: Scroll horizontally, Desktop: Full width */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max sm:min-w-0">
          {statusColumns.map((column) => {
            const columnCandidates = getCandidatesByStatus(column.id);
            const Icon = column.icon;

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-72 sm:w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <Card className={`h-full ${column.bgColor} border-2`}>
                  <CardHeader className={`pb-3 ${column.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${column.color}`} />
                        <CardTitle className={`text-sm font-semibold ${column.color}`}>
                          {column.label}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {columnCandidates.length}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <ScrollArea className="h-[600px] sm:h-[700px]">
                      <div className="space-y-3">
                        {columnCandidates.length === 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            No candidates
                          </div>
                        ) : (
                          columnCandidates.map((candidate) => (
                            <CandidateCard
                              key={candidate.id}
                              candidate={candidate}
                              onDragStart={handleDragStart}
                              onStatusChange={handleStatusChange}
                              onSelect={setSelectedCandidate}
                              isDragging={draggedCandidate?.id === candidate.id}
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CandidateCardProps {
  candidate: CandidateMatchView;
  onDragStart: (candidate: CandidateMatchView) => void;
  onStatusChange: (candidate: CandidateMatchView, status: CandidateStatus) => void;
  onSelect: (candidate: CandidateMatchView) => void;
  isDragging: boolean;
}

function CandidateCard({
  candidate,
  onDragStart,
  onStatusChange,
  onSelect,
  isDragging,
}: CandidateCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(candidate)}
      className={`
        cursor-move hover:shadow-md transition-all
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={candidate.profile_photo_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(candidate.teacher_name || 'T')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{candidate.teacher_name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {candidate.teacher_archetype || 'No archetype'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSelect(candidate)}>
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                View Resume
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Match Score */}
        {candidate.match_score !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Match Score</span>
            <Badge
              variant={
                candidate.match_score >= 80
                  ? 'default'
                  : candidate.match_score >= 60
                  ? 'secondary'
                  : 'outline'
              }
              className="text-xs"
            >
              {candidate.match_score}%
            </Badge>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {candidate.teacher_subjects?.slice(0, 2).map((subject, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {subject}
            </Badge>
          ))}
          {candidate.teacher_grade_levels?.slice(0, 1).map((level, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {level}
            </Badge>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}</span>
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

