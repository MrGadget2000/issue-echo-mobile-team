import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { IssueCard } from '@/components/IssueCard';
import { NewIssueForm } from '@/components/NewIssueForm';
import { Plus, Search, TrendingUp, AlertTriangle, Archive, BarChart3 } from 'lucide-react';
import { Issue, CustomerData } from '@/types/issue';
import { useToast } from '@/hooks/use-toast';

// Mock data for development
const mockIssues: Issue[] = [{
  id: '1',
  title: 'Porting delays from Verizon to our network',
  description: 'Customers are experiencing 3-5 day delays when porting numbers from Verizon. This is causing customer dissatisfaction and potential churn.',
  votes: 8,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  closed: false,
  votedBy: ['user1', 'user2'],
  customerData: [{
    customerName: 'Sarah Johnson',
    orderId: 'ORD-4567',
    phoneNumber: '+1 (555) 123-4567',
    serviceType: 'port-in',
    additionalDetails: 'Customer called 3 times asking for updates. Very frustrated.'
  }, {
    customerName: 'Mike Chen',
    orderId: 'ORD-4890',
    phoneNumber: '+1 (555) 987-6543',
    serviceType: 'port-in',
    additionalDetails: 'Business customer threatening to cancel due to delay'
  }]
}, {
  id: '2',
  title: 'SIM card activation failing for iPhone 15 Pro',
  description: 'New iPhone 15 Pro devices are not properly activating with our SIM cards. Error shows "SIM not supported" despite being compatible.',
  votes: 6,
  createdAt: new Date('2024-01-14'),
  updatedAt: new Date('2024-01-14'),
  closed: false,
  votedBy: ['user3'],
  customerData: [{
    customerName: 'Alex Rivera',
    orderId: 'ORD-4567',
    phoneNumber: '+1 (555) 456-7890',
    serviceType: 'new-activation',
    additionalDetails: 'Customer purchased iPhone 15 Pro Max 256GB in Space Black'
  }]
}, {
  id: '3',
  title: 'Plan change causing data throttling issues',
  description: 'When customers upgrade their data plans, the system is not properly updating their throttling limits, causing unexpected slowdowns.',
  votes: 4,
  createdAt: new Date('2024-01-13'),
  updatedAt: new Date('2024-01-13'),
  closed: false,
  votedBy: [],
  customerData: []
}, {
  id: 'closed-1',
  title: 'Legacy system integration timeout errors',
  description: 'Intermittent timeout errors when integrating with legacy billing system during peak hours.',
  votes: 12,
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-12'),
  closed: true,
  closedAt: new Date('2024-01-12'),
  closedBy: 'admin',
  votedBy: ['user1', 'user2', 'user3'],
  customerData: [
    {
      customerName: 'Jennifer Smith',
      orderId: 'ORD-3321',
      phoneNumber: '+1 (555) 111-2222',
      serviceType: 'plan-change',
      additionalDetails: 'System timed out during plan upgrade, customer charged twice'
    }
  ]
}];
const Index = () => {
  const [issues, setIssues] = useState<Issue[]>(mockIssues);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [voteTimestamps, setVoteTimestamps] = useState<Map<string, number>>(new Map()); // Track last vote time per issue
  const {
    toast
  } = useToast();

  // Filter issues based on search (only show open issues on main page)
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => !issue.closed) // Only show open issues
    .filter(issue => issue.title.toLowerCase().includes(searchTerm.toLowerCase()) || issue.description.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [issues, searchTerm]);

  // Top 10 issues by votes
  const top10Issues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      if (a.votes === b.votes) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return b.votes - a.votes;
    }).slice(0, 10);
  }, [filteredIssues]);

  // Recent issues (last 2 days)
  const recentIssues = useMemo(() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return [...filteredIssues].filter(issue => issue.createdAt > twoDaysAgo).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredIssues]);
  const handleVote = (issueId: string) => {
    const now = Date.now();
    const lastVoteTime = voteTimestamps.get(issueId) || 0;
    const timeSinceLastVote = now - lastVoteTime;
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (timeSinceLastVote < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastVote) / 1000 / 60);
      toast({
        title: "Vote cooldown active",
        description: `You can vote again in ${remainingTime} minute${remainingTime !== 1 ? 's' : ''}.`,
        variant: "destructive"
      });
      return;
    }
    
    setIssues(prev => prev.map(issue => issue.id === issueId ? {
      ...issue,
      votes: issue.votes + 1,
      votedBy: [...issue.votedBy, 'currentUser']
    } : issue));
    
    setVoteTimestamps(prev => new Map(prev).set(issueId, now));
    
    toast({
      title: "Vote recorded!",
      description: "Thanks for helping prioritize this issue."
    });
  };
  const handleCloseIssue = (issueId: string) => {
    setIssues(prev => prev.map(issue => issue.id === issueId ? {
      ...issue,
      closed: true,
      closedAt: new Date(),
      closedBy: 'currentUser'
    } : issue));
    toast({
      title: "Issue closed",
      description: "The issue has been marked as closed."
    });
  };
  const handleAddCustomerData = (issueId: string, customerData: CustomerData) => {
    setIssues(prev => prev.map(issue => issue.id === issueId ? {
      ...issue,
      customerData: [...issue.customerData, customerData],
      updatedAt: new Date()
    } : issue));
    toast({
      title: "Customer example added!",
      description: "This will help the team understand the issue better."
    });
  };
  const handleCreateIssue = (title: string, description: string, customerData?: CustomerData, impactData?: {
    workaroundAvailable?: string;
    customerImpact?: 'none' | 'low' | 'medium' | 'high';
    teamImpact?: 'none' | 'low' | 'medium' | 'high';
    effortEstimate?: string;
    churnRisk?: boolean;
  }) => {
    const newIssue: Issue = {
      id: Date.now().toString(),
      title,
      description,
      votes: 1,
      // Creator automatically votes
      createdAt: new Date(),
      updatedAt: new Date(),
      closed: false,
      votedBy: ['currentUser'],
      customerData: customerData ? [customerData] : [],
      ...impactData
    };
    setIssues(prev => [newIssue, ...prev]);
    setVoteTimestamps(prev => new Map(prev).set(newIssue.id, Date.now())); // Record initial vote timestamp
    setShowNewIssueForm(false);
    toast({
      title: "Issue created successfully!",
      description: "Your issue has been added to the tracking system."
    });
  };
  const totalVotes = issues.filter(issue => !issue.closed).reduce((sum, issue) => sum + issue.votes, 0);
  const totalCustomerExamples = issues.filter(issue => !issue.closed).reduce((sum, issue) => sum + issue.customerData.length, 0);
  const openIssuesCount = issues.filter(issue => !issue.closed).length;
  const closedIssuesCount = issues.filter(issue => issue.closed).length;
  return <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Navigation */}
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search issues..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
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

        {/* Stats */}
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
                <div className="text-2xl font-bold text-foreground">{issues.filter(issue => {
                  const dayAgo = new Date();
                  dayAgo.setDate(dayAgo.getDate() - 1);
                  return issue.createdAt > dayAgo;
                }).length}</div>
                <div className="text-sm text-muted-foreground">New Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Issues (Last 2 Days) */}
        {recentIssues.length > 0 && <div className="space-y-6 mb-12">
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
              {recentIssues.map(issue => <div key={`recent-${issue.id}`} className="relative">
                  <Badge variant="secondary" className="absolute -top-2 -left-2 z-10 text-xs bg-accent text-accent-foreground">
                    NEW
                  </Badge>
                  <IssueCard issue={issue} onVote={handleVote} onAddCustomerData={handleAddCustomerData} onCloseIssue={handleCloseIssue} hasVoted={false} />
                </div>)}
            </div>
          </div>}

        {/* Top 10 Issues */}
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
          
          {top10Issues.length === 0 ? <div className="text-center py-12">
              <div className="text-muted-foreground text-lg">
                {searchTerm ? 'No issues match your search.' : 'No issues reported yet.'}
              </div>
              {!searchTerm && <Button onClick={() => setShowNewIssueForm(true)} className="mt-4 bg-gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Report First Issue
                </Button>}
            </div> : <div className="grid gap-6">
              {top10Issues.map((issue, index) => <div key={issue.id} className="relative">
                  <Badge variant="secondary" className={`absolute -top-2 -left-2 z-10 text-xs ${index === 0 ? 'bg-vote text-vote-foreground' : index === 1 ? 'bg-accent text-accent-foreground' : index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    #{index + 1}
                  </Badge>
                  <IssueCard issue={issue} onVote={handleVote} onAddCustomerData={handleAddCustomerData} onCloseIssue={handleCloseIssue} hasVoted={false} />
                </div>)}
            </div>}
        </div>
      </div>
    </div>;
};
export default Index;