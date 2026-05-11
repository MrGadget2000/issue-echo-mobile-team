import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminRow {
  user_id: string;
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export function AdminPanel({ currentUserId, onChange }: { currentUserId: string; onChange?: () => void }) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) {
      setAdmins([]);
      return;
    }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, avatar_url')
      .in('user_id', ids);
    setAdmins((profiles ?? []) as AdminRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const grant = async () => {
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc('grant_admin_by_email', { _email: email.trim() });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not grant admin', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Admin granted', description: `${email.trim()} is now an admin.` });
    setEmail('');
    await load();
    onChange?.();
  };

  const revoke = async (userId: string) => {
    setBusy(true);
    const { error } = await supabase.rpc('revoke_admin', { _user_id: userId });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not revoke', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Admin revoked' });
    await load();
    onChange?.();
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <Button onClick={grant} disabled={busy || !email.trim()}>
            <UserPlus className="h-4 w-4 mr-1" />
            Make admin
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The user must have signed in at least once before you can promote them.
        </p>

        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.user_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt={a.display_name ?? ''} className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {(a.display_name ?? a.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm">{a.display_name ?? a.email}</div>
                  {a.email && a.email !== a.display_name && (
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  )}
                </div>
                {a.user_id === currentUserId && (
                  <Badge variant="outline" className="ml-2">You</Badge>
                )}
              </div>
              {a.user_id !== currentUserId && (
                <Button variant="ghost" size="sm" onClick={() => revoke(a.user_id)} disabled={busy}>
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
