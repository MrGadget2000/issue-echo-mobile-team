import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ThumbsUp, Users, Clock, Phone, Package, X, RotateCcw } from 'lucide-react';
import { Issue } from '@/types/issue';
import { CustomerDataForm } from './CustomerDataForm';
import { formatDistanceToNow } from 'date-fns';
import { sanitizeHtml } from '@/lib/security';

interface IssueCardProps {
  issue: Issue;
  onVote: (issueId: string) => void;
  onAddCustomerData: (issueId: string, customerData: any) => void;
  onCloseIssue?: (issueId: string) => void;
  onReopenIssue?: (issueId: string) => void;
  hasVoted: boolean;
  showCloseButton?: boolean;
}

export function IssueCard({ issue, onVote, onAddCustomerData, onCloseIssue, onReopenIssue, hasVoted, showCloseButton = true }: IssueCardProps) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const handleVote = () => {
    onVote(issue.id);
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
            {sanitizeHtml(issue.title)}
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
        <p className="text-muted-foreground leading-relaxed">{sanitizeHtml(issue.description)}</p>
        
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
                      <span className="text-foreground font-medium">{sanitizeHtml(data.customerName)}</span>
                    )}
                    {data.orderId && (
                      <span className="text-muted-foreground">#{sanitizeHtml(data.orderId)}</span>
                    )}
                    {data.phoneNumber && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {sanitizeHtml(data.phoneNumber)}
                      </span>
                    )}
                    {data.serviceType && (
                      <Badge variant="outline" className="text-xs">
                        {sanitizeHtml(data.serviceType)}
                      </Badge>
                    )}
                  </div>
                  {data.additionalDetails && (
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      {sanitizeHtml(data.additionalDetails)}
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
            disabled={issue.closed}
            className={`flex items-center gap-2 transition-bounce ${
              hasVoted ? 'bg-vote text-vote-foreground' : ''
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${hasVoted ? 'fill-current' : ''}`} />
            {hasVoted ? 'Voted (Vote Again)' : 'I have this issue also'}
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground ml-auto"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close Issue</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to close this issue? This action will mark the issue as resolved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onCloseIssue(issue.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Close Issue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {issue.closed && onReopenIssue && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReopenIssue(issue.id)}
              className="flex items-center gap-2 text-primary hover:bg-primary hover:text-primary-foreground ml-auto"
            >
              <RotateCcw className="h-4 w-4" />
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}