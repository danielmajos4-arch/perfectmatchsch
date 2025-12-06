import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    const [, setLocation] = useLocation();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: undefined, // We'll use OTP flow
            });

            if (error) throw error;

            toast({
                title: "Reset code sent",
                description: "Check your email for the password reset code.",
            });

            // Navigate to reset password page with email in state
            // Note: wouter doesn't support state in navigate, so we'll pass it via URL or context if needed, 
            // but for now let's just navigate and ask user to confirm email or rely on them knowing it.
            // Actually, passing via history state is possible with window.history.pushState but wouter might override.
            // Let's use a query param or just navigate and let ResetPassword handle it (maybe re-ask email or use local storage).
            // A cleaner way for this flow is to pass email as query param.
            setLocation(`/reset-password?email=${encodeURIComponent(email)}`);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Forgot Password</CardTitle>
                    <CardDescription>
                        Enter your email address and we'll send you a code to reset your password.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending code...
                                </>
                            ) : (
                                "Send Reset Code"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setLocation('/login')}
                            type="button"
                            disabled={isLoading}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
