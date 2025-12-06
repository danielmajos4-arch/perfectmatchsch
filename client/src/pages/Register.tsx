import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const logoUrl = '/images/logo.png';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, InfoIcon } from 'lucide-react';
import { withTimeout, getAuthErrorMessage } from '@/lib/authUtils';
import { useAuth } from '@/contexts/AuthContext';

// Email domain validation
const BLOCKED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'yandex.com',
  'zoho.com',
  'live.com',
  'msn.com',
  'yahoo.co.uk',
  'googlemail.com',
  'me.com',
  'mac.com',
];

const ALLOWED_EDU_DOMAINS = [
  '.edu',
  '.edu.ng',
  '.ac.uk',
  '.edu.au',
  '.ac.za',
  '.edu.pk',
  '.ac.in',
  '.edu.gh',
  '.ac.nz',
  '.edu.my',
];

const validateSchoolEmail = (email: string): { valid: boolean; message?: string; isEduDomain?: boolean } => {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    return { valid: false, message: 'Invalid email format' };
  }

  // Check if blocked personal domain
  if (BLOCKED_DOMAINS.includes(domain)) {
    return {
      valid: false,
      message: 'Schools must use an institutional email address. Personal emails (Gmail, Yahoo, Outlook, etc.) are not allowed. Please use your school\'s official email domain.'
    };
  }

  // Check if educational domain (auto-approved)
  const isEduDomain = ALLOWED_EDU_DOMAINS.some(eduDomain => domain.endsWith(eduDomain));

  if (isEduDomain) {
    return { valid: true, isEduDomain: true }; // Educational domain - auto-approved
  }

  // Other domains - allowed but will require manual approval
  return {
    valid: true,
    isEduDomain: false,
    message: 'Your account will be reviewed before you can post jobs. This usually takes 24-48 hours.'
  };
};


export default function Register() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
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

    // Additional validation for school emails
    if (formData.role === 'school') {
      const emailValidation = validateSchoolEmail(formData.email);

      if (!emailValidation.valid) {
        toast({
          title: 'Invalid email domain',
          description: emailValidation.message,
          variant: 'destructive',
        });
        return;
      }

      // Show info message if manual approval needed
      if (emailValidation.message && !emailValidation.isEduDomain) {
        setInfoMessage(emailValidation.message);
      } else {
        setInfoMessage(null);
      }
    }

    setIsLoading(true);
    console.log('[Register] Starting signup process...', { email: formData.email, role: formData.role });

    try {
      // 1. Sign up the user
      console.log('[Register] Calling supabase.auth.signUp...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // Disable magic link, use OTP
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      });

      if (authError) {
        console.error('[Register] Signup error:', authError);
        throw authError;
      }

      console.log('[Register] Signup successful, redirecting to verify-email');

      // Store registration data in sessionStorage to pass to verify-email page
      // This avoids dependency on auth state which can cause race conditions
      sessionStorage.setItem('pendingVerification', JSON.stringify({
        email: formData.email,
        role: formData.role
      }));

      // Navigate to verify-email page
      // The user is already signed in from signUp, so VerifyEmail can access the session
      window.history.replaceState({ usr: { email: formData.email, role: formData.role } }, '', '/verify-email');
      setLocation('/verify-email');

    } catch (error: any) {
      console.error('[Register] Registration error:', error);
      toast({
        title: 'Registration failed',
        description: getAuthErrorMessage(error),
        variant: 'destructive',
      });
      setIsLoading(false); // Only set loading to false on error
    }
    // Do NOT set loading to false on success, to prevent any interference
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
            Join thousands of educators and schools
          </p>
        </div>

        <Card className="p-8 shadow-medium border-border/50">
          <CardHeader className="space-y-2 p-0 mb-8">
            <CardTitle className="text-3xl font-bold">Create an account</CardTitle>
            <CardDescription className="text-base">Enter your information to get started</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {infoMessage && (
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <InfoIcon className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  {infoMessage}
                </AlertDescription>
              </Alert>
            )}

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
                    Please use an official school email address (not Gmail, Yahoo, etc.)
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
