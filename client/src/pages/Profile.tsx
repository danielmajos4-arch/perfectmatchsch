import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, LogOut, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    setLocation('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout showMobileNav>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Profile Card */}
        <Card className="p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                {user?.user_metadata?.full_name ? getInitials(user.user_metadata.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {user?.user_metadata?.full_name || 'User'}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Badge variant="secondary" className="rounded-full capitalize">
                  {user?.user_metadata?.role || 'User'}
                </Badge>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Full Name</span>
              <span className="text-sm text-muted-foreground">
                {user?.user_metadata?.full_name || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Email</span>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-foreground">Account Type</span>
              <Badge variant="secondary" className="rounded-full capitalize">
                {user?.user_metadata?.role || 'User'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            variant="destructive"
            className="w-full h-12 gap-2"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </Button>
        </div>
      </div>
    </Layout>
  );
}
