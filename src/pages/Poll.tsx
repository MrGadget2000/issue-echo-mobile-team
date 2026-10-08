import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, BarChart3, Loader2, Vote } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type PollState = {
  week_start: string;
  question: string | null;
  my_score: number | null;
  counts: Record<string, number> | null;
  total: number | null;
};

const Poll = () => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [poll, setPoll] = useState<PollState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_current_poll');
    if (error) toast({ title: 'Could not load poll', description: error.message, variant: 'destructive' });
    setPoll((data as unknown as PollState) ?? null);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const submitVote = async () => {
    if (!selected) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('cast_poll_vote', { _score: selected });
    setSubmitting(false);
    if (error) return toast({ title: 'Vote failed', description: error.message, variant: 'destructive' });
    toast({ title: data ? 'Thanks for voting!' : 'You have already voted this week' });
    load();
  };

  const saveQuestion = async () => {
    const q = newQuestion.trim();
    if (q.length < 3) return;
    const { error } = await supabase.rpc('set_poll_question', { _question: q });
    if (error) return toast({ title: 'Could not save question', description: error.message, variant: 'destructive' });
    toast({ title: 'Poll question updated for this week' });
    setNewQuestion('');
    load();
  };

  const chartData = Array.from({ length: 10 }, (_, i) => ({
    score: String(i + 1),
    votes: poll?.counts?.[String(i + 1)] ?? 0,
  }));
  const total = poll?.total ?? 0;
  const average = total > 0 ? chartData.reduce((s, d) => s + Number(d.score) * d.votes, 0) / total : 0;
  const showResults = poll?.counts != null;
  const weekLabel = poll ? new Date(poll.week_start + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Team Poll</h1>
          <p className="text-muted-foreground">One vote per person each week</p>
        </div>
      </header>
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Open Issues</Link>
          <Link to="/closed" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <Archive className="h-4 w-4" /> Closed Issues
          </Link>
          <span className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-2">
            <Vote className="h-4 w-4" /> Poll
          </span>
          {isAdmin && (
            <Link to="/reports" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Reports
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading poll...
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardDescription>Week starting Monday {weekLabel}</CardDescription>
                <CardTitle className="text-xl">{poll?.question ?? 'No poll question has been set yet.'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {poll?.question && poll.my_score == null && (
                  <>
                    <p className="text-sm text-muted-foreground">1 = not at all, 10 = extremely</p>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <Button key={n} variant={selected === n ? 'default' : 'outline'} onClick={() => setSelected(n)}>
                          {n}
                        </Button>
                      ))}
                    </div>
                    <Button onClick={submitVote} disabled={!selected || submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Submit vote
                    </Button>
                  </>
                )}
                {poll?.my_score != null && (
                  <p className="text-sm">You voted <span className="font-semibold text-primary">{poll.my_score}</span> this week. You can vote again next Monday.</p>
                )}
                {showResults && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {total} {total === 1 ? 'vote' : 'votes'} · average {average.toFixed(1)}
                    </p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="score" stroke="hsl(var(--muted-foreground))" />
                          <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {!showResults && poll?.question && (
                  <p className="text-xs text-muted-foreground">Results appear once you've voted.</p>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Set this week's question</CardTitle>
                  <CardDescription>If not changed, last week's question carries over.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Input value={newQuestion} maxLength={300} placeholder="e.g. How busy do you feel this week?" onChange={(e) => setNewQuestion(e.target.value)} />
                  <Button onClick={saveQuestion} disabled={newQuestion.trim().length < 3}>Save</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Poll;
