import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Save, Loader2, Camera, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { uploadProfileImage } from '@/lib/storageService';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { School, InsertSchool } from '@shared/schema';
import { isSchoolProfileComplete, SchoolProfile as CompletionProfile } from '@/lib/profileUtils';

interface SchoolProfileEditorProps {
    school: School;
    userId: string;
    onSave?: () => void;
}

const SCHOOL_TYPES = ['Public', 'Private', 'Charter', 'Magnet', 'International', 'Religious', 'Other'];

export function SchoolProfileEditor({ school, userId, onSave }: SchoolProfileEditorProps) {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        school_name: school.school_name || '',
        school_type: school.school_type || '',
        location: school.location || '',
        description: school.description || '',
        website: school.website || '',
        logo_url: school.logo_url || '',
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (data: Partial<InsertSchool>) => {
            const { error, data: updatedData } = await supabase
                .from('schools')
                .update(data)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return updatedData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/school-profile', userId] });
            toast({
                title: 'Profile updated!',
                description: 'School profile has been saved successfully.',
            });
            setIsEditing(false);
            onSave?.();
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to update profile',
                description: error.message || 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        const result = await uploadProfileImage(userId, file);

        if (result.error) {
            toast({
                title: 'Upload failed',
                description: result.error,
                variant: 'destructive',
            });
        } else if (result.url) {
            setFormData({ ...formData, logo_url: result.url });
            // Auto-save the image URL
            updateProfileMutation.mutate({ logo_url: result.url });
            toast({
                title: 'Logo uploaded!',
                description: 'School logo has been updated.',
            });
        }

        setIsUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = () => {
        const completionPayload: CompletionProfile = {
            school_name: formData.school_name?.trim() || null,
            school_type: formData.school_type || null,
            location: formData.location?.trim() || null,
            description: formData.description?.trim() || null,
            website: formData.website?.trim() || null,
            logo_url: formData.logo_url || null,
        };

        const profileComplete = isSchoolProfileComplete(completionPayload);

        updateProfileMutation.mutate({
            school_name: formData.school_name,
            school_type: formData.school_type,
            location: formData.location,
            description: formData.description,
            website: formData.website || null,
            logo_url: formData.logo_url || null,
            profile_complete: profileComplete,
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary to-purple-600" />
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <Building2 className="h-6 w-6 text-primary" />
                            School Information
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                            Manage your school's public profile and details
                        </CardDescription>
                    </div>
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} variant="outline">
                            Edit Profile
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData({
                                        school_name: school.school_name || '',
                                        school_type: school.school_type || '',
                                        location: school.location || '',
                                        description: school.description || '',
                                        website: school.website || '',
                                        logo_url: school.logo_url || '',
                                    });
                                }}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={updateProfileMutation.isPending}
                            >
                                {updateProfileMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* School Logo */}
                <div className="flex items-center gap-8 p-6 bg-muted/30 rounded-xl border border-border/50">
                    <div className="relative group">
                        <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-border/50 transition-transform group-hover:scale-105">
                            <AvatarImage src={formData.logo_url || undefined} alt={formData.school_name} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                                {getInitials(formData.school_name || 'School')}
                            </AvatarFallback>
                        </Avatar>
                        {isEditing && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingImage}
                                className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                                title="Upload school logo"
                            >
                                {isUploadingImage ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Camera className="h-5 w-5" />
                                )}
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-lg">School Logo</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            {isEditing
                                ? 'Upload a high-quality logo to make your school stand out. Recommended size: 400x400px.'
                                : 'Your school logo appears on your profile and job listings.'}
                        </p>
                        {formData.logo_url && isEditing && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                                onClick={() => {
                                    setFormData({ ...formData, logo_url: '' });
                                }}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Remove Logo
                            </Button>
                        )}
                    </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="school_name" className="text-base">School Name <span className="text-destructive">*</span></Label>
                        {isEditing ? (
                            <Input
                                id="school_name"
                                value={formData.school_name}
                                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                required
                                className="h-11 text-base bg-background/50 focus:bg-background transition-colors"
                                placeholder="e.g. Springfield High School"
                            />
                        ) : (
                            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                <p className="text-base font-medium">{formData.school_name}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="school_type" className="text-base">School Type <span className="text-destructive">*</span></Label>
                        {isEditing ? (
                            <select
                                id="school_type"
                                value={formData.school_type}
                                onChange={(e) => setFormData({ ...formData, school_type: e.target.value })}
                                className="w-full h-11 px-3 rounded-md border border-input bg-background/50 focus:bg-background transition-colors text-base"
                                required
                            >
                                <option value="">Select Type...</option>
                                {SCHOOL_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                <Badge variant="secondary" className="rounded-full text-sm px-3 py-1">
                                    {formData.school_type || 'Not set'}
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="location" className="text-base">Location <span className="text-destructive">*</span></Label>
                        {isEditing ? (
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                                className="h-11 text-base bg-background/50 focus:bg-background transition-colors"
                                placeholder="City, State (e.g. San Francisco, CA)"
                            />
                        ) : (
                            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                <p className="text-base">{formData.location || 'Not set'}</p>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="website" className="text-base">Website</Label>
                        {isEditing ? (
                            <Input
                                id="website"
                                type="url"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                className="h-11 text-base bg-background/50 focus:bg-background transition-colors"
                                placeholder="https://www.myschool.edu"
                            />
                        ) : (
                            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                {formData.website ? (
                                    <a
                                        href={formData.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-base text-primary hover:underline font-medium"
                                    >
                                        {formData.website}
                                    </a>
                                ) : (
                                    <p className="text-base text-muted-foreground">Not set</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-base">About the School</Label>
                    {isEditing ? (
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Tell us about your school's mission, values, and culture..."
                            className="min-h-[150px] text-base bg-background/50 focus:bg-background transition-colors resize-y"
                            maxLength={1000}
                        />
                    ) : (
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 min-h-[100px]">
                            <p className="text-base whitespace-pre-wrap leading-relaxed">
                                {formData.description || 'No description added yet'}
                            </p>
                        </div>
                    )}
                    {isEditing && (
                        <p className="text-xs text-muted-foreground text-right">
                            {formData.description.length}/1000 characters
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
