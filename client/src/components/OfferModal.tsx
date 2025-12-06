import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { createOffer, updateOffer } from '@/lib/offerService';
import { Loader2 } from 'lucide-react';
import type { Offer } from '@shared/schema';

interface OfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId: string;
    candidateName: string;
    existingOffer?: Offer;
    onSuccess?: () => void;
}

export function OfferModal({
    isOpen,
    onClose,
    applicationId,
    candidateName,
    existingOffer,
    onSuccess
}: OfferModalProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        salary_amount: existingOffer?.salary_amount?.toString() || '',
        start_date: existingOffer?.start_date || '',
        benefits_summary: existingOffer?.benefits_summary || '',
        additional_terms: existingOffer?.additional_terms || '',
        expiration_date: existingOffer?.expiration_date || '',
    });

    const createOfferMutation = useMutation({
        mutationFn: async () => {
            const offerData = {
                application_id: applicationId,
                created_by: (await supabase.auth.getUser()).data.user?.id!,
                status: 'extended' as const,
                salary_amount: formData.salary_amount ? parseFloat(formData.salary_amount) : null,
                start_date: formData.start_date || null,
                benefits_summary: formData.benefits_summary || null,
                additional_terms: formData.additional_terms || null,
                expiration_date: formData.expiration_date || null,
                offer_letter_url: null,
            };

            if (existingOffer) {
                return updateOffer(existingOffer.id, offerData);
            } else {
                return createOffer(offerData);
            }
        },
        onSuccess: () => {
            toast({
                title: existingOffer ? 'Offer updated' : 'Offer sent',
                description: `Job offer has been ${existingOffer ? 'updated' : 'sent to'} ${candidateName}`,
            });
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: `Failed to ${existingOffer ? 'update' : 'send'} offer: ${error.message}`,
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createOfferMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {existingOffer ? 'Edit Job Offer' : 'Make Job Offer'} - {candidateName}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="salary">Salary Amount</Label>
                            <Input
                                id="salary"
                                type="number"
                                placeholder="e.g. 65000"
                                value={formData.salary_amount}
                                onChange={(e) => setFormData({ ...formData, salary_amount: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="benefits">Benefits Summary</Label>
                        <Textarea
                            id="benefits"
                            placeholder="Health insurance, 401k, PTO..."
                            value={formData.benefits_summary}
                            onChange={(e) => setFormData({ ...formData, benefits_summary: e.target.value })}
                            className="h-24"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="terms">Additional Terms</Label>
                        <Textarea
                            id="terms"
                            placeholder="Probation period, relocation assistance..."
                            value={formData.additional_terms}
                            onChange={(e) => setFormData({ ...formData, additional_terms: e.target.value })}
                            className="h-24"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expiration">Offer Expiration Date (Optional)</Label>
                        <Input
                            id="expiration"
                            type="date"
                            value={formData.expiration_date}
                            onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createOfferMutation.isPending}>
                            {createOfferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {existingOffer ? 'Update Offer' : 'Send Offer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
