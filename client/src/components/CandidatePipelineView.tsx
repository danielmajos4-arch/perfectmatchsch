/**
 * Candidate Pipeline View Component
 * 
 * Kanban board view for managing candidates through the hiring pipeline
 */

import { useState, useEffect } from 'react';
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
  GripVertical,
  Plus
} from 'lucide-react';
import { getSchoolCandidates, updateCandidateStatus } from '@/lib/matchingService';
import { getPipelineStages } from '@/lib/pipelineService';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { CandidateMatchView } from '@shared/matching';
import type { PipelineStage } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { CandidateDetailView } from './CandidateDetailView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CandidatePipelineViewProps {
  schoolId: string;
  jobId?: string;
}

// Map standard stage names to icons and colors for visual consistency
const STAGE_CONFIG: Record<string, { icon: any, color: string, bgColor: string }> = {
  'New': { icon: Users, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  'Reviewed': { icon: Eye, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  'Phone Screen': { icon: Mail, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
  'Interview': { icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
  'Offer': { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  'Hired': { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  'Rejected': { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
};

const DEFAULT_STAGE_CONFIG = { icon: Users, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-900/20' };

export function CandidatePipelineView({ schoolId, jobId }: CandidatePipelineViewProps) {
  const { toast } = useToast();
  const [draggedCandidate, setDraggedCandidate] = useState<CandidateMatchView | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMatchView | null>(null);
  const [bulkActionStage, setBulkActionStage] = useState<string | null>(null);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);

  // Fetch pipeline stages
  const { data: stages, isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages', schoolId, jobId],
    queryFn: () => getPipelineStages(schoolId, jobId),
    enabled: !!schoolId,
  });

  // Fetch candidates
  const { data: candidates, isLoading: candidatesLoading } = useQuery<CandidateMatchView[]>({
    queryKey: ['/api/candidates', schoolId, jobId],
    queryFn: async () => {
      return await getSchoolCandidates(schoolId, { jobId });
    },
    enabled: !!schoolId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ candidateId, status }: { candidateId: string; status: string }) => {
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

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggedCandidate && draggedCandidate.status !== targetStatus) {
      updateStatusMutation.mutate({
        candidateId: draggedCandidate.id,
        status: targetStatus,
      });
    }
    setDraggedCandidate(null);
  };

  const handleStatusChange = (candidate: CandidateMatchView, newStatus: string) => {
    if (candidate.status !== newStatus) {
      updateStatusMutation.mutate({
        candidateId: candidate.id,
        status: newStatus,
      });
    }
  };

  // Helper to normalize status strings for comparison (e.g., "Phone Screen" -> "phone_screen" or vice versa)
  // For now, we assume the DB stores the stage name directly or a slug. 
  // The matching service likely expects specific enum values, but we're moving to dynamic strings.
  // We'll need to ensure the backend supports arbitrary status strings or we map them.
  // For Phase 1, we'll assume the status column in applications table is now a TEXT field that matches stage names.

  const getCandidatesByStatus = (stageName: string) => {
    if (!candidates) return [];
    // Case-insensitive comparison and handling of legacy status values
    return candidates.filter(c => {
      const s1 = (c.status || '').toLowerCase().replace(/_/g, ' ');
      const s2 = stageName.toLowerCase().replace(/_/g, ' ');
      return s1 === s2;
    });
  };

  if (stagesLoading || candidatesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Candidate Pipeline</h2>
          <p className="text-sm text-muted-foreground">Drag and drop candidates to move them through stages</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{candidates?.length || 0} Total</span>
          </div>
          {/* Add "Add Stage" button here in future */}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max sm:min-w-0">
          {stages?.map((stage) => {
            const columnCandidates = getCandidatesByStatus(stage.name);
            const config = STAGE_CONFIG[stage.name] || DEFAULT_STAGE_CONFIG;
            const Icon = config.icon;

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-72 sm:w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.name)} // Passing stage name as status
              >
                <Card className={`h-full ${config.bgColor} border-2`}>
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{stage.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {columnCandidates.length} candidate{columnCandidates.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {columnCandidates.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setBulkActionStage(stage.name);
                                setShowBulkRejectDialog(true);
                              }}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject All
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <ScrollArea className="h-[600px] sm:h-[700px]">
                      <div className="space-y-3">
                        {columnCandidates.length === 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground opacity-70">
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

      {selectedCandidate && (
        <CandidateDetailView
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Bulk Reject Dialog */}
      <AlertDialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject All Candidates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject all {candidates?.filter(c => c.status === bulkActionStage).length || 0} candidates in the "{bulkActionStage}" column.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const candidatesToReject = candidates?.filter(c => c.status === bulkActionStage) || [];
                try {
                  await Promise.all(
                    candidatesToReject.map(c => updateCandidateStatus(c.application_id!, 'Rejected'))
                  );
                  queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
                  toast({
                    title: 'Candidates rejected',
                    description: `${candidatesToReject.length} candidate(s) have been rejected.`,
                  });
                } catch (error: any) {
                  toast({
                    title: 'Failed to reject candidates',
                    description: error.message,
                    variant: 'destructive',
                  });
                }
                setShowBulkRejectDialog(false);
                setBulkActionStage(null);
              }}
            >
              Reject All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CandidateCardProps {
  candidate: CandidateMatchView;
  onDragStart: (candidate: CandidateMatchView) => void;
  onStatusChange: (candidate: CandidateMatchView, status: string) => void;
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

