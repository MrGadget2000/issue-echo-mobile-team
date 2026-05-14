import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, X, Trash2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileRow {
  user_id: string;
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  approved?: boolean | null;
}

interface AuditRow {
  id: string;
  issue_title: string;
  issue_description: string | null;
  deleted_by_email: string | null;
  examples_count: number;
  votes_count: number;
  created_at: string;
}

export function AdminPanel({ currentUserId, onChange }: { currentUserId: string; onChange?: () => void }) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<ProfileRow[]>([]);
  const [nonAdmins, setNonAdmins] = useState<ProfileRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: roles }, { data: profiles }, { data: audit }] = await Promise.all([
      supabase.from('user_roles').select('user_id').eq('role', 'admin'),
      supabase.from('profiles').select('user_id, display_name, email, avatar_url, approved'),
      supabase
        .from('deletion_audit_log')
        .select('id, issue_title, issue_description, deleted_by_email, examples_count, votes_count, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    const adminIds = new Set((roles ?? []).map((r: any) => r.user_id));
    const all = (profiles ?? []) as ProfileRow[];
    setAdmins(all.filter((p) => adminIds.has(p.user_id)));
    setNonAdmins(
      all
        .filter((p) => !adminIds.has(p.user_id))
        .sort((a, b) => (a.display_name ?? a.email ?? '').localeCompare(b.display_name ?? b.email ?? ''))
    );
    setAuditLog((audit ?? []) as AuditRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const grantByEmail = async (target: string) => {
    if (!target.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc('grant_admin_by_email', { _email: target.trim() });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not grant admin', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Admin granted', description: `${target.trim()} is now an admin.` });
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

  const setApproval = async (userId: string, approved: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc('set_user_approved', { _user_id: userId, _approved: approved });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not update approval', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: approved ? 'User approved' : 'Approval revoked' });
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
      <CardContent className="space-y-6">
        <div>
          <div className="flex gap-2">
            <Input
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <Button onClick={() => grantByEmail(email)} disabled={busy || !email.trim()}>
              <UserPlus className="h-4 w-4 mr-1" />
              Make admin
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The user must have signed in at least once before you can promote them.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Current admins ({admins.length})</h3>
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
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Signed-in users ({nonAdmins.length})</h3>
          {nonAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other users have signed in yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {nonAdmins.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.display_name ?? ''} className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(u.display_name ?? u.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{u.display_name ?? u.email}</div>
                      {u.email && u.email !== u.display_name && (
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => u.email && grantByEmail(u.email)}
                    disabled={busy || !u.email}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Promote
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Deletion audit log ({auditLog.length})
          </h3>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues have been deleted yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {auditLog.map((row) => (
                <div key={row.id} className="p-3 bg-muted/30 rounded-lg text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{row.issue_title}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Deleted by {row.deleted_by_email ?? 'unknown'} · {row.examples_count} example
                    {row.examples_count === 1 ? '' : 's'} · {row.votes_count} vote
                    {row.votes_count === 1 ? '' : 's'}
                  </div>
                  {row.issue_description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {row.issue_description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
