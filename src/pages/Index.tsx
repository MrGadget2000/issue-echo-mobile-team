import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { IssueCard } from '@/components/IssueCard';
import { NewIssueForm } from '@/components/NewIssueForm';
import { Plus, Search, TrendingUp, AlertTriangle, Archive, BarChart3, Loader2, LogIn, LogOut } from 'lucide-react';
import { CustomerData } from '@/types/issue';
import { useToast } from '@/hooks/use-toast';
import { useIssues } from '@/hooks/useIssues';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const { toast } = useToast();
  const {
    issues,
    loading,
    createIssue,
    voteIssue,
    addCustomerData,
    closeIssue,
    hasVoted,
  } = useIssues();

  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => !issue.closed)
      .filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          issue.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [issues, searchTerm]);

  const top10Issues = useMemo(() => {
    return [...filteredIssues]
      .sort((a, b) => {
        if (a.votes === b.votes) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        return b.votes - a.votes;
      })
      .slice(0, 10);
  }, [filteredIssues]);

  const recentIssues = useMemo(() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return [...filteredIssues]
      .filter((issue) => issue.createdAt > twoDaysAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredIssues]);

  const handleVote = async (issueId: string) => {
    const result = await voteIssue(issueId);
    if (!result.ok && result.remainingMinutes !== undefined) {
      toast({
        title: 'Vote cooldown active',
        description: `You can vote again in ${result.remainingMinutes} minute${result.remainingMinutes !== 1 ? 's' : ''}.`,
        variant: 'destructive',
      });
      return;
    }
    if (result.ok) {
      toast({ title: 'Vote recorded!', description: 'Thanks for helping prioritise this issue.' });
    }
  };

  const handleCloseIssue = async (issueId: string) => {
    await closeIssue(issueId);
    toast({ title: 'Issue closed', description: 'The issue has been marked as closed.' });
  };

  const handleAddCustomerData = async (issueId: string, customerData: CustomerData) => {
    await addCustomerData(issueId, customerData);
    toast({ title: 'Customer example added!', description: 'This will help the team understand the issue better.' });
  };

  const handleCreateIssue = async (
    title: string,
    description: string,
    customerData?: CustomerData,
    impactData?: {
      workaroundAvailable?: string;
      customerImpact?: 'none' | 'low' | 'medium' | 'high';
      teamImpact?: 'none' | 'low' | 'medium' | 'high';
      effortEstimate?: string;
      churnRisk?: boolean;
    }
  ) => {
    try {
      await createIssue(title, description, customerData, impactData);
      setShowNewIssueForm(false);
      toast({ title: 'Issue created successfully!', description: 'Your issue has been added to the tracking system.' });
    } catch (e) {
      toast({ title: 'Failed to create issue', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const totalVotes = issues.filter((issue) => !issue.closed).reduce((sum, issue) => sum + issue.votes, 0);
  const totalCustomerExamples = issues.filter((issue) => !issue.closed).reduce((sum, issue) => sum + issue.customerData.length, 0);
  const openIssuesCount = issues.filter((issue) => !issue.closed).length;
  const closedIssuesCount = issues.filter((issue) => issue.closed).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Mobile Service Issue Tracker</h1>
              <p className="text-primary-foreground/80 mt-1">Track and prioritise provisioning issues with team collaboration</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold">{openIssuesCount}</div>
                <div className="text-sm text-primary-foreground/80">Open Issues</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{closedIssuesCount}</div>
                <div className="text-sm text-primary-foreground/80">Closed Issues</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{totalVotes}</div>
                <div className="text-sm text-primary-foreground/80">Total Votes</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-primary font-medium border-b-2 border-primary pb-1">
            Open Issues ({openIssuesCount})
          </Link>
          <Link to="/closed" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Closed Issues ({closedIssuesCount})
          </Link>
          <Link to="/reports" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search issues..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>

          <Dialog open={showNewIssueForm} onOpenChange={setShowNewIssueForm}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-card">
                <Plus className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report New Issue</DialogTitle>
              </DialogHeader>
              <NewIssueForm onSubmit={handleCreateIssue} onCancel={() => setShowNewIssueForm(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-card rounded-lg p-4 border shadow-card">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{top10Issues.slice(0, 3).reduce((sum, issue) => sum + issue.votes, 0)}</div>
                <div className="text-sm text-muted-foreground">Top 3 Issues Votes</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-card rounded-lg p-4 border shadow-card">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{totalCustomerExamples}</div>
                <div className="text-sm text-muted-foreground">Customer Examples</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-card rounded-lg p-4 border shadow-card">
            <div className="flex items-center gap-3">
              <div className="bg-vote/10 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-vote" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {issues.filter((issue) => {
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return issue.createdAt > dayAgo;
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">New Today</div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading issues...
          </div>
        )}

        {!loading && recentIssues.length > 0 && (
          <div className="space-y-6 mb-12">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-accent" />
                Recent Issues (Last 2 Days) {searchTerm && `(filtered)`}
              </h2>
              <Badge variant="secondary" className="text-sm bg-accent/10 text-accent">
                {recentIssues.length} new
              </Badge>
            </div>

            <div className="grid gap-6">
              {recentIssues.map((issue) => (
                <div key={`recent-${issue.id}`} className="relative">
                  <Badge variant="secondary" className="absolute -top-2 -left-2 z-10 text-xs bg-accent text-accent-foreground">
                    NEW
                  </Badge>
                  <IssueCard issue={issue} onVote={handleVote} onAddCustomerData={handleAddCustomerData} onCloseIssue={handleCloseIssue} hasVoted={hasVoted(issue.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Top 10 Issues {searchTerm && `(filtered)`}
              </h2>
              <Badge variant="secondary" className="text-sm">
                Showing {top10Issues.length} of {filteredIssues.length}
              </Badge>
            </div>

            {top10Issues.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg">
                  {searchTerm ? 'No issues match your search.' : 'No issues reported yet.'}
                </div>
                {!searchTerm && (
                  <Button onClick={() => setShowNewIssueForm(true)} className="mt-4 bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Report First Issue
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {top10Issues.map((issue, index) => (
                  <div key={issue.id} className="relative">
                    <Badge
                      variant="secondary"
                      className={`absolute -top-2 -left-2 z-10 text-xs ${
                        index === 0
                          ? 'bg-vote text-vote-foreground'
                          : index === 1
                          ? 'bg-accent text-accent-foreground'
                          : index < 3
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      #{index + 1}
                    </Badge>
                    <IssueCard issue={issue} onVote={handleVote} onAddCustomerData={handleAddCustomerData} onCloseIssue={handleCloseIssue} hasVoted={hasVoted(issue.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
