import { Issue } from '@/types/issue';

export type EffortBand = 'Small' | 'Medium' | 'Large' | 'Unknown';

const IMPACT_WEIGHT: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

/**
 * Effort is captured as free text (e.g. "2-3 days", "1 sprint", "quick fix"),
 * so we read it heuristically into a band and a numeric divisor.
 */
export function effortBand(raw?: string): { band: EffortBand; weight: number } {
  const text = (raw ?? '').trim().toLowerCase();
  if (!text) return { band: 'Unknown', weight: 2 };

  if (/\b(quick|trivial|small|minor|easy|config|hour|hours|hr|hrs)\b/.test(text)) {
    return { band: 'Small', weight: 1 };
  }
  if (/\b(month|months|quarter|epic|major|large|rebuild|re-?write|specialist|vendor|significant)\b/.test(text)) {
    return { band: 'Large', weight: 4 };
  }
  if (/\b(sprint|sprints|week|weeks)\b/.test(text)) {
    const weeks = Number(text.match(/(\d+)\s*(?:-\s*\d+\s*)?(?:week|sprint)/)?.[1] ?? 1);
    return weeks >= 3 ? { band: 'Large', weight: 4 } : { band: 'Medium', weight: 2.5 };
  }
  if (/\bday|days\b/.test(text)) {
    const days = Number(text.match(/(\d+)\s*(?:-\s*\d+\s*)?day/)?.[1] ?? 2);
    return days <= 2 ? { band: 'Small', weight: 1 } : { band: 'Medium', weight: 2.5 };
  }
  return { band: 'Unknown', weight: 2 };
}

export function impactWeight(level?: string): number {
  return IMPACT_WEIGHT[level ?? ''] ?? 0;
}

export function hasWorkaround(issue: Issue): boolean {
  const text = (issue.workaroundAvailable ?? '').trim().toLowerCase();
  if (!text) return false;
  if (/^(no|none|n\/a|na|nil|nothing)\b/.test(text)) return false;
  return true;
}

export interface ScoredIssue {
  issue: Issue;
  score: number;
  demand: number;
  impactPoints: number;
  effort: { band: EffortBand; weight: number };
  workaround: boolean;
}

/**
 * Priority score = demand (votes + repeat examples) x impact, lifted for churn
 * risk and missing workarounds, then divided by the effort to resolve.
 */
export function scoreIssue(issue: Issue): ScoredIssue {
  const demand = issue.votes + issue.customerData.length * 2;
  const impactPoints = impactWeight(issue.customerImpact) * 2 + impactWeight(issue.teamImpact);
  const workaround = hasWorkaround(issue);
  const effort = effortBand(issue.effortEstimate);

  const raw =
    demand *
    (1 + impactPoints) *
    (issue.churnRisk ? 1.5 : 1) *
    (workaround ? 1 : 1.3);

  return {
    issue,
    score: Math.round((raw / effort.weight) * 10) / 10,
    demand,
    impactPoints,
    effort,
    workaround,
  };
}
