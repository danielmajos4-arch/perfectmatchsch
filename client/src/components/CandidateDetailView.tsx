import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Star, Send, FileText, MessageSquare, History, User, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSchoolRole } from '@/hooks/useSchoolRole';
import { getOfferByApplication, getOfferStatusInfo } from '@/lib/offerService';
import { OfferModal } from './OfferModal';
import type { CandidateMatchView } from '@shared/matching';
import type { ApplicationComment, ApplicationRating } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface CandidateDetailViewProps {
    candidate: CandidateMatchView;
    isOpen: boolean;
    onClose: () => void;
}

export function CandidateDetailView({ candidate, isOpen, onClose }: CandidateDetailViewProps) {
    const { toast } = useToast();
    const [newComment, setNewComment] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [showOfferModal, setShowOfferModal] = useState(false);

    // Get user's role and permissions for this job
    const permissions = useSchoolRole(candidate.job_id);

    // Fetch existing offer
    const { data: existingOffer, refetch: refetchOffer } = useQuery({
        queryKey: ['offer', candidate.application_id],
        queryFn: () => getOfferByApplication(candidate.application_id!),
        enabled: !!candidate.application_id,
    });

    // Fetch comments
    const { data: comments } = useQuery<ApplicationComment[]>({
        queryKey: ['comments', candidate.application_id],
        queryFn: async () => {
            if (!candidate.application_id) return [];
            const { data, error } = await supabase
                .from('application_comments')
                .select(`
          *,
          user:user_id(email) 
        `) // Note: user_id joins to auth.users which might not be directly selectable depending on RLS/schema. 
                // If auth.users is not exposed, we might need to join to a public profiles table.
                // For now, assuming we can get basic info or just show "User".
                .eq('application_id', candidate.application_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as any[];
        },
        enabled: !!candidate.application_id,
    });

    // Fetch ratings
    const { data: ratings } = useQuery<ApplicationRating[]>({
        queryKey: ['ratings', candidate.application_id],
        queryFn: async () => {
            if (!candidate.application_id) return [];
            const { data, error } = await supabase
                .from('application_ratings')
                .select('*')
                .eq('application_id', candidate.application_id);

            if (error) throw error;
            return data as ApplicationRating[];
        },
        enabled: !!candidate.application_id,
    });

    const addCommentMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!candidate.application_id) throw new Error('No application ID');
            const { error } = await supabase
                .from('application_comments')
                .insert({
                    application_id: candidate.application_id,
                    user_id: (await supabase.auth.getUser()).data.user?.id!,
                    content,
                    visibility: 'team',
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', candidate.application_id] });
            setNewComment('');
            toast({ title: 'Comment added' });
        },
    });

    const addRatingMutation = useMutation({
        mutationFn: async (score: number) => {
            if (!candidate.application_id) throw new Error('No application ID');
            const { error } = await supabase
                .from('application_ratings')
                .insert({
                    application_id: candidate.application_id,
                    user_id: (await supabase.auth.getUser()).data.user?.id!,
                    category: 'overall',
                    score,
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ratings', candidate.application_id] });
            toast({ title: 'Rating submitted' });
        },
    });

    const averageRating = ratings?.length
        ? (ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length).toFixed(1)
        : 'N/A';

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={candidate.profile_photo_url || undefined} />
                                    <AvatarFallback>{candidate.teacher_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <DialogTitle className="text-2xl">{candidate.teacher_name}</DialogTitle>
                                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                        <Badge variant="outline">{candidate.teacher_archetype}</Badge>
                                        <span>•</span>
                                        <span>{candidate.teacher_location}</span>
                                        <span>•</span>
                                        <span>{candidate.years_experience} years exp</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-1">
                                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    <span className="text-xl font-bold">{averageRating}</span>
                                    <span className="text-sm text-muted-foreground">({ratings?.length || 0} reviews)</span>
                                </div>
                                <Badge variant={candidate.match_score >= 80 ? 'default' : 'secondary'}>
                                    {candidate.match_score}% Match
                                </Badge>
                                {existingOffer && (
                                    <Badge variant={existingOffer.status === 'accepted' ? 'default' : existingOffer.status === 'declined' ? 'destructive' : 'secondary'}>
                                        <Gift className="h-3 w-3 mr-1" />
                                        {getOfferStatusInfo(existingOffer).label}
                                    </Badge>
                                )}
                                {permissions.canMakeOffer && (
                                    <Button
                                        size="sm"
                                        onClick={() => setShowOfferModal(true)}
                                        className="mt-2"
                                    >
                                        <Gift className="h-4 w-4 mr-2" />
                                        {existingOffer ? 'Edit Offer' : 'Make Offer'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Panel: Resume & Details */}
                        <div className="flex-1 border-r flex flex-col">
                            <Tabs defaultValue="resume" className="flex-1 flex flex-col">
                                <div className="px-6 pt-4">
                                    <TabsList className="w-full justify-start">
                                        <TabsTrigger value="resume">Resume</TabsTrigger>
                                        <TabsTrigger value="details">Application Details</TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="resume" className="flex-1 p-0 m-0 h-full">
                                    {candidate.resume_url ? (
                                        <iframe
                                            src={candidate.resume_url}
                                            className="w-full h-full border-none bg-muted/20"
                                            title="Resume"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <FileText className="h-12 w-12 mb-2 opacity-20" />
                                            <p>No resume uploaded</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="details" className="flex-1 p-6 overflow-y-auto">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="font-semibold mb-2">Cover Letter</h3>
                                            <div className="p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                                                No cover letter available in this view.
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-2">Subjects</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {candidate.teacher_subjects.map((s, i) => (
                                                    <Badge key={i} variant="secondary">{s}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        {permissions.canViewSalary && (
                                            <div>
                                                <h3 className="font-semibold mb-2">Salary Expectations</h3>
                                                <div className="p-4 bg-muted/50 rounded-lg text-sm">
                                                    Information available to Hiring Managers only
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Right Panel: Collaboration */}
                        <div className="w-[350px] flex flex-col bg-muted/10">
                            <div className="p-4 border-b">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Team Discussion
                                </h3>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {comments?.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Team Member</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/90">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t bg-background space-y-4">
                                {/* Rating Input */}
                                {permissions.canRate && (
                                    <div className="flex items-center justify-center gap-2 pb-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => {
                                                    setRating(star);
                                                    addRatingMutation.mutate(star);
                                                }}
                                                className={`hover:scale-110 transition-transform ${star <= rating ? 'text-yellow-500' : 'text-muted-foreground/30'
                                                    }`}
                                            >
                                                <Star className={`h-6 w-6 ${star <= rating ? 'fill-current' : ''}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Comment Input */}
                                {permissions.canComment ? (
                                    <>
                                        <div className="flex gap-2">
                                            <Textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Add a comment..."
                                                className="min-h-[80px] resize-none"
                                            />
                                        </div>
                                        <Button
                                            className="w-full"
                                            size="sm"
                                            disabled={!newComment.trim() || addCommentMutation.isPending}
                                            onClick={() => addCommentMutation.mutate(newComment)}
                                        >
                                            <Send className="h-4 w-4 mr-2" />
                                            Post Comment
                                        </Button>
                                    </>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground p-4">
                                        You do not have permission to comment on this candidate.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Offer Modal */}
            <OfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                applicationId={candidate.application_id!}
                candidateName={candidate.teacher_name}
                existingOffer={existingOffer || undefined}
                onSuccess={() => {
                    refetchOffer();
                    setShowOfferModal(false);
                }}
            />
        </>
    );
}
