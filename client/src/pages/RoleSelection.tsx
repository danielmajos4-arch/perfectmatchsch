import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Building2, GraduationCap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
const logoUrl = '/images/logo.png';

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'school' | 'teacher' | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      setLocation(`/register?role=${selectedRole}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-4xl">
        {/* Logo */}
        <div className="flex justify-center mb-8 md:mb-12">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img
              src={logoUrl}
              alt="PerfectMatchSchools"
              className="h-16 md:h-20 w-auto drop-shadow-lg"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) brightness(1.3) contrast(1.5) saturate(2)',
              }}
            />
          </Link>
        </div>

        {/* Heading */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4">
            Join as a School or Teacher
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose how you'd like to use PerfectMatchSchools
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
          {/* School Card */}
          <Card
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === 'school'
                ? 'ring-2 ring-primary shadow-lg border-primary bg-primary/5'
                : 'hover:border-primary/50 border-2'
            }`}
            onClick={() => setSelectedRole('school')}
          >
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-xl transition-colors ${
                      selectedRole === 'school'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Building2 className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                      I'm a school
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Hiring for positions
                    </p>
                  </div>
                </div>
                {/* Radio Button Indicator */}
                <div
                  className={`flex items-center justify-center h-6 w-6 md:h-7 md:w-7 rounded-full border-2 transition-all ${
                    selectedRole === 'school'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40 bg-background'
                  }`}
                >
                  {selectedRole === 'school' && (
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Card */}
          <Card
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedRole === 'teacher'
                ? 'ring-2 ring-primary shadow-lg border-primary bg-primary/5'
                : 'hover:border-primary/50 border-2'
            }`}
            onClick={() => setSelectedRole('teacher')}
          >
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-xl transition-colors ${
                      selectedRole === 'teacher'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <GraduationCap className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                      I'm a teacher
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Looking for opportunities
                    </p>
                  </div>
                </div>
                {/* Radio Button Indicator */}
                <div
                  className={`flex items-center justify-center h-6 w-6 md:h-7 md:w-7 rounded-full border-2 transition-all ${
                    selectedRole === 'teacher'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40 bg-background'
                  }`}
                >
                  {selectedRole === 'teacher' && (
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="space-y-4">
          <Button
            onClick={handleContinue}
            disabled={!selectedRole}
            size="lg"
            className="w-full h-12 md:h-14 text-base md:text-lg font-semibold"
          >
            {selectedRole === 'school'
              ? 'Apply as a School'
              : selectedRole === 'teacher'
              ? 'Apply as a Teacher'
              : 'Continue'}
          </Button>

          {/* Login Link */}
          <p className="text-center text-sm md:text-base text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline transition-colors"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

