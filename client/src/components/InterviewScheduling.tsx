import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Video, Phone, MapPin, Send } from 'lucide-react';
import { createInterviewInvite } from '@/lib/interviewService';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { Application } from '@shared/schema';

interface InterviewSchedulingProps {
  application: Application;
  teacherId: string;
  schoolId: string;
  jobId: string;
  onSuccess?: () => void;
}

export function InterviewScheduling({
  application,
  teacherId,
  schoolId,
  jobId,
  onSuccess,
}: InterviewSchedulingProps) {
  const { toast } = useToast();
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('30');
  const [interviewType, setInterviewType] = useState<'video' | 'phone' | 'in_person'>('video');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createInterviewInvite({
      applicationId: application.id,
      teacherId,
      schoolId,
      jobId,
      scheduledAt,
      durationMinutes: parseInt(duration),
      interviewType,
      location: interviewType === 'in_person' ? location : undefined,
      meetingLink: interviewType === 'video' ? meetingLink : undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      toast({
        title: 'Interview invite sent',
        description: 'The teacher will be notified about the interview.',
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send invite',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      toast({
        title: 'Date required',
        description: 'Please select an interview date and time.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Interview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled-at">Date & Time *</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="interview-type">Interview Type</Label>
            <Select value={interviewType} onValueChange={(value: any) => setInterviewType(value)}>
              <SelectTrigger id="interview-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Call
                  </div>
                </SelectItem>
                <SelectItem value="phone">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Call
                  </div>
                </SelectItem>
                <SelectItem value="in_person">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    In Person
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {interviewType === 'video' && (
            <div>
              <Label htmlFor="meeting-link">Meeting Link</Label>
              <Input
                id="meeting-link"
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          )}

          {interviewType === 'in_person' && (
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="School address or meeting room"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions or information for the candidate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Sending...' : 'Send Interview Invite'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
