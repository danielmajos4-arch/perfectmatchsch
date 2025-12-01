/**
 * Admin Login Page
 * 
 * Secret admin-only login page
 * Only accessible via hidden keyboard shortcut (Shift+Cmd+A)
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, role, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!authLoading && user && role === 'admin') {
      setLocation('/admin/dashboard');
    }
  }, [user, role, authLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Login failed');
      }

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        // Sign out if we can't verify role
        await supabase.auth.signOut();
        throw new Error('Failed to verify access');
      }

      if (userData.role !== 'admin') {
        // Sign out if not admin
        await supabase.auth.signOut();
        setError('Access denied. Admin privileges required.');
        return;
      }

      // Success - redirect to admin dashboard
      setLocation('/admin/dashboard');
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render login form if already authenticated as admin
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="h-8 w-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gray-800 rounded-full">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl text-gray-100">Admin Access</CardTitle>
            <CardDescription className="text-gray-500">
              Restricted area. Authorized personnel only.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-950/50 border-red-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-gray-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Access Admin Panel
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setLocation('/')}
              className="text-sm text-gray-600 hover:text-gray-500 transition-colors"
            >
              ← Return to main site
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

