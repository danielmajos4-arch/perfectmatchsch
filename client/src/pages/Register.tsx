import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logoUrl from '@assets/New logo-15_1762774603259.png';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function Register() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: '',
  });

  // Read role from URL query parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
     const intentParam = urlParams.get('intent');
    if (roleParam === 'teacher' || roleParam === 'school') {
      setFormData(prev => ({ ...prev, role: roleParam }));
    }
    if (intentParam) {
      setIntent(intentParam);
    }
  }, [location]);

  // Determine if role is locked (set from URL)
  const isRoleLocked = formData.role === 'teacher' || formData.role === 'school';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: 'Role required',
        description: 'Please select whether you are a teacher or school.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    // Optional: Warn schools about non-educational domains (but don't block)
    if (formData.role === 'school') {
      const educationalDomains = ['.edu', '.ac.', '.school', '.k12.'];
      const hasEducationalDomain = educationalDomains.some(domain => 
        formData.email.toLowerCase().includes(domain)
      );
      if (!hasEducationalDomain) {
        // Just a warning, not blocking
        console.log('School email does not appear to be from an educational domain');
      }
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      });

      // Only throw error if there's an actual backend error
      if (authError) {
        throw authError;
      }

      // If signup succeeded (user was created)
      if (authData.user) {
        // Show success message
        toast({
          title: 'Account created!',
          description: 'Welcome to PerfectMatchSchools. Please check your email to verify your account.',
        });

        // Redirect based on role and intent
        // Give a small delay to ensure toast is visible
        setTimeout(() => {
          if (formData.role === 'school') {
            if (intent === 'find-teachers' || intent === 'search') {
              // Schools coming from hero flow - send to school dashboard to find teachers
              setLocation('/school/dashboard');
            } else {
              // Default school onboarding flow
              setLocation('/onboarding/school');
            }
          } else if (formData.role === 'teacher') {
            if (intent === 'browse-schools' || intent === 'search') {
              // Teachers coming from hero flow - send directly to jobs to browse schools
              setLocation('/jobs');
            } else {
              // Default teacher onboarding flow
              setLocation('/onboarding/teacher');
            }
          } else {
            // Fallback to generic dashboard (which will redirect based on role)
            setLocation('/dashboard');
          }
        }, 500);
      } else {
        // This shouldn't happen, but handle it gracefully
        throw new Error('User creation failed. Please try again.');
      }
    } catch (error: any) {
      // Always show error to user if we catch an error
      // This means the backend signup failed
      const errorMessage = error?.message || 'Something went wrong. Please try again.';
      
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Log error for debugging
      console.error('Registration error:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="mb-4" data-testid="link-home">
            <img 
              src={logoUrl} 
              alt="PerfectMatchSchools" 
              className="h-28 w-auto drop-shadow-2xl" 
              style={{ 
                filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2)) brightness(1.35) contrast(1.55) saturate(2.1)',
                transform: 'scale(1.08)'
              }}
            />
          </Link>
          <p className="text-muted-foreground text-center">
            Join thousands of educators and schools
          </p>
        </div>

        <Card className="p-8">
          <CardHeader className="space-y-1 p-0 mb-6">
            <CardTitle className="text-2xl font-semibold">Create an account</CardTitle>
            <CardDescription>Enter your information to get started</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name/School Name Field - Conditional based on role */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  {formData.role === 'school' ? 'School Name' : 'Full Name'}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={
                    formData.role === 'school' 
                      ? 'Enter your school/institution name'
                      : 'Enter your full name'
                  }
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="h-12"
                  data-testid="input-fullname"
                />
              </div>

              {/* Email Field - Conditional label and placeholder based on role */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {formData.role === 'school' ? 'School Email' : 'Email'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={
                    formData.role === 'school'
                      ? 'admin@yourschool.edu'
                      : 'your.email@example.com'
                  }
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-12"
                  data-testid="input-email"
                />
                {formData.role === 'school' && (
                  <p className="text-xs text-muted-foreground">
                    Please use an official school email address
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password (min. 6 characters)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="h-12"
                  data-testid="input-password"
                />
              </div>

              {/* Role Field - Disabled if set from URL */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  I am a
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  required
                  disabled={isRoleLocked}
                >
                  <SelectTrigger className="h-12" data-testid="select-role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                  </SelectContent>
                </Select>
                {isRoleLocked && (
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {formData.role === 'school'
                        ? "You're signing up as a School to find teachers"
                        : "You're signing up as a Teacher to browse schools"}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 font-medium"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 p-0 mt-6">
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
                Sign in
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
