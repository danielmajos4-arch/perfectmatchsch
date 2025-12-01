import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { Briefcase, MessageCircle, Search, GraduationCap } from 'lucide-react';
import { PromotionalBanner } from '@/components/PromotionalBanner';
import { HeroSearch } from '@/components/HeroSearch';
import { TrustBadges } from '@/components/TrustBadges';
// Images moved to public folder for Vercel deployment
const logoUrl = '/images/logo.png';
const featuresImageUrl = 'https://placehold.co/800x600/4F46E5/FFFFFF?text=PerfectMatch+Schools';
const heroBackgroundImage = 'https://placehold.co/1920x1080/1E293B/FFFFFF?text=Find+Your+Perfect+Match';

export default function Home() {
  const [, setLocation] = useLocation();

  // Secret admin access: Shift + Cmd/Ctrl + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Shift + Cmd (Mac) or Shift + Ctrl (Windows) + A
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setLocation('/admin/login');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  return (
    <Layout>
    <div className="min-h-screen bg-background">
        {/* Promotional Banner */}
        <PromotionalBanner />

        {/* Hero Section - Upwork Style with Rounded Container */}
        <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <section className="relative min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:min-h-[800px] flex items-center overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
            {/* Background with Gradient (replacing image for deployment) */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              {/* Optional: Add pattern overlay for visual interest */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '40px 40px'
              }}></div>
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/50"></div>
        </div>

            {/* Content Container - Text Overlay with Rounded Container */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 lg:py-20">
              <div className="max-w-5xl">
                {/* Headline - Overlay on Background */}
                <div className="space-y-3 md:space-y-5 mb-6 md:mb-8 lg:mb-10">
                  <p className="text-sm md:text-base font-semibold text-white/95 mb-3 drop-shadow-lg">
                    NEW: Mission-Aligned Matching
                  </p>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] text-white drop-shadow-2xl">
                    <span className="block mb-2 md:mb-3 tracking-tight">
                      FIND YOUR
                    </span>
                    <span className="block bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent drop-shadow-lg">
                      Perfect Match 
                    </span>
        </h1>
                </div>

                {/* Search Component - Rounded Container like Upwork */}
                <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/70 rounded-2xl p-4 md:p-5 lg:p-6 xl:p-8 shadow-2xl ring-1 ring-gray-800/50">
                  <HeroSearch />
                  
                  {/* Trust Badges - Below Search */}
                  <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-700/50">
                    <TrustBadges />
                  </div>
                </div>

                {/* Quick Action Buttons - Below Search Container */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6 md:mt-8">
                  <Link href="/role-selection">
                    <Button size="lg" className="h-12 px-8 font-semibold w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg" data-testid="button-get-started">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              size="lg"
                      className="h-12 px-8 font-semibold w-full sm:w-auto border-white/40 text-white hover:bg-white/10 hover:text-white hover:border-white/60"
              data-testid="button-sign-in"
            >
              Sign In
            </Button>
          </Link>
        </div>
              </div>
            </div>
          </section>
      </div>

      {/* Features */}
      <div className="px-4 py-16 md:py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Why Choose PerfectMatchSchools?
          </h2>
            
            {/* Image Section */}
            <div className="mb-12 flex justify-center">
              <img 
                src={featuresImageUrl} 
                alt="Why Choose PerfectMatchSchools" 
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-8 text-center card-hover border-border/50 shadow-sm hover:shadow-medium transition-all duration-300">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                  <Search className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Find the Perfect Match
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Browse hundreds of teaching positions tailored to your expertise and preferences
              </p>
            </Card>

            <Card className="p-8 text-center card-hover border-border/50 shadow-sm hover:shadow-medium transition-all duration-300">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Easy Applications
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Apply to positions with just a few clicks and track your application status
              </p>
            </Card>

            <Card className="p-8 text-center card-hover border-border/50 shadow-sm hover:shadow-medium transition-all duration-300">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Direct Communication
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Chat directly with schools and build meaningful connections
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-4 py-16 md:py-24 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Ready to Find Your Dream Teaching Position?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Join 1,000+ educators who have found their perfect match
        </p>
          <Link href="/role-selection">
          <Button size="lg" className="h-12 px-8 font-medium" data-testid="button-join-now">
            Join Now - It's Free
          </Button>
        </Link>
      </div>
    </div>
    </Layout>
  );
}
