import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ManualCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    schoolId: string;
}

export function ManualCandidateModal({ isOpen, onClose, jobId, schoolId }: ManualCandidateModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');

    const uploadMutation = useMutation({
        mutationFn: async () => {
            // 1. Check if teacher exists by email
            let teacherId: string;

            const { data: existingUser } = await supabase
                .from('teachers')
                .select('user_id')
                .eq('email', email)
                .maybeSingle();

            if (existingUser) {
                teacherId = existingUser.user_id;
            } else {
                // 2. Create "shadow" user/teacher if not exists
                // Note: In a real auth system we might not want to create a full auth user yet,
                // but for this schema we need a user_id for the teacher table.
                // We'll create a placeholder teacher profile. 
                // Ideally we'd have a separate 'candidates' table for non-users, but sticking to schema:

                // For now, we'll assume we can't easily create an auth.user without them signing up.
                // So we might need to create a "placeholder" teacher record if the schema allows user_id to be nullable?
                // Checking schema... teacher.user_id is UUID NOT NULL.
                // This is a blocker for "shadow" candidates unless we have a way to generate a user_id.
                // Workaround: We will generate a UUID for the user_id but NOT create an auth.users record.
                // This relies on foreign key constraints. If user_id references auth.users, we can't do this.

                // Let's check if we can insert into teachers without a valid auth.users ID.
                // If FK constraint exists, we can't.
                // Alternative: We create a "manual_candidates" table? No, we want them in the same pipeline.

                // Solution for MVP: We will create a dummy auth user via an Edge Function or just fail if we can't.
                // Actually, let's try to find if there's a 'candidates' table or similar.
                // The schema has 'job_candidates' view but it joins teachers.

                // CRITICAL: If we can't create a teacher without an auth user, we can't support manual add easily 
                // without changing schema to allow nullable user_id or separate candidates table.
                // Let's assume for now we can't create a new teacher record without a user.
                // WAIT! We can use the `auth.signUp` to create a user with a dummy password?
                // That sends an email though.

                // Let's try to see if we can just insert into applications with a made-up teacher_id?
                // Likely not due to FK.

                // STRATEGY: We will create a new user with a temporary password and mark them as "invited".
                // Or better, just use a random UUID and hope the FK constraint isn't enforced on the client side insert?
                // No, Postgres will enforce it.

                // Let's try to create a user via supabase.auth.signUp (admin API would be better but we are client).
                // We'll create a user with a random password.

                const tempPassword = uuidv4();
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password: tempPassword,
                    options: {
                        data: {
                            full_name: `${firstName} ${lastName}`,
                            role: 'teacher',
                            is_manual_add: true,
                        }
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error('Failed to create user');

                teacherId = authData.user.id;

                // Create teacher profile
                const { error: profileError } = await supabase
                    .from('teachers')
                    .insert({
                        user_id: teacherId,
                        full_name: `${firstName} ${lastName}`,
                        email,
                        phone,
                        years_experience: '0', // Default
                        subjects: [],
                        grade_levels: [],
                        profile_complete: false,
                    });

                if (profileError) throw profileError;
            }

            // 3. Upload resume if provided
            let resumeUrl = null;
            if (resumeFile) {
                const fileExt = resumeFile.name.split('.').pop();
                const fileName = `${teacherId}/${uuidv4()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('resumes')
                    .upload(fileName, resumeFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('resumes')
                    .getPublicUrl(fileName);

                resumeUrl = publicUrl;

                // Update teacher profile with resume
                await supabase
                    .from('teachers')
                    .update({ resume_url: resumeUrl })
                    .eq('user_id', teacherId);
            }

            // 4. Create Application
            const { data: application, error: appError } = await supabase
                .from('applications')
                .insert({
                    job_id: jobId,
                    teacher_id: teacherId,
                    cover_letter: notes || 'Manually added by school',
                    status: 'new', // Default to new
                })
                .select()
                .single();

            if (appError) {
                if (appError.code === '23505') throw new Error('This candidate has already applied to this job.');
                throw appError;
            }

            return application;
        },
        onSuccess: () => {
            toast({
                title: 'Candidate added',
                description: 'The candidate has been successfully added to the pipeline.',
            });
            queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
            onClose();
            // Reset form
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setNotes('');
            setResumeFile(null);
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to add candidate',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !email) {
            toast({
                title: 'Missing fields',
                description: 'Please fill in name and email.',
                variant: 'destructive',
            });
            return;
        }
        uploadMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Candidate Manually</DialogTitle>
                    <DialogDescription>
                        Add a candidate to this job pipeline. If they don't have an account, one will be created.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Jane"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jane@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="resume">Resume (PDF)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="resume"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Initial Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any initial notes about this candidate..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={uploadMutation.isPending}>
                            {uploadMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add Candidate'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
