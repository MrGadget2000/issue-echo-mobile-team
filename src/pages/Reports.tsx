import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, TrendingDown, Minus, Clock, Users, Archive, BarChart3, Loader2, UserCircle2, Shield, Lock, Timer, Target, Grid2x2, Layers, Wrench, Repeat , Vote } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { scoreIssue, type ScoredIssue } from '@/lib/priority';
import { useIssues } from '@/hooks/useIssues';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { PollHistory } from '@/components/PollHistory';
import { AdminPanel } from '@/components/AdminPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Reports = () => {
  const { issues: mockIssues, loading } = useIssues();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { isAdmin, loading: roleLoading, refresh: refreshRole } = useUserRole();
  const { toast } = useToast();

  const claimFirstAdmin = async () => {
    const { data, error } = await supabase.rpc('claim_first_admin');
    if (error || !data) {
      toast({ title: 'Could not claim admin', description: error?.message ?? 'An admin already exists.', variant: 'destructive' });
      return;
    }
    toast({ title: 'You are now an admin' });
    refreshRole();
  };

  // Calculate metrics (hooks must run unconditionally)
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthIssues = mockIssues.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      return issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
    });

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthIssues = mockIssues.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      return issueDate.getMonth() === prevMonth && issueDate.getFullYear() === prevYear;
    });

    const openIssues = mockIssues.filter(issue => !issue.closed);
    const closedIssues = mockIssues.filter(issue => issue.closed);

    const averageAge = openIssues.length > 0
      ? Math.round(openIssues.reduce((sum, issue) => {
          const ageInDays = Math.floor((now.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + ageInDays;
        }, 0) / openIssues.length)
      : 0;

    const totalCustomerExamples = mockIssues.reduce((sum, issue) => sum + issue.customerData.length, 0);
    const currentMonthCustomerExamples = currentMonthIssues.reduce((sum, issue) => sum + issue.customerData.length, 0);

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = (currentMonth - i + 12) % 12;
      const targetYear = currentMonth - i < 0 ? currentYear - 1 : currentYear;

      const monthIssues = mockIssues.filter(issue => {
        const issueDate = new Date(issue.createdAt);
        return issueDate.getMonth() === targetMonth && issueDate.getFullYear() === targetYear;
      });

      const monthClosed = monthIssues.filter(issue => {
        if (!issue.closedAt) return false;
        const closedDate = new Date(issue.closedAt);
        return closedDate.getMonth() === targetMonth && closedDate.getFullYear() === targetYear;
      });

      monthlyData.push({
        month: new Date(targetYear, targetMonth).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' }),
        raised: monthIssues.length,
        resolved: monthClosed.length,
        customerExamples: monthIssues.reduce((sum, issue) => sum + issue.customerData.length, 0)
      });
    }

    return {
      currentMonthIssues: currentMonthIssues.length,
      prevMonthIssues: prevMonthIssues.length,
      openIssues: openIssues.length,
      closedIssues: closedIssues.length,
      averageAge,
      totalCustomerExamples,
      currentMonthCustomerExamples,
      monthlyData
    };
  }, [mockIssues]);

  const topReporters = useMemo(() => {
    const counts = new Map<string, { count: number; displayName: string; avatarUrl?: string; email?: string }>();
    mockIssues.forEach((issue) => {
      if (!issue.createdBy) return;
      const profile = issue.createdByProfile;
      const existing = counts.get(issue.createdBy);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(issue.createdBy, {
          count: 1,
          displayName: profile?.displayName ?? profile?.email ?? 'Unknown user',
          avatarUrl: profile?.avatarUrl,
          email: profile?.email,
        });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [mockIssues]);

  const unattributedCount = useMemo(
    () => mockIssues.filter((i) => !i.createdBy).length,
    [mockIssues]
  );

  const areaBreakdown = useMemo(() => {
    const counts = new Map<string, { total: number; open: number; examples: number }>();
    mockIssues.forEach((issue) => {
      const key = issue.issueArea ?? 'Unspecified';
      const entry = counts.get(key) ?? { total: 0, open: 0, examples: 0 };
      entry.total += 1;
      if (!issue.closed) entry.open += 1;
      entry.examples += issue.customerData.length;
      counts.set(key, entry);
    });
    return Array.from(counts.entries())
      .map(([area, v]) => ({ area, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [mockIssues]);


  // Rolling last-6-months buckets (oldest first), shared by the trend views
  const monthBuckets = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; month: number; year: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    return buckets;
  }, []);

  const AREA_CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
  ];
  const OTHER_AREAS_LABEL = 'Other areas';

  const areaTrends = useMemo(() => {
    const monthKeyOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
    const validKeys = new Set(monthBuckets.map((b) => b.key));

    // Count issues raised per area per month within the window
    const perArea = new Map<string, Map<string, number>>();
    mockIssues.forEach((issue) => {
      const created = new Date(issue.createdAt);
      const mKey = monthKeyOf(created);
      if (!validKeys.has(mKey)) return;
      const area = issue.issueArea ?? 'Unspecified';
      const months = perArea.get(area) ?? new Map<string, number>();
      months.set(mKey, (months.get(mKey) ?? 0) + 1);
      perArea.set(area, months);
    });

    const totals = Array.from(perArea.entries())
      .map(([area, months]) => ({
        area,
        total: Array.from(months.values()).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total);

    const topAreas = totals.slice(0, AREA_CHART_COLORS.length).map((t) => t.area);
    const otherAreas = totals.slice(AREA_CHART_COLORS.length).map((t) => t.area);
    const series = [...topAreas, ...(otherAreas.length > 0 ? [OTHER_AREAS_LABEL] : [])];

    const chartData = monthBuckets.map((bucket) => {
      const row: Record<string, string | number> = { month: bucket.label };
      topAreas.forEach((area) => {
        row[area] = perArea.get(area)?.get(bucket.key) ?? 0;
      });
      if (otherAreas.length > 0) {
        row[OTHER_AREAS_LABEL] = otherAreas.reduce(
          (sum, area) => sum + (perArea.get(area)?.get(bucket.key) ?? 0),
          0
        );
      }
      return row;
    });

    const latest = monthBuckets[monthBuckets.length - 1];
    const previous = monthBuckets[monthBuckets.length - 2];
    const movement = totals
      .map(({ area, total }) => {
        const months = perArea.get(area)!;
        const current = months.get(latest.key) ?? 0;
        const prior = previous ? months.get(previous.key) ?? 0 : 0;
        return { area, current, prior, change: current - prior, total };
      })
      .sort((a, b) => b.change - a.change || b.current - a.current);

    return {
      chartData,
      series,
      movement,
      latestLabel: latest.label,
      previousLabel: previous?.label ?? '—',
      hasData: totals.length > 0,
    };
  }, [mockIssues, monthBuckets]);

  const resolutionTimes = useMemo(() => {
    const DAY = 1000 * 60 * 60 * 24;
    const resolved = mockIssues
      .filter((issue) => issue.closed && issue.closedAt)
      .map((issue) => ({
        area: issue.issueArea ?? 'Unspecified',
        closedAt: new Date(issue.closedAt as Date),
        days: Math.max(
          0,
          (new Date(issue.closedAt as Date).getTime() - new Date(issue.createdAt).getTime()) / DAY
        ),
      }));

    const missingCloseDate = mockIssues.filter((i) => i.closed && !i.closedAt).length;

    const allDays = resolved.map((r) => r.days).sort((a, b) => a - b);
    const average = allDays.length > 0 ? allDays.reduce((a, b) => a + b, 0) / allDays.length : 0;
    const median =
      allDays.length === 0
        ? 0
        : allDays.length % 2 === 1
          ? allDays[(allDays.length - 1) / 2]
          : (allDays[allDays.length / 2 - 1] + allDays[allDays.length / 2]) / 2;

    const monthly = monthBuckets.map((bucket) => {
      const inMonth = resolved.filter(
        (r) => r.closedAt.getMonth() === bucket.month && r.closedAt.getFullYear() === bucket.year
      );
      return {
        month: bucket.label,
        avgDays:
          inMonth.length > 0
            ? Number((inMonth.reduce((s, r) => s + r.days, 0) / inMonth.length).toFixed(1))
            : 0,
        closed: inMonth.length,
      };
    });

    const byAreaMap = new Map<string, number[]>();
    resolved.forEach((r) => {
      const list = byAreaMap.get(r.area) ?? [];
      list.push(r.days);
      byAreaMap.set(r.area, list);
    });
    const byArea = Array.from(byAreaMap.entries())
      .map(([area, days]) => ({
        area,
        closed: days.length,
        avgDays: days.reduce((a, b) => a + b, 0) / days.length,
      }))
      .sort((a, b) => b.avgDays - a.avgDays);

    return {
      count: resolved.length,
      average,
      median,
      monthly,
      byArea,
      missingCloseDate,
    };
  }, [mockIssues, monthBuckets]);

  const dailyActivity = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, 0);
      days.push({
        date: key,
        label: d.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' }),
        count: 0,
      });
    }
    mockIssues.forEach((issue) => {
      const d = new Date(issue.createdAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1 + issue.customerData.length);
      }
    });
    return days.map((d) => ({ ...d, count: buckets.get(d.date) ?? 0 }));
  }, [mockIssues]);

  // ---- Prioritisation views (open issues only) ----
  const prioritised = useMemo(
    () => mockIssues.filter((i) => !i.closed).map(scoreIssue).sort((a, b) => b.score - a.score),
    [mockIssues]
  );

  const quadrants = useMemo(() => {
    const effortRank: Record<string, number> = { Small: 1, Unknown: 2, Medium: 2, Large: 3 };
    const groups = {
      quickWins: [] as ScoredIssue[],
      bigBets: [] as ScoredIssue[],
      fillIns: [] as ScoredIssue[],
      questionable: [] as ScoredIssue[],
    };
    prioritised.forEach((s) => {
      const highImpact = s.impactPoints >= 5;
      const lowEffort = effortRank[s.effort.band] <= 1;
      if (highImpact && lowEffort) groups.quickWins.push(s);
      else if (highImpact) groups.bigBets.push(s);
      else if (lowEffort) groups.fillIns.push(s);
      else groups.questionable.push(s);
    });
    return groups;
  }, [prioritised]);

  const areaPriority = useMemo(() => {
    const map = new Map<string, {
      area: string;
      open: number;
      votes: number;
      examples: number;
      noWorkaround: number;
      churnRisk: number;
      score: number;
      effortPoints: number;
    }>();
    prioritised.forEach((s) => {
      const area = s.issue.issueArea ?? 'Unspecified';
      const entry = map.get(area) ?? {
        area, open: 0, votes: 0, examples: 0, noWorkaround: 0, churnRisk: 0, score: 0, effortPoints: 0,
      };
      entry.open += 1;
      entry.votes += s.issue.votes;
      entry.examples += s.issue.customerData.length;
      if (!s.workaround) entry.noWorkaround += 1;
      if (s.issue.churnRisk) entry.churnRisk += 1;
      entry.score += s.score;
      entry.effortPoints += s.effort.weight;
      map.set(area, entry);
    });
    return Array.from(map.values())
      .map((e) => ({ ...e, avgEffort: e.effortPoints / e.open }))
      .sort((a, b) => b.score - a.score);
  }, [prioritised]);

  const manualWork = useMemo(() => {
    const noWorkaround = prioritised.filter((s) => !s.workaround);
    return {
      count: noWorkaround.length,
      votes: noWorkaround.reduce((sum, s) => sum + s.issue.votes, 0),
      churnRisk: noWorkaround.filter((s) => s.issue.churnRisk).length,
      top: noWorkaround.sort((a, b) => b.issue.votes - a.issue.votes).slice(0, 5),
    };
  }, [prioritised]);

  const repeatPain = useMemo(
    () =>
      mockIssues
        .filter((i) => !i.closed && i.customerData.length > 0)
        .sort((a, b) => b.customerData.length - a.customerData.length)
        .slice(0, 8),
    [mockIssues]
  );



  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Admins only
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The Reports tab is restricted to admin users.
            </p>
            {!user ? (
              <Button onClick={signInWithGoogle} className="w-full">Sign in with Google</Button>
            ) : (
              <>
                <p className="text-sm">
                  Ask an existing admin to grant you access. If no admin has been set up yet, you can claim
                  the first admin role below.
                </p>
                <Button onClick={claimFirstAdmin} variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" /> Claim first admin
                </Button>
              </>
            )}
            <Link to="/" className="block text-sm text-primary hover:underline text-center">← Back to issues</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openIssuesCount = mockIssues.filter(issue => !issue.closed).length;
  const closedIssuesCount = mockIssues.filter(issue => issue.closed).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Issue Reports & Analytics</h1>
              <p className="text-primary-foreground/80 mt-1">Monthly insights and issue tracking metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold">{metrics.currentMonthIssues}</div>
                <div className="text-sm text-primary-foreground/80">This Month</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{metrics.averageAge}</div>
                <div className="text-sm text-primary-foreground/80">Avg Age (days)</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Open Issues ({openIssuesCount})
          </Link>
          <Link to="/closed" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Closed Issues ({closedIssuesCount})
          </Link>
          <Link to="/poll" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <Vote className="h-4 w-4" />
            Poll
          </Link>
          <Link to="/reports" className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading reports...
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.currentMonthIssues}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.currentMonthIssues > metrics.prevMonthIssues ? '+' : ''}
                {((metrics.currentMonthIssues - metrics.prevMonthIssues) / Math.max(metrics.prevMonthIssues, 1) * 100).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.openIssues}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.closedIssues} resolved total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Open Age</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageAge}</div>
              <p className="text-xs text-muted-foreground">
                days since creation
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Examples</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalCustomerExamples}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.currentMonthCustomerExamples} this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Activity (last 30 days) */}
        <Card className="mb-8 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Last 30 Days — Issues + Examples per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    interval={Math.floor(dailyActivity.length / 10)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value, 'Items']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Each issue counts as 1, plus 1 for every customer example attached.
            </p>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="mb-8 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              6-Month Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.monthlyData.map((month, index) => (
                <div key={month.month} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="font-medium">{month.month}</div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {month.raised} raised
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-vote/10 text-vote border-vote/20">
                        {month.resolved} resolved
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                        {month.customerExamples} examples
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resolution Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Resolution Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Issues</span>
                  <span className="font-bold">{mockIssues.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Resolved</span>
                  <span className="font-bold text-vote">{metrics.closedIssues}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Open</span>
                  <span className="font-bold text-primary">{metrics.openIssues}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Resolution Rate</span>
                    <span className="font-bold text-lg">
                      {mockIssues.length > 0 ? ((metrics.closedIssues / mockIssues.length) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Customer Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Customer Examples</span>
                  <span className="font-bold">{metrics.totalCustomerExamples}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Issues with Examples</span>
                  <span className="font-bold text-accent">
                    {mockIssues.filter(issue => issue.customerData.length > 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg Examples per Issue</span>
                  <span className="font-bold">
                    {mockIssues.length > 0 ? (metrics.totalCustomerExamples / mockIssues.length).toFixed(1) : '0.0'}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Coverage Rate</span>
                    <span className="font-bold text-lg">
                      {mockIssues.length > 0 ? ((mockIssues.filter(issue => issue.customerData.length > 0).length / mockIssues.length) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues by Area */}
        <Card className="mt-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Issues by Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues yet.</p>
            ) : (
              <div className="space-y-2">
                {areaBreakdown.map((row) => (
                  <div key={row.area} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="font-medium text-sm">{row.area}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{row.total} total</Badge>
                      <Badge variant="outline">{row.open} open</Badge>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">{row.examples} examples</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Area trends over time */}
        <Card className="mt-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Area Trends (last 6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!areaTrends.hasData ? (
              <p className="text-sm text-muted-foreground">No issues raised in the last 6 months.</p>
            ) : (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaTrends.chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {areaTrends.series.map((area, idx) => (
                        <Bar
                          key={area}
                          dataKey={area}
                          stackId="areas"
                          fill={
                            area === OTHER_AREAS_LABEL
                              ? 'hsl(var(--chart-7))'
                              : AREA_CHART_COLORS[idx % AREA_CHART_COLORS.length]
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Movement from {areaTrends.previousLabel} to {areaTrends.latestLabel} — biggest increases first.
                  </p>
                  {areaTrends.movement.map((row) => (
                    <div key={row.area} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="font-medium text-sm">{row.area}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.prior} prev</Badge>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {row.current} now
                        </Badge>
                        <span
                          className={`flex items-center gap-1 text-xs font-medium ${
                            row.change > 0
                              ? 'text-destructive'
                              : row.change < 0
                                ? 'text-vote'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {row.change > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : row.change < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          {row.change > 0 ? `+${row.change}` : row.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Time to resolve */}
        <Card className="mt-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Time to Resolve
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resolutionTimes.count === 0 ? (
              <p className="text-sm text-muted-foreground">No closed issues with a recorded close date yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground">Average days to close</div>
                    <div className="text-2xl font-bold">{resolutionTimes.average.toFixed(1)}</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground">Median days to close</div>
                    <div className="text-2xl font-bold">{resolutionTimes.median.toFixed(1)}</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground">Closed issues measured</div>
                    <div className="text-2xl font-bold">{resolutionTimes.count}</div>
                  </div>
                </div>

                <div className="h-64 w-full mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resolutionTimes.monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${value} days`, 'Avg time to close']}
                      />
                      <Bar dataKey="avgDays" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average days between raising and closing, by the month the issue was closed.
                </p>

                <div className="mt-6 space-y-2">
                  <p className="text-xs text-muted-foreground">Slowest areas first.</p>
                  {resolutionTimes.byArea.map((row) => (
                    <div key={row.area} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="font-medium text-sm">{row.area}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.closed} closed</Badge>
                        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                          {row.avgDays.toFixed(1)} days avg
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {resolutionTimes.missingCloseDate > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {resolutionTimes.missingCloseDate} closed{' '}
                    {resolutionTimes.missingCloseDate === 1 ? 'issue has' : 'issues have'} no recorded close date and
                    {resolutionTimes.missingCloseDate === 1 ? ' is' : ' are'} excluded from these figures.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Priority ranking */}
        <Card className="mt-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Priority Ranking — What to Fix First
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prioritised.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open issues to prioritise.</p>
            ) : (
              <div className="space-y-2">
                {prioritised.slice(0, 10).map((s, idx) => (
                  <div key={s.issue.id} className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-start gap-3 min-w-0">
                      <Badge variant="outline" className="w-8 justify-center shrink-0">#{idx + 1}</Badge>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{s.issue.title}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs">{s.issue.issueArea ?? 'Unspecified'}</Badge>
                          <Badge variant="outline" className="text-xs">{s.effort.band} effort</Badge>
                          <Badge variant="outline" className="text-xs">{s.issue.votes} votes</Badge>
                          {s.issue.customerData.length > 0 && (
                            <Badge variant="outline" className="text-xs">{s.issue.customerData.length} examples</Badge>
                          )}
                          {!s.workaround && (
                            <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">No workaround</Badge>
                          )}
                          {s.issue.churnRisk && (
                            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">Churn risk</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold">{s.score}</div>
                      <div className="text-xs text-muted-foreground">score</div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">
                  Score combines votes and repeat customer examples with customer/team impact, lifted for churn risk
                  and missing workarounds, then divided by the effort to resolve. Higher means better return for the work.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impact vs effort quadrants */}
        <Card className="mt-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid2x2 className="h-5 w-5" />
              Impact vs Effort
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: 'quickWins', title: 'Quick wins', note: 'High impact, low effort — do these now', list: quadrants.quickWins },
                { key: 'bigBets', title: 'Big bets', note: 'High impact, larger effort — plan these', list: quadrants.bigBets },
                { key: 'fillIns', title: 'Fill-ins', note: 'Lower impact, low effort — bundle with other work', list: quadrants.fillIns },
                { key: 'questionable', title: 'Reconsider', note: 'Lower impact, larger effort — park or reframe', list: quadrants.questionable },
              ] as const).map((q) => (
                <div key={q.key} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{q.title}</span>
                    <Badge variant="outline">{q.list.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{q.note}</p>
                  <div className="mt-3 space-y-1">
                    {q.list.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nothing here.</p>
                    ) : (
                      q.list.slice(0, 5).map((s) => (
                        <div key={s.issue.id} className="text-xs flex items-center justify-between gap-2">
                          <span className="truncate">{s.issue.title}</span>
                          <span className="text-muted-foreground shrink-0">{s.score}</span>
                        </div>
                      ))
                    )}
                    {q.list.length > 5 && (
                      <p className="text-xs text-muted-foreground">+{q.list.length - 5} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Impact uses customer impact (weighted double) plus team impact. Effort is read from the effort estimate text;
              issues with no estimate are treated as medium effort.
            </p>
          </CardContent>
        </Card>

        {/* Area priority summary */}
        <Card className="mt-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Area Priority Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaPriority.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open issues yet.</p>
            ) : (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={areaPriority.slice(0, 8).map((a) => ({ area: a.area, score: Math.round(a.score * 10) / 10 }))}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="area" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [value, 'Priority score']}
                      />
                      <Bar dataKey="score" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {areaPriority.map((a) => (
                    <div key={a.area} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                      <span className="font-medium text-sm">{a.area}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">{a.open} open</Badge>
                        <Badge variant="outline" className="text-xs">{a.votes} votes</Badge>
                        <Badge variant="outline" className="text-xs">{a.examples} examples</Badge>
                        <Badge variant="outline" className="text-xs">{a.noWorkaround} no workaround</Badge>
                        {a.churnRisk > 0 && (
                          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                            {a.churnRisk} churn risk
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          score {Math.round(a.score * 10) / 10}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Areas are ranked by the combined priority score of their open issues, so the areas costing the most
                  manual work sit at the top.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Manual work burden + repeat pain */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Manual Work Burden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">No workaround</div>
                  <div className="text-2xl font-bold">{manualWork.count}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">Votes behind them</div>
                  <div className="text-2xl font-bold">{manualWork.votes}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground">Also churn risk</div>
                  <div className="text-2xl font-bold">{manualWork.churnRisk}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {manualWork.top.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Every open issue has a workaround recorded.</p>
                ) : (
                  manualWork.top.map((s) => (
                    <div key={s.issue.id} className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.issue.title}</div>
                        <div className="text-xs text-muted-foreground">{s.issue.issueArea ?? 'Unspecified'}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0">{s.issue.votes} votes</Badge>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                These issues force manual handling every time they occur, so they carry the highest ongoing effort cost.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Repeat Pain — Most Real Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              {repeatPain.length === 0 ? (
                <p className="text-sm text-muted-foreground">No customer examples logged against open issues yet.</p>
              ) : (
                <div className="space-y-2">
                  {repeatPain.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{issue.title}</div>
                        <div className="text-xs text-muted-foreground">{issue.issueArea ?? 'Unspecified'}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 bg-accent/10 text-accent border-accent/20">
                        {issue.customerData.length} {issue.customerData.length === 1 ? 'example' : 'examples'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Counts real customer or order examples attached to each open issue — evidence of how often the problem
                actually recurs, not just how many people voted.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Reporters */}
        <Card className="mt-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5" />
              Top Reporters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topReporters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attributed reports yet. Sign in and report an issue to appear here.</p>
            ) : (
              <div className="space-y-3">
                {topReporters.map((reporter, idx) => (
                  <div key={reporter.email ?? idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 justify-center">#{idx + 1}</Badge>
                      {reporter.avatarUrl ? (
                        <img src={reporter.avatarUrl} alt={reporter.displayName} className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {reporter.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm">{reporter.displayName}</div>
                        {reporter.email && reporter.email !== reporter.displayName && (
                          <div className="text-xs text-muted-foreground">{reporter.email}</div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {reporter.count} {reporter.count === 1 ? 'issue' : 'issues'}
                    </Badge>
                  </div>
                ))}
                {unattributedCount > 0 && (
                  <p className="text-xs text-muted-foreground pt-2">
                    {unattributedCount} legacy {unattributedCount === 1 ? 'issue is' : 'issues are'} not attributed to a user (created before sign-in was required).
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <PollHistory />

        <div className="mt-6">
          <AdminPanel currentUserId={user!.id} onChange={refreshRole} />
        </div>
      </div>
    </div>
  );
};

export default Reports;