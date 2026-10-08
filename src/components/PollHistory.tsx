import { Fragment, useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Vote } from 'lucide-react';

type Week = {
  week: string;
  label: string;
  question: string;
  votes: { userId: string; name: string; score: number }[];
  average: number;
};

export function PollHistory() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [q, v, p] = await Promise.all([
        supabase.from('poll_questions').select('week_start, question').order('week_start'),
        supabase.from('poll_votes').select('week_start, user_id, score'),
        supabase.from('profiles').select('user_id, display_name'),
      ]);
      const names = new Map((p.data ?? []).map((r) => [r.user_id, r.display_name ?? 'Unknown']));
      const questions = q.data ?? [];
      const byWeek = new Map<string, Week['votes']>();
      (v.data ?? []).forEach((r) => {
        const list = byWeek.get(r.week_start) ?? [];
        list.push({ userId: r.user_id, name: names.get(r.user_id) ?? 'Unknown', score: r.score });
        byWeek.set(r.week_start, list);
      });
      const allWeeks = Array.from(new Set([...questions.map((x) => x.week_start), ...byWeek.keys()])).sort();
      const result = allWeeks.map((week) => {
        const question = [...questions].reverse().find((x) => x.week_start <= week)?.question ?? '—';
        const votes = (byWeek.get(week) ?? []).sort((a, b) => b.score - a.score);
        const average = votes.length ? votes.reduce((s, x) => s + x.score, 0) / votes.length : 0;
        const label = new Date(week + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
        return { week, label, question, votes, average: Number(average.toFixed(1)) };
      });
      setWeeks(result);
    })();
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Vote className="h-5 w-5" /> Weekly Poll History</CardTitle>
        <CardDescription>Average score (1–10) per week, with who voted.</CardDescription>
      </CardHeader>
      <CardContent>
        {weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No poll results yet.</p>
        ) : (
          <>
            <div className="h-56 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="average" name="Average" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Week of</th><th>Question</th><th>Votes</th><th>Avg</th><th></th>
                </tr>
              </thead>
              <tbody>
                {[...weeks].reverse().map((w) => (
                  <Fragment key={w.week}>
                    <tr className="border-b">
                      <td className="py-2 whitespace-nowrap">{w.label}</td>
                      <td className="pr-2">{w.question}</td>
                      <td>{w.votes.length}</td>
                      <td>{w.votes.length ? w.average : '—'}</td>
                      <td className="text-right">
                        {w.votes.length > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => setOpen(open === w.week ? null : w.week)}>
                            {open === w.week ? 'Hide' : 'Voters'}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {open === w.week && (
                      <tr className="border-b bg-muted/40">
                        <td colSpan={5} className="py-2 px-2">
                          <div className="flex flex-wrap gap-2">
                            {w.votes.map((x) => (
                              <span key={x.userId} className="rounded border bg-card px-2 py-1 text-xs">
                                {x.name}: <span className="font-semibold">{x.score}</span>
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
