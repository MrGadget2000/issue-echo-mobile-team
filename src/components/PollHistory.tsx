import { Fragment, useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Vote } from 'lucide-react';

type PollType = 'numeric' | 'choice' | 'text';
type PollRow = {
  id: string;
  question: string;
  type: PollType;
  started: string;
  closed: string | null;
  votes: { key: string; name: string; value: string }[];
  summary: string;
  average: number | null;
};

const TYPE_LABEL: Record<PollType, string> = { numeric: '1–10', choice: 'List', text: 'Free text' };
const fmt = (d: string) => new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });

export function PollHistory() {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [q, v, p] = await Promise.all([
        supabase.from('poll_questions').select('id, question, poll_type, created_at, closed_at').order('created_at'),
        supabase.from('poll_votes').select('id, poll_id, user_id, score, answer, week_start'),
        supabase.from('profiles').select('user_id, display_name'),
      ]);
      const names = new Map((p.data ?? []).map((r) => [r.user_id, r.display_name ?? 'Unknown']));
      const rows: PollRow[] = ((q.data ?? []) as any[]).map((poll) => {
        const type = (poll.poll_type ?? 'numeric') as PollType;
        const votes = ((v.data ?? []) as any[])
          .filter((x) => x.poll_id === poll.id)
          .map((x) => ({ key: x.id, name: names.get(x.user_id) ?? 'Unknown', value: x.score != null ? String(x.score) : x.answer ?? '' , score: x.score as number | null }));
        let average: number | null = null;
        let summary = '—';
        if (votes.length) {
          if (type === 'numeric') {
            const s = votes.filter((x) => x.score != null);
            average = s.length ? Number((s.reduce((a, x) => a + (x.score ?? 0), 0) / s.length).toFixed(1)) : null;
            summary = average != null ? `avg ${average}` : '—';
          } else if (type === 'choice') {
            const c = new Map<string, number>();
            votes.forEach((x) => c.set(x.value, (c.get(x.value) ?? 0) + 1));
            const [top, n] = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
            summary = `Top: ${top} (${n})`;
          } else summary = `${votes.length} responses`;
        }
        return { id: poll.id, question: poll.question, type, started: poll.created_at, closed: poll.closed_at, votes, summary, average };
      });
      setPolls(rows);
    })();
  }, []);

  const chartData = polls.filter((p) => p.average != null).map((p) => ({ label: fmt(p.started), average: p.average }));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Vote className="h-5 w-5" /> Poll History</CardTitle>
        <CardDescription>Each poll with its question, dates and results. The graph shows averages for 1–10 polls.</CardDescription>
      </CardHeader>
      <CardContent>
        {polls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No poll results yet.</p>
        ) : (
          <>
            {chartData.length > 0 && (
              <div className="h-56 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="average" name="Average" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Dates</th><th>Question</th><th>Type</th><th>Votes</th><th>Result</th><th></th>
                </tr>
              </thead>
              <tbody>
                {[...polls].reverse().map((w) => (
                  <Fragment key={w.id}>
                    <tr className="border-b">
                      <td className="py-2 whitespace-nowrap pr-2">{fmt(w.started)} – {w.closed ? fmt(w.closed) : 'open'}</td>
                      <td className="pr-2">{w.question}</td>
                      <td className="pr-2 whitespace-nowrap">{TYPE_LABEL[w.type]}</td>
                      <td>{w.votes.length}</td>
                      <td className="pr-2">{w.summary}</td>
                      <td className="text-right">
                        {w.votes.length > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => setOpen(open === w.id ? null : w.id)}>
                            {open === w.id ? 'Hide' : 'Voters'}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {open === w.id && (
                      <tr className="border-b bg-muted/40">
                        <td colSpan={6} className="py-2 px-2">
                          <div className="flex flex-wrap gap-2">
                            {w.votes.map((x) => (
                              <span key={x.key} className="rounded border bg-card px-2 py-1 text-xs">
                                {x.name}: <span className="font-semibold">{x.value}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
