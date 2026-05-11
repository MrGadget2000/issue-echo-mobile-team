import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, Clock, Users, Archive, BarChart3, Loader2, UserCircle2, Shield, Lock } from 'lucide-react';
import { useIssues } from '@/hooks/useIssues';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminPanel } from '@/components/AdminPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Reports = () => {
  const { issues: mockIssues, loading } = useIssues();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { isAdmin, anyAdminExists, loading: roleLoading, refresh: refreshRole } = useUserRole();
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
            ) : anyAdminExists === false ? (
              <>
                <p className="text-sm">No admin has been set up yet. Claim the first admin role to bootstrap your team.</p>
                <Button onClick={claimFirstAdmin} className="w-full">
                  <Shield className="h-4 w-4 mr-2" /> Claim first admin
                </Button>
              </>
            ) : (
              <p className="text-sm">Ask an existing admin to grant you access.</p>
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

        <div className="mt-6">
          <AdminPanel currentUserId={user!.id} onChange={refreshRole} />
        </div>
      </div>
    </div>
  );
};

export default Reports;