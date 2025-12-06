import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';

export default function VerifyEmail() {
    const [location, setLocation] = useLocation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locationState = (history.state as any)?.usr || {};
    const stateEmail = locationState.email;
    const stateRole = locationState.role;

    const [email, setEmail] = useState(stateEmail || '');
    const [role, setRole] = useState(stateRole || '');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        const initializeEmail = async () => {
            if (!email) {
                // First, try to read from sessionStorage (set during registration)
                const pendingData = sessionStorage.getItem('pendingVerification');
                if (pendingData) {
                    try {
                        const data = JSON.parse(pendingData);
                        console.log('[VerifyEmail] Found pending verification data:', data);
                        setEmail(data.email);
                        setRole(data.role);
                        // Don't remove yet - keep it until verification succeeds
                        return;
                    } catch (err) {
                        console.error('[VerifyEmail] Failed to parse pending verification data:', err);
                    }
                }

                // Fallback: try to get current user
                const { data } = await supabase.auth.getUser();
                if (data.user?.email) {
                    console.log('[VerifyEmail] Using current user email:', data.user.email);
                    setEmail(data.user.email);
                    setRole(data.user.user_metadata?.role || '');
                } else {
                    // No user found and no pending data, redirect to login
                    console.log('[VerifyEmail] No email found, redirecting to login');
                    setLocation('/login');
                }
            }
        };

        initializeEmail();
    }, [email, setLocation]);



    const handleVerify = async (token: string) => {
        if (token.length !== 6) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email',
            });

            if (error) throw error;

            // Clear pending verification data from sessionStorage
            sessionStorage.removeItem('pendingVerification');
            console.log('[VerifyEmail] Cleared pending verification data');

            // Send welcome email
            try {
                const { data: userData } = await supabase.auth.getUser();
                if (userData.user) {
                    const userRole = userData.user.user_metadata?.role || role;

                    await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: email,
                            subject: 'Welcome to PerfectMatchSchools! 🎉',
                            html: `
                <h2>Hi there!</h2>
                <p>Welcome to PerfectMatchSchools! We're excited to have you join our community.</p>
                
                ${userRole === 'teacher' ? `
                  <h3>Next steps:</h3>
                  <ul>
                    <li>✅ Complete your profile</li>
                    <li>✅ Take the teaching archetype quiz</li>
                    <li>✅ Browse open positions</li>
                    <li>✅ Start applying!</li>
                  </ul>
                ` : `
                  <h3>Next steps:</h3>
                  <ul>
                    <li>✅ Complete your school profile</li>
                    <li>✅ Post your first job</li>
                    <li>✅ Review qualified candidates</li>
                    <li>✅ Start hiring!</li>
                  </ul>
                `}
                
                <p>Need help? Reply to this email or visit our help center.</p>
                <p>Welcome aboard!<br>The PerfectMatchSchools Team</p>
                <hr>
                <p style="font-size: 12px; color: #666;">
                  Questions? Email us at support@perfectmatchschools.com
                </p>
              `
                        })
                    });
                }
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                // Don't block flow for email failure
            }

            toast({
                title: "Email verified!",
                description: "Redirecting to onboarding...",
            });

            // Redirect based on role
            const userRole = data.user?.user_metadata?.role || role;
            if (userRole === 'teacher') {
                setLocation('/onboarding/teacher');
            } else if (userRole === 'school') {
                setLocation('/onboarding/school');
            } else {
                setLocation('/dashboard');
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Verification failed",
                description: error.message || "Invalid code. Please try again.",
            });
            setOtp(''); // Clear OTP on error
        } finally {
            setIsLoading(false);
        }
    };

    const [canResend, setCanResend] = useState(false);
    const [countdown, setCountdown] = useState(60);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleResend = async () => {
        if (!canResend) return;

        setCanResend(false);
        setCountdown(60);

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email
            });

            if (error) {
                console.error('Resend failed:', error);
                // If rate limited, show longer countdown
                if (error.message.includes('429') || error.message.includes('rate')) {
                    setCountdown(300); // 5 minutes
                }
            } else {
                toast({
                    title: "Code sent!",
                    description: "Please check your email for a new verification code.",
                });
            }
        } catch (err) {
            console.error('Resend exception:', err);
        }
    };

    if (!email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Check your email</CardTitle>
                    <CardDescription className="text-center">
                        We sent a verification code to <span className="font-medium text-foreground">{email}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center">
                        <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={(value) => {
                                setOtp(value);
                                if (value.length === 6) {
                                    handleVerify(value);
                                }
                            }}
                            disabled={isLoading}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <div className="text-center text-sm">
                        <p className="text-muted-foreground mb-2">
                            Didn't receive the code?
                        </p>
                        <Button
                            variant="link"
                            className="p-0 h-auto font-normal"
                            onClick={handleResend}
                            disabled={!canResend || isLoading}
                        >
                            {!canResend
                                ? `Resend code in ${countdown}s`
                                : "Click to resend"}
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="flex justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
