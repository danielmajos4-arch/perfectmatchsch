import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Mail, CheckSquare } from 'lucide-react';
const logoUrl = '/images/logo.png';

export default function PendingApproval() {
    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Link href="/">
                        <img
                            src={logoUrl}
                            alt="PerfectMatchSchools"
                            className="h-20 w-auto drop-shadow-2xl"
                            style={{
                                filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2)) brightness(1.35) contrast(1.55) saturate(2.1)',
                                transform: 'scale(1.08)'
                            }}
                        />
                    </Link>
                </div>

                {/* Main Card */}
                <Card className="border-2 border-yellow-200 shadow-lg">
                    <CardContent className="p-8 text-center">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-yellow-100 p-6 rounded-full">
                                <Clock className="h-16 w-16 text-yellow-600" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl font-bold mb-4 text-foreground">
                            Account Under Review
                        </h1>

                        {/* Description */}
                        <p className="text-lg text-muted-foreground mb-8">
                            Thank you for creating a PerfectMatchSchools account!
                            Your school profile is currently under review.
                        </p>

                        {/* Info Box */}
                        <div className="bg-muted rounded-lg p-6 mb-8 text-left">
                            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <CheckSquare className="h-5 w-5 text-primary" />
                                What happens next?
                            </h2>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                                    <span>Our team will verify your school information</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                                    <span>Review typically takes 24-48 hours</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                                    <span>You'll receive an email when your account is approved</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                                    <span>Once approved, you can post unlimited job openings</span>
                                </li>
                            </ul>
                        </div>

                        {/* Support Contact */}
                        <Alert className="border-blue-200 bg-blue-50">
                            <Mail className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-900">
                                <p className="text-sm">
                                    Questions? Email us at{' '}
                                    <a
                                        href="mailto:support@perfectmatchschools.com"
                                        className="text-blue-600 font-medium hover:underline"
                                    >
                                        support@perfectmatchschools.com
                                    </a>
                                </p>
                            </AlertDescription>
                        </Alert>

                        {/* Back to Home */}
                        <div className="mt-8">
                            <Link href="/">
                                <a className="text-primary hover:underline text-sm font-medium">
                                    ← Back to Home
                                </a>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
