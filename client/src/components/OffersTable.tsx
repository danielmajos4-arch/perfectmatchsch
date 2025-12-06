import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getOffersBySchool, getOfferStatusInfo } from '@/lib/offerService';
import { formatDistanceToNow } from 'date-fns';
import { Gift } from 'lucide-react';

interface OffersTableProps {
    schoolId: string;
}

export function OffersTable({ schoolId }: OffersTableProps) {
    const { data: offers, isLoading } = useQuery({
        queryKey: ['school-offers', schoolId],
        queryFn: () => getOffersBySchool(schoolId),
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    if (!offers || offers.length === 0) {
        return (
            <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Offers Yet</h3>
                <p className="text-muted-foreground">
                    Offers you send to candidates will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {offers.map((offer: any) => {
                        const statusInfo = getOfferStatusInfo(offer);
                        return (
                            <TableRow key={offer.id}>
                                <TableCell className="font-medium">
                                    {offer.application?.teacher?.full_name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                    {offer.application?.job?.title || 'Unknown Job'}
                                </TableCell>
                                <TableCell>
                                    {offer.salary_amount ? `$${offer.salary_amount.toLocaleString()}` : 'Not specified'}
                                </TableCell>
                                <TableCell>
                                    {offer.start_date || 'TBD'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        offer.status === 'accepted' ? 'default' :
                                            offer.status === 'declined' ? 'destructive' :
                                                'secondary'
                                    }>
                                        <Gift className="h-3 w-3 mr-1" />
                                        {statusInfo.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
