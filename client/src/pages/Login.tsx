import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
const logoUrl = '/images/logo.png';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { withTimeout, getAuthErrorMessage } from '@/lib/authUtils';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      setLocation('/dashboard');
    }
  }, [user, loading, setLocation]);

  // If user is authenticated, return null while redirect happens
  // Don't show a blocking "Redirecting..." spinner that can get stuck
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Wrap signInWithPassword with timeout to prevent hanging in PWA/offline mode
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        10000,
        'Sign in'
      );

      if (error) throw error;

      if (data.user) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        setLocation('/dashboard');
      }
    } catch (error: unknown) {
      toast({
        title: 'Login failed',
        description: getAuthErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="mb-6" data-testid="link-home">
            <img 
              src={logoUrl} 
              alt="PerfectMatchSchools" 
              className="h-32 w-auto drop-shadow-2xl" 
              style={{ 
                filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2)) brightness(1.35) contrast(1.55) saturate(2.1)',
                transform: 'scale(1.08)'
              }}
            />
          </Link>
          <p className="text-muted-foreground text-center text-base">
            Connect with teaching opportunities that match your passion
          </p>
        </div>

        <Card className="p-8 shadow-medium border-border/50">
          <CardHeader className="space-y-2 p-0 mb-8">
            <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-base">Enter your email to sign in to your account</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 font-medium"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 p-0 mt-6">
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
                Create account
              </Link>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Join 1,000+ educators finding their perfect teaching position
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
