import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ThumbsUp, Users, Clock, Phone, Package, X, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
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
  onDeleteIssue?: (issueId: string) => void;
  hasVoted: boolean;
  showCloseButton?: boolean;
  isAdmin?: boolean;
}

export function IssueCard({ issue, onVote, onAddCustomerData, onCloseIssue, onReopenIssue, onDeleteIssue, hasVoted, showCloseButton = true, isAdmin = false }: IssueCardProps) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

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

        {issue.createdByProfile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {issue.createdByProfile.avatarUrl ? (
              <img
                src={issue.createdByProfile.avatarUrl}
                alt={issue.createdByProfile.displayName ?? 'Reporter'}
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                {(issue.createdByProfile.displayName ?? issue.createdByProfile.email ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span>
              Reported by {issue.createdByProfile.displayName ?? issue.createdByProfile.email ?? 'Unknown'}
            </span>
          </div>
        )}

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

          {isAdmin && onDeleteIssue && (
            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                setDeleteOpen(open);
                if (!open) setDeleteConfirmText('');
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2 ml-2"
                  title="Admin: permanently delete this issue"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Permanently delete this issue?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm">
                      <p className="font-semibold text-destructive">
                        This action is irreversible. The issue cannot be recovered.
                      </p>
                      <p>
                        This will permanently remove:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>The issue <strong>"{issue.title}"</strong></li>
                        <li>All <strong>{issue.votes}</strong> vote{issue.votes !== 1 ? 's' : ''} cast by the team</li>
                        <li>All <strong>{issue.customerData.length}</strong> customer example{issue.customerData.length !== 1 ? 's' : ''} attached</li>
                      </ul>
                      <p className="text-muted-foreground">
                        Use this <strong>only for test or junk issues</strong>. To resolve a real issue, close it instead so it stays in the historical record.
                      </p>
                      <div className="pt-2">
                        <Label htmlFor={`confirm-${issue.id}`} className="text-foreground">
                          Type <span className="font-mono font-bold">DELETE</span> to confirm:
                        </Label>
                        <Input
                          id={`confirm-${issue.id}`}
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="DELETE"
                          className="mt-1"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteConfirmText !== 'DELETE'}
                    onClick={() => {
                      onDeleteIssue(issue.id);
                      setDeleteConfirmText('');
                      setDeleteOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Permanently Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}