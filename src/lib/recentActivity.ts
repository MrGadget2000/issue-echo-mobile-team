import type { Issue } from '@/types/issue';

const aucklandDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function localDateKey(date: Date): string {
  const parts = aucklandDate.formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function weeklyActivity(issues: Issue[], now = new Date()) {
  const today = new Date(`${localDateKey(now)}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const start = today.toISOString().slice(0, 10);
  const inWeek = (date: Date) => date <= now && localDateKey(date) >= start;
  return {
    raised: issues.filter((issue) => inWeek(issue.createdAt)).length,
    closed: issues.filter((issue) => issue.closed && issue.closedAt && inWeek(issue.closedAt)).length,
    latest: [...issues].filter((issue) => inWeek(issue.createdAt))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3),
  };
}