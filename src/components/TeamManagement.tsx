import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type Team = { id: string; name: string; parent_id: string | null };
type Person = { user_id: string; display_name: string | null };

export function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [memberships, setMemberships] = useState<Map<string, string>>(new Map());
  const [name, setName] = useState('');
  const [parent, setParent] = useState('none');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const load = useCallback(async () => {
    const [t, p, m] = await Promise.all([
      supabase.from('teams').select('id,name,parent_id').eq('active', true).order('name'),
      supabase.from('profiles').select('user_id,display_name').order('display_name'),
      supabase.from('team_memberships').select('user_id,team_id'),
    ]);
    const failure = t.error ?? p.error ?? m.error;
    setError(failure?.message ?? '');
    if (failure) return;
    setTeams(t.data ?? []); setPeople(p.data ?? []);
    setMemberships(new Map((m.data ?? []).map((row) => [row.user_id, row.team_id])));
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setEditing(null); setName(''); setParent('none'); };
  const save = async (archiveId?: string) => {
    setBusy(true);
    const { error: failure } = await supabase.rpc('manage_team', {
      _id: archiveId ?? editing, _name: name.trim(), _parent: archiveId ? null : parent === 'none' ? null : parent, _archive: Boolean(archiveId),
    });
    setBusy(false);
    if (failure) return toast({ title: 'Could not update team', description: failure.message, variant: 'destructive' });
    reset(); await load(); toast({ title: archiveId ? 'Team removed' : 'Team saved' });
  };
  const assign = async (userId: string, teamId: string) => {
    setBusy(true);
    const { error: failure } = await supabase.rpc('assign_team', { _user_id: userId, _team_id: teamId === 'none' ? null : teamId });
    setBusy(false);
    if (failure) return toast({ title: 'Could not assign team', description: failure.message, variant: 'destructive' });
    await load(); toast({ title: 'Team membership saved' });
  };
  return (
    <Card className="mt-6 bg-gradient-card shadow-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Team Management</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="space-y-1"><Label htmlFor="team-name">Team name</Label><Input id="team-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-1"><Label>Parent team</Label><Select value={parent} onValueChange={setParent}><SelectTrigger aria-label="Parent team"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No parent team</SelectItem>{teams.filter((team) => team.id !== editing).map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex gap-2"><Button disabled={busy || !name.trim()} type="submit"><Plus className="mr-2 h-4 w-4" />{editing ? 'Save team' : 'Add team'}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}</div>
        </form>
        <div className="divide-y">
          {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams yet.</p>}
          {teams.map((team) => <div key={team.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0"><p className="break-words font-medium">{team.name}</p><p className="text-xs text-muted-foreground">{team.parent_id ? `Rolls up to ${teams.find((t) => t.id === team.parent_id)?.name ?? 'Parent team'}` : 'Top-level team'} · {[...memberships.values()].filter((id) => id === team.id).length} members</p></div>
            <div className="flex shrink-0"><Button variant="ghost" size="icon" disabled={busy} aria-label={`Edit ${team.name}`} title="Edit team" onClick={() => { setEditing(team.id); setName(team.name); setParent(team.parent_id ?? 'none'); }}><Pencil className="h-4 w-4" /></Button>
              <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={busy} aria-label={`Remove ${team.name}`} title="Remove team"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {team.name}?</AlertDialogTitle><AlertDialogDescription>Members will become unassigned. Historical issues and poll answers keep their recorded team. Move or remove subteams first.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void save(team.id)}>Remove team</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </div>
          </div>)}
        </div>
        <div><h3 className="mb-2 font-semibold">People</h3><div className="max-h-96 space-y-2 overflow-y-auto">{people.map((person) => <div key={person.user_id} className="flex flex-col gap-2 border-b py-2 sm:flex-row sm:items-center sm:justify-between"><span className="break-words text-sm">{person.display_name ?? 'Unnamed user'}</span><Select value={memberships.get(person.user_id) ?? 'none'} disabled={busy} onValueChange={(value) => void assign(person.user_id, value)}><SelectTrigger className="w-full sm:w-64" aria-label={`Team for ${person.display_name ?? 'Unnamed user'}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent></Select></div>)}</div></div>
      </CardContent>
    </Card>
  );
}