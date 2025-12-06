import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, ExternalLink, Mail, User, Calendar, Building2, Globe, Phone, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PendingSchool {
    id: string;
    user_id: string;
    school_name: string;
    school_type: string;
    location: string;
    description: string;
    website: string | null;
    logo_url: string | null;
    approval_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    user: {
        email: string;
        full_name: string;
    };
}

export default function SchoolApprovals() {
    const { toast } = useToast();
    const [rejectingSchool, setRejectingSchool] = useState<PendingSchool | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [verificationNotes, setVerificationNotes] = useState('');

    // Fetch pending schools
    const { data: pendingSchools, isLoading } = useQuery<PendingSchool[]>({
        queryKey: ['/api/admin/pending-schools'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('schools')
                .select(`
          id,
          user_id,
          school_name,
          school_type,
         location,
          description,
          website,
          logo_url,
          approval_status,
          created_at,
          users!schools_user_id_fkey (
            email,
            full_name
          )
        `)
                .eq('approval_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching pending schools:', error);
                throw error;
            }

            // Transform the data to match our interface
            return (data || []).map((school: any) => ({
                ...school,
                user: {
                    email: school.users?.email || '',
                    full_name: school.users?.full_name || ''
                }
            }));
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    // Approve school mutation
    const approveMutation = useMutation({
        mutationFn: async ({ schoolId, notes, schoolData }: { schoolId: string; notes?: string; schoolData: PendingSchool }) => {
            const { error } = await supabase
                .from('schools')
                .update({
                    approval_status: 'approved',
                    approved_at: new Date().toISOString(),
                    verification_notes: notes || null,
                })
                .eq('id', schoolId);

            if (error) throw error;

            // Send approval email via Resend
            try {
                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: schoolData.user.email,
                        subject: '🎉 Your PerfectMatchSchools account is approved!',
                        html: `
              <h2>Congratulations, ${schoolData.school_name}!</h2>
              <p>Your school account has been approved and is now active.</p>
              
              <h3>You can now:</h3>
              <ul>
                <li>✅ Post unlimited job openings</li>
                <li>✅ Browse qualified teacher candidates</li>
                <li>✅ Message teachers directly</li>
                <li>✅ Manage applications in your dashboard</li>
              </ul>
              
              <p>
                <a href="${window.location.origin}/school/dashboard" 
                   style="background-color: #C41E68; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
                  Go to Dashboard
                </a>
              </p>
              
              <p>Ready to hire great teachers!</p>
              
              <p>Best regards,<br>The PerfectMatchSchools Team</p>
            `
                    })
                });
                console.log('[SchoolApprovals] Approval email sent successfully');
            } catch (emailError) {
                console.error('[SchoolApprovals] Failed to send approval email:', emailError);
                // Don't fail the approval if email fails
            }
        },
        onSuccess: () => {
            toast({
                title: 'School approved!',
                description: 'The school can now post jobs.',
            });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-schools'] });
            setVerificationNotes('');
        },
        onError: (error: any) => {
            toast({
                title: 'Approval failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Reject school mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ schoolId, reason, schoolData }: { schoolId: string; reason: string; schoolData: PendingSchool }) => {
            const { error } = await supabase
                .from('schools')
                .update({
                    approval_status: 'rejected',
                    rejected_at: new Date().toISOString(),
                    rejection_reason: reason,
                })
                .eq('id', schoolId);

            if (error) throw error;

            // Send rejection email via Resend
            try {
                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: schoolData.user.email,
                        subject: 'PerfectMatchSchools Account Update',
                        html: `
              <h2>Account Review Update</h2>
              <p>Thank you for your interest in PerfectMatchSchools.</p>
              
              <p>Unfortunately, we were unable to verify your school account at this time.</p>
              
              <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px; margin: 20px 0;">
                <strong>Reason:</strong> ${reason}
              </div>
              
              <p>If you believe this is an error or would like to provide additional documentation, please contact us at:</p>
              <p><a href="mailto:support@perfectmatchschools.com">support@perfectmatchschools.com</a></p>
              
              <p>Best regards,<br>The PerfectMatchSchools Team</p>
            `
                    })
                });
                console.log('[SchoolApprovals] Rejection email sent successfully');
            } catch (emailError) {
                console.error('[SchoolApprovals] Failed to send rejection email:', emailError);
                // Don't fail the rejection if email fails
            }
        },
        onSuccess: () => {
            toast({
                title: 'School rejected',
                description: 'The school has been notified.',
            });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-schools'] });
            setRejectingSchool(null);
            setRejectionReason('');
        },
        onError: (error: any) => {
            toast({
                title: 'Rejection failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleApprove = (school: PendingSchool) => {
        if (confirm(`Are you sure you want to approve "${school.school_name}"?`)) {
            approveMutation.mutate({ schoolId: school.id, notes: verificationNotes, schoolData: school });
        }
    };

    const handleReject = () => {
        if (!rejectionReason.trim()) {
            toast({
                title: 'Rejection reason required',
                description: 'Please provide a reason for rejecting this school.',
                variant: 'destructive',
            });
            return;
        }

        if (rejectingSchool) {
            rejectMutation.mutate({
                schoolId: rejectingSchool.id,
                reason: rejectionReason,
                schoolData: rejectingSchool,
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">School Approvals</h1>
                    <p className="text-muted-foreground">
                        Review and approve school registrations before they can post jobs
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending Approvals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{pendingSchools?.length || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pending Schools List */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="p-6">
                                    <div className="h-24 bg-muted rounded"></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : pendingSchools && pendingSchools.length > 0 ? (
                    <div className="space-y-4">
                        {pendingSchools.map((school) => (
                            <Card key={school.id} className="border-l-4 border-l-yellow-500">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Building2 className="h-6 w-6 text-primary" />
                                                <h3 className="text-xl font-bold">{school.school_name}</h3>
                                                <Badge variant="outline" className="text-xs">
                                                    {school.school_type}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {school.description}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="ml-4">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatDistanceToNow(new Date(school.created_at), { addSuffix: true })}
                                        </Badge>
                                    </div>

                                    {/* School Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-muted rounded-lg">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Contact:</span>
                                            <span>{school.user.full_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Email:</span>
                                            <span className="font-mono text-xs">{school.user.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium">📍 Location:</span>
                                            <span>{school.location}</span>
                                        </div>
                                        {school.website && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                                <a
                                                    href={school.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline flex items-center gap-1"
                                                >
                                                    Visit Website
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Registered:</span>
                                            <span>{new Date(school.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Verification Notes Input */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium mb-2 block">
                                            Verification Notes (Optional)
                                        </label>
                                        <Input
                                            placeholder="Add internal notes about this verification..."
                                            value={verificationNotes}
                                            onChange={(e) => setVerificationNotes(e.target.value)}
                                            className="text-sm"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => handleApprove(school)}
                                            disabled={approveMutation.isPending}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {approveMutation.isPending ? 'Approving...' : 'Approve School'}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                setRejectingSchool(school);
                                                setRejectionReason('');
                                            }}
                                            disabled={rejectMutation.isPending}
                                            className="flex-1"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject School
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                            <p className="text-muted-foreground">
                                There are no pending school approvals at the moment.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Reject Dialog */}
                <Dialog open={!!rejectingSchool} onOpenChange={() => setRejectingSchool(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject School Application</DialogTitle>
                            <DialogDescription>
                                Provide a reason for rejecting "{rejectingSchool?.school_name}". This will be sent to the school via email.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    This action cannot be undone. The school will be notified via email.
                                </AlertDescription>
                            </Alert>

                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Rejection Reason *
                                </label>
                                <Textarea
                                    placeholder="e.g., Unable to verify school legitimacy, suspicious email domain, incomplete information..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setRejectingSchool(null);
                                    setRejectionReason('');
                                }}
                                disabled={rejectMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                            >
                                {rejectMutation.isPending ? 'Rejecting...' : 'Reject School'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AuthenticatedLayout>
    );
}
