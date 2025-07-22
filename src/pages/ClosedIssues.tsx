import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { IssueCard } from '@/components/IssueCard';
import { Search, Archive, ArrowLeft } from 'lucide-react';
import { Issue, CustomerData } from '@/types/issue';
import { useToast } from '@/hooks/use-toast';

// This would typically come from a shared state or context
// Using the same mock data structure as Index.tsx
const mockAllIssues: Issue[] = [{
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

const mockClosedIssues = mockAllIssues.filter(issue => issue.closed);

const ClosedIssues = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [votedIssues] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Filter closed issues based on search
  const filteredClosedIssues = useMemo(() => {
    return mockClosedIssues.filter(issue => 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleVote = (issueId: string) => {
    // Closed issues can't be voted on
    toast({
      title: "Cannot vote on closed issues",
      description: "This issue has been closed and is no longer accepting votes.",
      variant: "destructive"
    });
  };

  const handleReopenIssue = (issueId: string) => {
    // In a real app, this would update the shared state/context
    // For now, just show a toast indicating the action
    toast({
      title: "Issue reopened",
      description: "The issue has been moved back to the open issues list.",
    });
    
    // In a real implementation, you'd update the shared state here
    // For demo purposes, we'll just remove it from the local view
    window.location.href = '/';
  };

  const handleAddCustomerData = (issueId: string, customerData: CustomerData) => {
    // Closed issues can't have new customer data added
    toast({
      title: "Cannot add data to closed issues",
      description: "This issue has been closed and is no longer accepting new examples.",
      variant: "destructive"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Archive className="h-8 w-8" />
                Closed Issues
              </h1>
              <p className="text-primary-foreground/80 mt-1">
                Archive of resolved and closed issues
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{mockClosedIssues.length}</div>
              <div className="text-sm text-primary-foreground/80">Closed Issues</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            to="/"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Open Issues
          </Link>
          <span className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Closed Issues
          </span>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search closed issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Closed Issues List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="h-6 w-6 text-muted-foreground" />
              Closed Issues {searchTerm && `(filtered)`}
            </h2>
            <Badge variant="secondary" className="text-sm">
              Showing {filteredClosedIssues.length} of {mockClosedIssues.length}
            </Badge>
          </div>
          
          {filteredClosedIssues.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-muted-foreground text-lg">
                {searchTerm ? 'No closed issues match your search.' : 'No closed issues yet.'}
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredClosedIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onVote={handleVote}
                  onAddCustomerData={handleAddCustomerData}
                  onReopenIssue={handleReopenIssue}
                  hasVoted={votedIssues.has(issue.id)}
                  showCloseButton={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClosedIssues;