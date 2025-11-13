import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApplicationModal } from '@/components/ApplicationModal';
import { ApplicationWizard } from '@/components/ApplicationWizard';
import { MapPin, DollarSign, Briefcase, Clock, Building2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateConversation } from '@/lib/conversationService';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Job } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

export default function JobDetail() {
  const [, params] = useRoute('/jobs/:id');
  const [, setLocation] = useLocation();
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [useWizard, setUseWizard] = useState(true); // Use wizard by default

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['/api/jobs', params?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', params?.id)
        .single();

      if (error) throw error;
      return data as Job;
    },
    enabled: !!params?.id,
  });

  const { toast } = useToast();
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Get school user_id from job (job.school_id is already a user_id)
  const schoolUserId = job?.school_id;

  // Mutation to start conversation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !schoolUserId) throw new Error('Missing user information');
      const result = await getOrCreateConversation(user.id, schoolUserId, job?.id);
      return result.conversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', user?.id] });
      setLocation(`/messages?conversation=${conversation.id}`);
      toast({
        title: 'Conversation started!',
        description: 'You can now message the school.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to start conversation',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-card border border-card-border rounded-xl" />
            <div className="h-96 bg-card border border-card-border rounded-xl" />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!job) {
    return (
      <AuthenticatedLayout>
        <div className="px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Job not found</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  const isTeacher = user?.user_metadata?.role === 'teacher';

  return (
    <AuthenticatedLayout>
      <div className="px-4 md:px-8 py-6 md:py-12 max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8 mb-8 lg:mb-0">
            {/* Header - Mobile First */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                {job.school_logo ? (
                  <img
                    src={job.school_logo}
                    alt={job.school_name}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-semibold text-primary">
                      {job.school_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 break-words">
                    {job.title}
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground mb-3">{job.school_name}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full text-xs sm:text-sm">
                      {job.subject}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full text-xs sm:text-sm">
                      {job.grade_level}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full text-xs sm:text-sm">
                      {job.job_type}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">{job.salary}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span>{job.job_type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span>Posted {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4">Job Description</h2>
              <div className="prose max-w-none text-foreground text-sm sm:text-base">
                <p className="whitespace-pre-line leading-relaxed">{job.description}</p>
              </div>
            </Card>

            {/* Requirements */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4">Requirements</h2>
              <div className="prose max-w-none text-foreground text-sm sm:text-base">
                <p className="whitespace-pre-line leading-relaxed">{job.requirements}</p>
              </div>
            </Card>

            {/* Benefits */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4">Benefits</h2>
              <div className="prose max-w-none text-foreground text-sm sm:text-base">
                <p className="whitespace-pre-line leading-relaxed">{job.benefits}</p>
              </div>
            </Card>
          </div>

          {/* Sidebar - Hidden on mobile (use fixed bottom button instead) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Apply Button */}
              {isTeacher && (
                <div className="space-y-3">
                <Button
                  className="w-full h-12 font-medium"
                  onClick={() => setShowApplicationModal(true)}
                  data-testid="button-apply"
                >
                  Apply for this Position
                </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 font-medium gap-2"
                    onClick={() => startConversationMutation.mutate()}
                    disabled={startConversationMutation.isPending || !schoolUserId}
                    data-testid="button-message-school"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {startConversationMutation.isPending ? 'Starting...' : 'Message School'}
                  </Button>
                </div>
              )}

              {/* School Info */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-foreground">About the School</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-foreground">School:</span>
                    <span className="text-muted-foreground ml-2">{job.school_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Location:</span>
                    <span className="text-muted-foreground ml-2">{job.location}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Apply Button - Fixed at bottom */}
        {isTeacher && (
          <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-40">
            <div className="max-w-6xl mx-auto flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 font-medium gap-2"
                onClick={() => startConversationMutation.mutate()}
                disabled={startConversationMutation.isPending || !schoolUserId}
                data-testid="button-message-school-mobile"
              >
                <MessageCircle className="h-5 w-5" />
                {startConversationMutation.isPending ? 'Starting...' : 'Message'}
              </Button>
              <Button
                className="flex-1 h-12 font-medium"
                onClick={() => setShowApplicationModal(true)}
                data-testid="button-apply-mobile"
              >
                Apply Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Application Modal/Wizard */}
      {showApplicationModal && (
        useWizard ? (
          <ApplicationWizard
            job={job}
            isOpen={showApplicationModal}
            onClose={() => setShowApplicationModal(false)}
          />
        ) : (
          <ApplicationModal
            job={job}
            isOpen={showApplicationModal}
            onClose={() => setShowApplicationModal(false)}
          />
        )
      )}
    </AuthenticatedLayout>
  );
}
