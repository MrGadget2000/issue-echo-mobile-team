import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, LogOut, ShieldCheck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ApprovalState = 'unknown' | 'approved' | 'pending';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { toast } = useToast();
  const [approval, setApproval] = useState<ApprovalState>('unknown');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        setApproval('unknown');
        return;
      }
      setChecking(true);
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('approved').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
      ]);
      if (cancelled) return;
      const isAdmin = (roles ?? []).some((r: any) => r.role === 'admin');
      const approved = isAdmin || !!profile?.approved;
      setApproval(approved ? 'approved' : 'pending');
      setChecking(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSignIn = async () => {
    const result = await signInWithGoogle();
    if (result?.error) {
      toast({ title: 'Sign-in failed', description: result.error.message, variant: 'destructive' });
    }
  };

  if (loading || (user && approval === 'unknown') || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-6">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Sign in required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This workspace is private. Please sign in with your Google account. An admin will need to
              approve your access before you can view issues.
            </p>
            <Button onClick={handleSignIn} className="w-full bg-gradient-primary">
              <LogIn className="h-4 w-4 mr-2" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approval === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Waiting for admin approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You're signed in as <span className="font-medium text-foreground">{user.email}</span>, but
              your account hasn't been approved yet. An admin will grant access shortly. You can refresh
              this page once they confirm.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                Check again
              </Button>
              <Button variant="ghost" onClick={signOut} className="flex-1">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
