import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, BarChart3, Loader2, Vote, Plus, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type PollType = 'numeric' | 'choice' | 'text';
type PollState = {
  poll_id: string | null;
  week_start: string;
  started_at: string | null;
  question: string | null;
  poll_type: PollType;
  options: string[] | null;
  has_voted: boolean;
  my_score: number | null;
  my_answer: string | null;
  counts: Record<string, number> | null;
  total: number | null;
  answers: string[] | null;
};

export const POLL_TYPE_LABELS: Record<PollType, string> = {
  numeric: 'Numeric (1 to 10)',
  choice: 'From a list',
  text: 'Free text',
};

const Poll = () => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [poll, setPoll] = useState<PollState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newType, setNewType] = useState<PollType>('numeric');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_current_poll');
    if (error) toast({ title: 'Could not load poll', description: error.message, variant: 'destructive' });
    setPoll((data as unknown as PollState) ?? null);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const type: PollType = poll?.poll_type ?? 'numeric';
  const canSubmit =
    (type === 'numeric' && selected != null) ||
    (type === 'choice' && choice != null) ||
    (type === 'text' && text.trim().length > 0);

  const submitVote = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('cast_poll_answer', {
      _score: type === 'numeric' ? selected : null,
      _answer: type === 'choice' ? choice : type === 'text' ? text.trim() : null,
    } as any);
    setSubmitting(false);
    if (error) return toast({ title: 'Vote failed', description: error.message, variant: 'destructive' });
    toast({ title: data ? 'Thanks for voting!' : 'You have already voted on this poll' });
    setText(''); setChoice(null); setSelected(null);
    load();
  };

  const cleanOptions = newOptions.map((o) => o.trim()).filter(Boolean);
  const canStart = newQuestion.trim().length >= 3 && (newType !== 'choice' || new Set(cleanOptions).size >= 2);

  const startPoll = async () => {
    if (!canStart) return;
    const { error } = await supabase.rpc('start_poll', {
      _question: newQuestion.trim(),
      _type: newType,
      _options: newType === 'choice' ? cleanOptions : null,
    } as any);
    if (error) return toast({ title: 'Could not start poll', description: error.message, variant: 'destructive' });
    toast({ title: 'New poll started', description: 'The previous poll was closed and saved to history.' });
    setNewQuestion(''); setNewOptions(['', '']); setNewType('numeric');
    load();
  };

  const closePoll = async () => {
    const { error } = await supabase.rpc('close_current_poll');
    if (error) return toast({ title: 'Could not close poll', description: error.message, variant: 'destructive' });
    toast({ title: 'Poll closed', description: 'Results saved to history.' });
    load();
  };

  const chartData =
    type === 'numeric'
      ? Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), votes: poll?.counts?.[String(i + 1)] ?? 0 }))
      : (poll?.options ?? []).map((o) => ({ label: o, votes: poll?.counts?.[o] ?? 0 }));
  const total = poll?.total ?? 0;
  const average = type === 'numeric' && total > 0 ? chartData.reduce((s, d) => s + Number(d.label) * d.votes, 0) / total : 0;
  const showResults = poll?.counts != null;
  const startedLabel = poll?.started_at
    ? new Date(poll.started_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

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
                <CardDescription>
                  {poll?.question ? `${POLL_TYPE_LABELS[type]} · started ${startedLabel}` : 'No open poll'}
                </CardDescription>
                <CardTitle className="text-xl">{poll?.question ?? 'There is no open poll right now.'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {poll?.question && !poll.has_voted && (
                  <>
                    {type === 'numeric' && (
                      <>
                        <p className="text-sm text-muted-foreground">1 = not at all, 10 = extremely</p>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <Button key={n} variant={selected === n ? 'default' : 'outline'} onClick={() => setSelected(n)}>{n}</Button>
                          ))}
                        </div>
                      </>
                    )}
                    {type === 'choice' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(poll.options ?? []).map((o) => (
                          <Button key={o} variant={choice === o ? 'default' : 'outline'} className="justify-start h-auto py-2 whitespace-normal text-left" onClick={() => setChoice(o)}>{o}</Button>
                        ))}
                      </div>
                    )}
                    {type === 'text' && (
                      <Textarea value={text} maxLength={1000} placeholder="Type your answer..." onChange={(e) => setText(e.target.value)} />
                    )}
                    <Button onClick={submitVote} disabled={!canSubmit || submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Submit vote
                    </Button>
                  </>
                )}
                {poll?.has_voted && (
                  <p className="text-sm">
                    You answered <span className="font-semibold text-primary">{poll.my_score ?? poll.my_answer}</span>. You can vote again next Monday or when a new poll starts.
                  </p>
                )}
                {showResults && type !== 'text' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {total} {total === 1 ? 'vote' : 'votes'}{type === 'numeric' && ` · average ${average.toFixed(1)}`}
                    </p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                          <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {showResults && type === 'text' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{total} {total === 1 ? 'response' : 'responses'}</p>
                    <ul className="space-y-2">
                      {(poll?.answers ?? []).map((a, i) => (
                        <li key={i} className="rounded border bg-muted/40 px-3 py-2 text-sm">{a}</li>
                      ))}
                    </ul>
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
                  <CardTitle className="text-base">Start a new poll</CardTitle>
                  <CardDescription>Starting a new poll closes the current one and saves it to history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={newQuestion} maxLength={300} placeholder="e.g. How busy do you feel this week?" onChange={(e) => setNewQuestion(e.target.value)} />
                  <Select value={newType} onValueChange={(v) => setNewType(v as PollType)}>
                    <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(POLL_TYPE_LABELS) as PollType[]).map((t) => (
                        <SelectItem key={t} value={t}>{POLL_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newType === 'choice' && (
                    <div className="space-y-2">
                      {newOptions.map((o, i) => (
                        <div key={i} className="flex gap-2">
                          <Input value={o} maxLength={100} placeholder={`Option ${i + 1}`}
                            onChange={(e) => setNewOptions(newOptions.map((x, j) => (j === i ? e.target.value : x)))} />
                          {newOptions.length > 2 && (
                            <Button variant="ghost" size="icon" onClick={() => setNewOptions(newOptions.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                          )}
                        </div>
                      ))}
                      {newOptions.length < 12 && (
                        <Button variant="outline" size="sm" onClick={() => setNewOptions([...newOptions, ''])}><Plus className="h-4 w-4 mr-1" /> Add option</Button>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={startPoll} disabled={!canStart}>Start new poll</Button>
                    {poll?.question && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline">Close current poll</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Close this poll?</AlertDialogTitle>
                            <AlertDialogDescription>Voting will stop and the results will be saved to history. No poll will be open until you start a new one.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={closePoll}>Close poll</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
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
