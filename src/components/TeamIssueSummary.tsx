import { useMemo } from 'react';
import type { Issue } from '@/types/issue';
import { snapshotGroups } from '@/lib/teams';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function TeamIssueSummary({ issues }: { issues: Issue[] }) {
  const rows = useMemo(() => {
    const groups = new Map<string, { name: string; total: number; open: number; votes: number; examples: number }>();
    issues.forEach((issue) => snapshotGroups(issue.teamSnapshot).forEach((team) => {
      const row = groups.get(team.id) ?? { name: team.name, total: 0, open: 0, votes: 0, examples: 0 };
      row.total++; if (!issue.closed) row.open++; row.votes += issue.votes; row.examples += issue.customerData.length;
      groups.set(team.id, row);
    }));
    return [...groups.entries()].sort((a, b) => b[1].open - a[1].open);
  }, [issues]);
  return <Card className="mt-6 bg-gradient-card shadow-card"><CardHeader><CardTitle>Issues by Reporter Team</CardTitle></CardHeader><CardContent><p className="mb-3 text-xs text-muted-foreground">Team at submission, including parent-team roll-ups. Parent and subteam rows overlap; all users: {issues.length} issues.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Team</th><th>Total</th><th>Open</th><th>Votes</th><th>Examples</th></tr></thead><tbody>{rows.map(([id, row]) => <tr key={id} className="border-b"><td className="py-2 pr-4">{row.name}</td><td>{row.total}</td><td>{row.open}</td><td>{row.votes}</td><td>{row.examples}</td></tr>)}</tbody></table></div></CardContent></Card>;
}