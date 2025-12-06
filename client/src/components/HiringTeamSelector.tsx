import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { X, Plus, User, Shield, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export interface TeamMember {
    email: string;
    role: 'hiring_manager' | 'reviewer' | 'observer';
    user_id?: string; // Optional if invited by email but not yet linked
    id?: string; // DB ID if saved
}

interface HiringTeamSelectorProps {
    jobId?: string; // Optional, if editing existing job
    initialMembers?: TeamMember[];
    onChange: (members: TeamMember[]) => void;
}

export function HiringTeamSelector({ jobId, initialMembers = [], onChange }: HiringTeamSelectorProps) {
    const { toast } = useToast();
    const [members, setMembers] = useState<TeamMember[]>(initialMembers);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'hiring_manager' | 'reviewer' | 'observer'>('reviewer');
    const [isAdding, setIsAdding] = useState(false);

    // If we have a jobId, we might want to fetch existing members if not provided
    // But for the wizard, we usually pass state down. 
    // We'll assume the parent controls state via onChange.

    const handleAddMember = async () => {
        if (!email || !email.includes('@')) {
            toast({ title: 'Invalid email', variant: 'destructive' });
            return;
        }

        if (members.some(m => m.email === email)) {
            toast({ title: 'User already added', variant: 'destructive' });
            return;
        }

        setIsAdding(true);

        // Try to find user by email to get their ID
        // Note: In Supabase, you can't query auth.users directly from client usually.
        // We might need an Edge Function or RPC. 
        // For now, we'll check the 'schools' or 'teachers' table if they are users?
        // Or just store the email and resolve it later.
        // Ideally, we'd have a 'users' public profile table.

        // Let's assume we can add them by email and the backend handles the rest or we just store email.
        // For the UI, we just add them to the list.

        const newMember: TeamMember = {
            email,
            role,
        };

        const newMembers = [...members, newMember];
        setMembers(newMembers);
        onChange(newMembers);

        setEmail('');
        setIsAdding(false);
    };

    const removeMember = (emailToRemove: string) => {
        const newMembers = members.filter(m => m.email !== emailToRemove);
        setMembers(newMembers);
        onChange(newMembers);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="grid grid-cols-[1fr,150px,auto] gap-3 items-end">
                    <div className="space-y-2">
                        <Label>Add Team Member by Email</Label>
                        <Input
                            placeholder="colleague@school.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                                <SelectItem value="reviewer">Reviewer</SelectItem>
                                <SelectItem value="observer">Observer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAddMember} disabled={isAdding}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                    <p><strong>Hiring Manager:</strong> Full access, can make offers.</p>
                    <p><strong>Reviewer:</strong> Can view candidates and comment, but cannot see salary or make offers.</p>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Current Team</Label>
                {members.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic p-4 border rounded-md bg-muted/50 text-center">
                        No team members added yet. You will be the only one with access.
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {members.map((member) => (
                            <div key={member.email} className="flex items-center justify-between p-3 border rounded-md bg-card">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{member.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="text-sm font-medium">{member.email}</div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {member.role === 'hiring_manager' && <Shield className="h-3 w-3 mr-1" />}
                                                {member.role === 'reviewer' && <Eye className="h-3 w-3 mr-1" />}
                                                {member.role.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeMember(member.email)}>
                                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
