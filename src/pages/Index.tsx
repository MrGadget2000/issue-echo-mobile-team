import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { IssueCard } from '@/components/IssueCard';
import { NewIssueForm } from '@/components/NewIssueForm';
import { Plus, Search, TrendingUp, AlertTriangle } from 'lucide-react';
import { Issue, CustomerData } from '@/types/issue';
import { useToast } from '@/hooks/use-toast';

// Mock data for development
const mockIssues: Issue[] = [
  {
    id: '1',
    title: 'Porting delays from Verizon to our network',
    description: 'Customers are experiencing 3-5 day delays when porting numbers from Verizon. This is causing customer dissatisfaction and potential churn.',
    votes: 8,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    votedBy: ['user1', 'user2'],
    customerData: [
      {
        customerName: 'Sarah Johnson',
        orderId: 'ORD-4567',
        phoneNumber: '+1 (555) 123-4567',
        serviceType: 'port-in',
        additionalDetails: 'Customer called 3 times asking for updates. Very frustrated.'
      },
      {
        customerName: 'Mike Chen',
        orderId: 'ORD-4890',
        phoneNumber: '+1 (555) 987-6543',
        serviceType: 'port-in',
        additionalDetails: 'Business customer threatening to cancel due to delay'
      }
    ]
  },
  {
    id: '2',
    title: 'SIM card activation failing for iPhone 15 Pro',
    description: 'New iPhone 15 Pro devices are not properly activating with our SIM cards. Error shows "SIM not supported" despite being compatible.',
    votes: 6,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
    votedBy: ['user3'],
    customerData: [
      {
        customerName: 'Alex Rivera',
        orderId: 'ORD-4567',
        phoneNumber: '+1 (555) 456-7890',
        serviceType: 'new-activation',
        additionalDetails: 'Customer purchased iPhone 15 Pro Max 256GB in Space Black'
      }
    ]
  },
  {
    id: '3',
    title: 'Plan change causing data throttling issues',
    description: 'When customers upgrade their data plans, the system is not properly updating their throttling limits, causing unexpected slowdowns.',
    votes: 4,
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
    votedBy: [],
    customerData: []
  }
];

const Index = () => {
  const [issues, setIssues] = useState<Issue[]>(mockIssues);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [votedIssues, setVotedIssues] = useState<Set<string>>(new Set(['1'])); // Mock user already voted on issue 1
  const { toast } = useToast();

  // Filter issues based on search
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [issues, searchTerm]);

  // Top 10 issues by votes
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

  // Recent issues (last 2 days)
  const recentIssues = useMemo(() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    return [...filteredIssues]
      .filter(issue => issue.createdAt > twoDaysAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredIssues]);

  const handleVote = (issueId: string) => {
    if (votedIssues.has(issueId)) return;

    setIssues(prev => prev.map(issue => 
      issue.id === issueId 
        ? { ...issue, votes: issue.votes + 1, votedBy: [...issue.votedBy, 'currentUser'] }
        : issue
    ));
    setVotedIssues(prev => new Set([...prev, issueId]));
    
    toast({
      title: "Vote recorded!",
      description: "Thanks for helping prioritize this issue.",
    });
  };

  const handleAddCustomerData = (issueId: string, customerData: CustomerData) => {
    setIssues(prev => prev.map(issue => 
      issue.id === issueId 
        ? { 
            ...issue, 
            customerData: [...issue.customerData, customerData],
            updatedAt: new Date()
          }
        : issue
    ));
    
    toast({
      title: "Customer example added!",
      description: "This will help the team understand the issue better.",
    });
  };

  const handleCreateIssue = (title: string, description: string, customerData?: CustomerData) => {
    const newIssue: Issue = {
      id: Date.now().toString(),
      title,
      description,
      votes: 1, // Creator automatically votes
      createdAt: new Date(),
      updatedAt: new Date(),
      votedBy: ['currentUser'],
      customerData: customerData ? [customerData] : []
    };

    setIssues(prev => [newIssue, ...prev]);
    setVotedIssues(prev => new Set([...prev, newIssue.id]));
    setShowNewIssueForm(false);
    
    toast({
      title: "Issue created successfully!",
      description: "Your issue has been added to the tracking system.",
    });
  };

  const totalVotes = issues.reduce((sum, issue) => sum + issue.votes, 0);
  const totalCustomerExamples = issues.reduce((sum, issue) => sum + issue.customerData.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Mobile Service Issue Tracker</h1>
              <p className="text-primary-foreground/80 mt-1">
                Track and prioritize provisioning issues with team collaboration
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold">{issues.length}</div>
                <div className="text-sm text-primary-foreground/80">Active Issues</div>
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
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
              <NewIssueForm
                onSubmit={handleCreateIssue}
                onCancel={() => setShowNewIssueForm(false)}
              />
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
        {recentIssues.length > 0 && (
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
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -left-2 z-10 text-xs bg-accent text-accent-foreground"
                  >
                    NEW
                  </Badge>
                  <IssueCard
                    issue={issue}
                    onVote={handleVote}
                    onAddCustomerData={handleAddCustomerData}
                    hasVoted={votedIssues.has(issue.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
          
          {top10Issues.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg">
                {searchTerm ? 'No issues match your search.' : 'No issues reported yet.'}
              </div>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowNewIssueForm(true)}
                  className="mt-4 bg-gradient-primary"
                >
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
                      index === 0 ? 'bg-vote text-vote-foreground' : 
                      index === 1 ? 'bg-accent text-accent-foreground' : 
                      index < 3 ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}
                  >
                    #{index + 1}
                  </Badge>
                  <IssueCard
                    issue={issue}
                    onVote={handleVote}
                    onAddCustomerData={handleAddCustomerData}
                    hasVoted={votedIssues.has(issue.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
