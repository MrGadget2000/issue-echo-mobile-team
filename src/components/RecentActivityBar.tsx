import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, Pause, Play, PlusCircle, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Issue } from '@/types/issue';
import { weeklyActivity } from '@/lib/recentActivity';

type PollActivity = { id: string; question: string; created_at: string; closed_at: string | null };

export function RecentActivityBar({ issues, loading }: { issues: Issue[]; loading: boolean }) {
  const [poll, setPoll] = useState<PollActivity | null>(null);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data, error } = await supabase.from('poll_questions')
        .select('id, question, created_at, closed_at')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (active) {
        setNow(new Date());
        if (!error) setPoll(data);
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const activity = useMemo(() => weeklyActivity(issues, now), [issues, now]);
  if (loading) return null;

  const entries = [
    { key: 'raised', icon: PlusCircle, text: `${activity.raised} new issue${activity.raised === 1 ? '' : 's'} logged this week` },
    { key: 'closed', icon: CheckCircle2, text: `${activity.closed} issue${activity.closed === 1 ? '' : 's'} closed this week` },
    ...(poll ? [{ key: 'poll', icon: Vote, text: `${poll.closed_at ? 'Latest poll (closed)' : 'New poll created'}: ${poll.question}`, to: '/poll' }] : []),
    ...activity.latest.map((issue) => ({ key: issue.id, icon: PlusCircle, text: `New issue: ${issue.title}${issue.issueArea ? ` · ${issue.issueArea}` : ''}` })),
  ];

  return (
    <section aria-label="Recent activity" className="activity-bar mb-6 flex min-w-0 items-center border-y bg-primary/5 text-sm">
      <div className="flex shrink-0 items-center gap-2 border-r bg-background px-3 py-3 font-semibold text-primary">
        <Activity className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Recent activity</span>
      </div>
      <div className="activity-viewport min-w-0 flex-1 overflow-hidden">
        <div className={`activity-track flex w-max ${paused ? 'activity-track-paused' : ''}`}>
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1 ? true : undefined} className={`flex shrink-0 items-center ${copy === 1 ? 'activity-duplicate' : ''}`}>
              {entries.map((entry) => (
                <div key={entry.key} className="flex shrink-0 items-center gap-2 whitespace-nowrap px-6 py-3">
                  <entry.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {'to' in entry && entry.to ? (
                    <Link to={entry.to} tabIndex={copy === 1 ? -1 : undefined} className="max-w-[36rem] truncate font-medium text-primary underline-offset-4 hover:underline" title={entry.text}>{entry.text}</Link>
                  ) : <span className="max-w-[36rem] truncate text-foreground" title={entry.text}>{entry.text}</span>}
                  <span className="ml-4 text-muted-foreground" aria-hidden="true">·</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="mx-1 shrink-0" aria-label={paused ? 'Resume activity scrolling' : 'Pause activity scrolling'} title={paused ? 'Resume scrolling' : 'Pause scrolling'} onClick={() => setPaused((value) => !value)}>
        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </Button>
    </section>
  );
}