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
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs sm:text-sm">Candidate</TableHead>
                            <TableHead className="text-xs sm:text-sm">Job Title</TableHead>
                            <TableHead className="text-xs sm:text-sm">Salary</TableHead>
                            <TableHead className="text-xs sm:text-sm">Start Date</TableHead>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm">Sent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {offers.map((offer: any) => {
                            const statusInfo = getOfferStatusInfo(offer);
                            return (
                                <TableRow key={offer.id}>
                                    <TableCell className="font-medium text-xs sm:text-sm">
                                        {offer.application?.teacher?.full_name || 'Unknown'}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">
                                        {offer.application?.job?.title || 'Unknown Job'}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">
                                        {offer.salary_amount ? `$${offer.salary_amount.toLocaleString()}` : 'Not specified'}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">
                                        {offer.start_date || 'TBD'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            offer.status === 'accepted' ? 'default' :
                                                offer.status === 'declined' ? 'destructive' :
                                                    'secondary'
                                        } className="text-xs">
                                            <Gift className="h-3 w-3 mr-1" />
                                            {statusInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {offers.map((offer: any) => {
                    const statusInfo = getOfferStatusInfo(offer);
                    return (
                        <div key={offer.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm mb-1 break-words">
                                        {offer.application?.teacher?.full_name || 'Unknown'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {offer.application?.job?.title || 'Unknown Job'}
                                    </p>
                                </div>
                                <Badge variant={
                                    offer.status === 'accepted' ? 'default' :
                                        offer.status === 'declined' ? 'destructive' :
                                            'secondary'
                                } className="text-xs flex-shrink-0">
                                    <Gift className="h-3 w-3 mr-1" />
                                    {statusInfo.label}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-muted-foreground mb-0.5">Salary</p>
                                    <p className="font-medium">
                                        {offer.salary_amount ? `$${offer.salary_amount.toLocaleString()}` : 'Not specified'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-0.5">Start Date</p>
                                    <p className="font-medium">{offer.start_date || 'TBD'}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                    Sent {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
