import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { IssueCard } from '@/components/IssueCard';
import { Search, Archive, ArrowLeft, BarChart3, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIssues } from '@/hooks/useIssues';

const ClosedIssues = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { issues, loading, reopenIssue } = useIssues();

  const closedIssues = useMemo(() => issues.filter((i) => i.closed), [issues]);

  const filteredClosedIssues = useMemo(() => {
    return closedIssues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [closedIssues, searchTerm]);

  const handleVote = () => {
    toast({
      title: 'Cannot vote on closed issues',
      description: 'This issue has been closed and is no longer accepting votes.',
      variant: 'destructive',
    });
  };

  const handleReopenIssue = async (issueId: string) => {
    await reopenIssue(issueId);
    toast({ title: 'Issue reopened', description: 'The issue has been moved back to the open issues list.' });
  };

  const handleAddCustomerData = () => {
    toast({
      title: 'Cannot add data to closed issues',
      description: 'This issue has been closed and is no longer accepting new examples.',
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Archive className="h-8 w-8" />
                Closed Issues
              </h1>
              <p className="text-primary-foreground/80 mt-1">Archive of resolved and closed issues</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{closedIssues.length}</div>
              <div className="text-sm text-primary-foreground/80">Closed Issues</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Open Issues
          </Link>
          <span className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Closed Issues
          </span>
          <Link to="/reports" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search closed issues..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="h-6 w-6 text-muted-foreground" />
              Closed Issues {searchTerm && `(filtered)`}
            </h2>
            <Badge variant="secondary" className="text-sm">
              Showing {filteredClosedIssues.length} of {closedIssues.length}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : filteredClosedIssues.length === 0 ? (
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
                  hasVoted={false}
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
