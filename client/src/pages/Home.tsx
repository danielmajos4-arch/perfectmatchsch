import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { Briefcase, MessageCircle, Search } from 'lucide-react';
import { HeroSearch } from '@/components/HeroSearch';
import { TrustBadges } from '@/components/TrustBadges';
// Images moved to public folder for Vercel deployment
const featuresImageUrl = '/images/features.png';
// Hero video - continuously playing background video (like Fiverr)
const heroVideoUrl = '/videos/hero-video.mp4';

export default function Home() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Handle video loading and autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      // Video loaded successfully, ensure it plays
      video.play().catch((err) => {
        console.warn('Video autoplay prevented:', err);
      });
    };

    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  return (
    <Layout>
    <div className="min-h-screen bg-background dark:bg-background">
        {/* Hero Section - Mobile optimized */}
        <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <section className="relative min-h-[420px] xs:min-h-[480px] sm:min-h-[550px] md:min-h-[650px] lg:min-h-[750px] flex items-center overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl">
            {/* Background Video with Overlay */}
            <div className="absolute inset-0 overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl bg-background dark:bg-background">
              {/* Hero Video - Autoplay, Loop, Muted (like Fiverr) */}
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                preload="auto"
                aria-label="Hero background video"
              >
                <source src={heroVideoUrl} type="video/mp4" />
              </video>
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/70 dark:from-black/50 dark:via-black/40 dark:to-black/50"></div>
            </div>
              
            {/* Content Container - Mobile first */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12 lg:py-16">
              <div className="max-w-5xl">
                {/* Headline - Responsive text sizing */}
                <div className="space-y-2 sm:space-y-3 md:space-y-4 mb-5 sm:mb-6 md:mb-8 lg:mb-10">
                  <p className="text-xs sm:text-sm md:text-base font-semibold text-white/95 mb-2 sm:mb-3 drop-shadow-lg">
                    NEW: Mission-Aligned Matching
                  </p>
                  <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-white drop-shadow-2xl">
                    <span className="block mb-1 sm:mb-2 md:mb-3 tracking-tight">
                      FIND YOUR
                    </span>
                    <span className="block bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
                      Perfect Match 
                    </span>
        </h1>
        </div>

                {/* Search Component - Responsive padding */}
                <div className="bg-gray-900/95 dark:bg-gray-950/95 backdrop-blur-md border border-gray-700/70 dark:border-gray-600/50 rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 shadow-2xl ring-1 ring-gray-800/50 dark:ring-gray-700/50">
                  <HeroSearch />
                  
                  {/* Trust Badges - Below Search */}
                  <div className="mt-3 sm:mt-4 md:mt-6 pt-3 sm:pt-4 md:pt-6 border-t border-gray-700/50 dark:border-gray-600/50">
                    <TrustBadges />
                  </div>
                </div>

                {/* Quick Action Buttons - Touch friendly */}
                <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 mt-5 sm:mt-6 md:mt-8">
                  <Link href="/role-selection" className="flex-1 xs:flex-none">
                    <Button size="lg" className="h-12 sm:h-14 px-6 sm:px-8 font-semibold w-full xs:w-auto bg-primary hover:bg-primary/90 shadow-lg text-base active:scale-[0.98] touch-manipulation" data-testid="button-get-started">
              Get Started
                    </Button>
                  </Link>
          <Link href="/login" className="flex-1 xs:flex-none">
                  <Button
                    variant="outline"
                    size="lg"
                      className="h-12 sm:h-14 px-6 sm:px-8 font-semibold w-full xs:w-auto border-white/40 text-white hover:bg-white/10 hover:text-white hover:border-white/60 text-base active:scale-[0.98] touch-manipulation"
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

      {/* Features - Responsive grid */}
      <div className="px-3 sm:px-4 py-12 sm:py-16 md:py-24 bg-muted/50 dark:bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-foreground dark:text-foreground mb-8 sm:mb-12 px-2">
            Why Choose PerfectMatchSchools?
          </h2>
            
            {/* Image Section - Responsive */}
            <div className="mb-8 sm:mb-12 flex justify-center px-2">
              <img 
                src={featuresImageUrl} 
                alt="Why Choose PerfectMatchSchools" 
                className="max-w-full h-auto rounded-lg shadow-lg"
                loading="lazy"
              />
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <Card className="p-5 sm:p-6 md:p-8 text-center card-hover border-border/50 shadow-sm hover:shadow-medium transition-all duration-300">
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                  <Search className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                Find the Perfect Match
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Browse hundreds of teaching positions tailored to your expertise and preferences
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 text-center card-hover border-border/50 shadow-sm hover:shadow-medium transition-all duration-300">
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                  <Briefcase className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                Easy Applications
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Apply to positions with just a few clicks and track your application status
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 text-center card-hover border-border/50 shadow-sm hover:shadow-medium transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                  <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                Direct Communication
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Chat directly with schools and build meaningful connections
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section - Mobile optimized */}
      <div className="px-4 sm:px-6 py-12 sm:py-16 md:py-24 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground dark:text-foreground mb-3 sm:mb-4">
          Ready to Find Your Dream Teaching Position?
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground dark:text-muted-foreground mb-6 sm:mb-8">
          Join 1,000+ educators who have found their perfect match
        </p>
          <Link href="/role-selection">
          <Button size="lg" className="h-12 sm:h-14 px-6 sm:px-8 font-medium text-base w-full xs:w-auto active:scale-[0.98] touch-manipulation" data-testid="button-join-now">
            Join Now - It's Free
          </Button>
        </Link>
      </div>
    </div>
    </Layout>
  );
}
