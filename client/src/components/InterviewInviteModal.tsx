import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Video, Phone, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { acceptInterviewInvite, declineInterviewInvite } from '@/lib/interviewService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { InterviewInvite } from '@shared/schema';

interface InterviewInviteModalProps {
  invite: InterviewInvite & { job?: any; school?: any };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewInviteModal({
  invite,
  open,
  onOpenChange,
}: InterviewInviteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: (notes?: string) => acceptInterviewInvite(invite.id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({
        title: 'Interview accepted',
        description: 'The school has been notified. Good luck!',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to accept',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (notes?: string) => declineInterviewInvite(invite.id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      toast({
        title: 'Interview declined',
        description: 'The school has been notified.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to decline',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const [responseNotes, setResponseNotes] = useState('');

  const scheduledDate = new Date(invite.scheduled_at);
  const isPast = scheduledDate < new Date();
  const canRespond = invite.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Interview Invitation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={
                invite.status === 'accepted'
                  ? 'default'
                  : invite.status === 'declined'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {invite.status === 'pending' && 'Pending Response'}
              {invite.status === 'accepted' && 'Accepted'}
              {invite.status === 'declined' && 'Declined'}
              {invite.status === 'completed' && 'Completed'}
              {invite.status === 'cancelled' && 'Cancelled'}
            </Badge>
            {isPast && invite.status === 'pending' && (
              <Badge variant="outline">Past Due</Badge>
            )}
          </div>

          {/* Job Info */}
          {invite.job && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-1">{invite.job.title}</h3>
              <p className="text-sm text-muted-foreground">
                {invite.school?.school_name || 'School'}
              </p>
            </div>
          )}

          {/* Interview Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(scheduledDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(scheduledDate, 'h:mm a')} ({invite.duration_minutes} minutes)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {invite.interview_type === 'video' && <Video className="h-4 w-4 text-muted-foreground" />}
              {invite.interview_type === 'phone' && <Phone className="h-4 w-4 text-muted-foreground" />}
              {invite.interview_type === 'in_person' && <MapPin className="h-4 w-4 text-muted-foreground" />}
              <span className="capitalize">{invite.interview_type.replace('_', ' ')}</span>
            </div>
            {invite.meeting_link && (
              <div>
                <a
                  href={invite.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Join Meeting →
                </a>
              </div>
            )}
            {invite.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location:</p>
                <p>{invite.location}</p>
              </div>
            )}
            {invite.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes from school:</p>
                <p className="text-sm">{invite.notes}</p>
              </div>
            )}
          </div>

          {/* Response Section */}
          {canRespond && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label htmlFor="response-notes">Response Notes (Optional)</Label>
                <Textarea
                  id="response-notes"
                  placeholder="Add any notes or questions..."
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => acceptMutation.mutate(responseNotes)}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Interview
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => declineMutation.mutate(responseNotes)}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* Already Responded */}
          {!canRespond && invite.teacher_notes && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Your Response:</p>
              <p className="text-sm text-muted-foreground">{invite.teacher_notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
