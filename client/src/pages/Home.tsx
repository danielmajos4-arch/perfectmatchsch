import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GraduationCap, Briefcase, MessageCircle, Search } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="px-4 py-16 md:py-24 max-w-6xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <GraduationCap className="h-16 w-16 md:h-20 md:w-20 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
          PerfectMatchSchools
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Connecting passionate educators with outstanding schools
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 font-medium w-full md:w-auto" data-testid="button-get-started">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 font-medium w-full md:w-auto"
              data-testid="button-sign-in"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-4 py-16 md:py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Why Choose PerfectMatchSchools?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Search className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Find the Perfect Match
              </h3>
              <p className="text-muted-foreground">
                Browse hundreds of teaching positions tailored to your expertise and preferences
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Easy Applications
              </h3>
              <p className="text-muted-foreground">
                Apply to positions with just a few clicks and track your application status
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Direct Communication
              </h3>
              <p className="text-muted-foreground">
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
        <Link href="/register">
          <Button size="lg" className="h-12 px-8 font-medium" data-testid="button-join-now">
            Join Now - It's Free
          </Button>
        </Link>
      </div>
    </div>
  );
}
