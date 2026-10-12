import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type TeamResult = { id: string; name: string; total: number; average: number | null; answers: string[]; counts: Record<string, number> };
export function PollTeamResults({ pollId, type, historical = false, refreshKey = 0 }: { pollId: string; type: 'numeric' | 'choice' | 'text'; historical?: boolean; refreshKey?: number }) {
  const [rows, setRows] = useState<TeamResult[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void supabase.rpc('get_poll_team_results', { _poll_id: pollId, _historical: historical }).then(({ data, error: failure }) => {
      if (!active) return;
      setError(failure?.message ?? '');
      setRows(Array.isArray(data) ? data as unknown as TeamResult[] : []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [pollId, historical, refreshKey]);
  const team = rows.find((row) => row.id === selected) ?? rows[0];
  const chart = type === 'numeric' ? Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), votes: team?.counts[String(i + 1)] ?? 0 })) : Object.entries(team?.counts ?? {}).map(([label, votes]) => ({ label, votes }));
  return <section aria-label="Poll results by team" className="mt-4 space-y-3 border-t pt-4">
    <h3 className="font-semibold">Results by Team</h3>
    {loading ? <p className="text-sm text-muted-foreground">Loading team results…</p> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No team responses yet.</p> : <>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Team</th><th>Responses</th><th>{type === 'numeric' ? 'Average' : type === 'choice' ? 'Most selected' : 'Text responses'}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b"><td className="py-2 pr-3">{row.name}</td><td>{row.total}</td><td>{type === 'numeric' ? row.average?.toFixed(1) ?? '—' : type === 'choice' ? Object.entries(row.counts).sort((a, b) => b[1] - a[1]).filter((entry, _, all) => entry[1] === all[0]?.[1]).map(([answer, n]) => `${answer} (${n})`).join(', ') : row.answers.length}</td></tr>)}</tbody></table></div>
      <p className="text-xs text-muted-foreground">Team at submission. Parent-team totals include subteams; rows overlap.</p>
      <Select value={team?.id ?? ''} onValueChange={setSelected}><SelectTrigger aria-label="Poll result team"><SelectValue /></SelectTrigger><SelectContent>{rows.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}</SelectContent></Select>
      {type === 'text' ? <ul className="space-y-2">{team?.answers.map((answer, index) => <li key={index} className="break-words rounded border bg-muted/40 p-2 text-sm">{answer}</li>)}</ul> : <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" /><YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" /><Tooltip /><Bar dataKey="votes" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>}
    </>}
  </section>;
}