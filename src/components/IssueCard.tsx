import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ThumbsUp, Users, Clock, Phone, Package, X } from 'lucide-react';
import { Issue } from '@/types/issue';
import { CustomerDataForm } from './CustomerDataForm';
import { formatDistanceToNow } from 'date-fns';

interface IssueCardProps {
  issue: Issue;
  onVote: (issueId: string) => void;
  onAddCustomerData: (issueId: string, customerData: any) => void;
  onCloseIssue?: (issueId: string) => void;
  hasVoted: boolean;
  showCloseButton?: boolean;
}

export function IssueCard({ issue, onVote, onAddCustomerData, onCloseIssue, hasVoted, showCloseButton = true }: IssueCardProps) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const handleVote = () => {
    if (!hasVoted) {
      onVote(issue.id);
    }
  };

  const handleCustomerDataSubmit = (data: any) => {
    onAddCustomerData(issue.id, data);
    setShowCustomerForm(false);
  };

  return (
    <Card className={`w-full bg-gradient-card border-border shadow-card hover:shadow-hover transition-smooth ${issue.closed ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className={`text-lg font-semibold pr-4 ${issue.closed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {issue.title}
            {issue.closed && (
              <Badge variant="secondary" className="ml-2 text-xs bg-muted">
                CLOSED
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {issue.votes}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(issue.createdAt, { addSuffix: true })}
            </Badge>
            {issue.closed && issue.closedAt && (
              <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                <X className="h-3 w-3" />
                Closed {formatDistanceToNow(issue.closedAt, { addSuffix: true })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">{issue.description}</p>
        
        {issue.customerData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Customer Examples ({issue.customerData.length})
            </h4>
            <div className="grid gap-2 max-h-32 overflow-y-auto">
              {issue.customerData.slice(0, 3).map((data, index) => (
                <div key={index} className="text-xs bg-muted/50 rounded-md p-2 border">
                  <div className="flex flex-wrap gap-2">
                    {data.customerName && (
                      <span className="text-foreground font-medium">{data.customerName}</span>
                    )}
                    {data.orderId && (
                      <span className="text-muted-foreground">#{data.orderId}</span>
                    )}
                    {data.phoneNumber && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {data.phoneNumber}
                      </span>
                    )}
                    {data.serviceType && (
                      <Badge variant="outline" className="text-xs">
                        {data.serviceType}
                      </Badge>
                    )}
                  </div>
                  {data.additionalDetails && (
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      {data.additionalDetails}
                    </p>
                  )}
                </div>
              ))}
              {issue.customerData.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{issue.customerData.length - 3} more examples...
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant={hasVoted ? "secondary" : "default"}
            size="sm"
            onClick={handleVote}
            disabled={hasVoted || issue.closed}
            className={`flex items-center gap-2 transition-bounce ${
              hasVoted ? 'bg-vote text-vote-foreground' : ''
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${hasVoted ? 'fill-current' : ''}`} />
            {hasVoted ? 'Voted' : 'Me Too'}
          </Button>
          
          <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={issue.closed}
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Add Example
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Customer Example</DialogTitle>
              </DialogHeader>
              <CustomerDataForm
                onSubmit={handleCustomerDataSubmit}
                onCancel={() => setShowCustomerForm(false)}
              />
            </DialogContent>
          </Dialog>
          
          {showCloseButton && !issue.closed && onCloseIssue && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCloseIssue(issue.id)}
              className="flex items-center gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground ml-auto"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}