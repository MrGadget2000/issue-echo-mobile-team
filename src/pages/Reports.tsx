import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, TrendingUp, Clock, Users, Archive, BarChart3, Loader2 } from 'lucide-react';
import { useIssues } from '@/hooks/useIssues';

const Reports = () => {
  const { issues: mockIssues, loading } = useIssues();

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Current month issues
    const currentMonthIssues = mockIssues.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      return issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
    });
    
    // Previous month issues
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthIssues = mockIssues.filter(issue => {
      const issueDate = new Date(issue.createdAt);
      return issueDate.getMonth() === prevMonth && issueDate.getFullYear() === prevYear;
    });
    
    // Open vs Closed
    const openIssues = mockIssues.filter(issue => !issue.closed);
    const closedIssues = mockIssues.filter(issue => issue.closed);
    
    // Average open issue age
    const averageAge = openIssues.length > 0 
      ? Math.round(openIssues.reduce((sum, issue) => {
          const ageInDays = Math.floor((now.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + ageInDays;
        }, 0) / openIssues.length)
      : 0;
    
    // Customer examples count
    const totalCustomerExamples = mockIssues.reduce((sum, issue) => sum + issue.customerData.length, 0);
    const currentMonthCustomerExamples = currentMonthIssues.reduce((sum, issue) => sum + issue.customerData.length, 0);
    
    // Monthly breakdown for last 6 months
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
      </div>
    </div>
  );
};

export default Reports;