import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Clock, Phone, Package, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Issue, UserProfile } from '@/types/issue';
import { sanitizeHtml } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';

interface IssueDetailDialogProps {
  issue: Issue;
  profiles: Map<string, UserProfile>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type VoteEntry = { userId: string | null; createdAt: Date };

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground font-medium">{sanitizeHtml(value)}</span>
    </div>
  );
}

export function IssueDetailDialog({ issue, profiles, open, onOpenChange }: IssueDetailDialogProps) {
  const [votes, setVotes] = useState<VoteEntry[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingVotes(true);
    supabase
      .from('issue_votes')
      .select('user_id, created_at')
      .eq('issue_id', issue.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setVotes(
          (data ?? []).map((r: { user_id: string | null; created_at: string }) => ({
            userId: r.user_id,
            createdAt: new Date(r.created_at),
          }))
        );
        setLoadingVotes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, issue.id]);

  const nameFor = (userId: string | null) => {
    if (!userId) return 'Anonymous';
    const p = profiles.get(userId);
    return p?.displayName ?? p?.email ?? 'Team member';
  };

  const uniqueVoters = Array.from(new Set(votes.map((v) => v.userId ?? 'anon')));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl">{sanitizeHtml(issue.title)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
              Area: {issue.issueArea ?? 'Unspecified'}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {issue.votes} votes
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Raised {format(issue.createdAt, 'd MMM yyyy, h:mmaaa')}
            </Badge>
            {issue.closed && <Badge variant="secondary" className="bg-muted">CLOSED</Badge>}
            {issue.churnRisk && <Badge variant="destructive">Churn risk</Badge>}
          </div>

          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {sanitizeHtml(issue.description)}
          </p>

          <Separator />

          <div className="space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Reported by
            </h4>
            <p className="text-sm text-muted-foreground">
              {issue.createdByProfile?.displayName ??
                issue.createdByProfile?.email ??
                (issue.createdBy ? nameFor(issue.createdBy) : 'Unknown')}
              {' · '}
              {formatDistanceToNow(issue.createdAt, { addSuffix: true })}
            </p>
            {issue.closed && issue.closedAt && (
              <p className="text-sm text-muted-foreground">
                Closed by {nameFor(issue.closedBy ?? null)} on {format(issue.closedAt, 'd MMM yyyy, h:mmaaa')}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Details</h4>
            <div className="grid gap-1 sm:grid-cols-2">
              <Field label="Workaround" value={issue.workaroundAvailable} />
              <Field label="Customer impact" value={issue.customerImpact} />
              <Field label="Team impact" value={issue.teamImpact} />
              <Field label="Effort estimate" value={issue.effortEstimate} />
              <Field label="Churn risk" value={issue.churnRisk ? 'Yes' : 'No'} />
              <Field label="Last updated" value={format(issue.updatedAt, 'd MMM yyyy, h:mmaaa')} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Also affected ({uniqueVoters.length} {uniqueVoters.length === 1 ? 'person' : 'people'}, {votes.length} total)
            </h4>
            {loadingVotes ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : votes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one has added their vote yet.</p>
            ) : (
              <ul className="space-y-1">
                {votes.map((v, i) => (
                  <li key={i} className="text-sm flex items-center justify-between gap-3 border-b border-border/50 pb-1">
                    <span className="text-foreground">{nameFor(v.userId)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(v.createdAt, { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Customer examples ({issue.customerData.length})
            </h4>
            {issue.customerData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customer or order examples added yet.</p>
            ) : (
              <div className="space-y-2">
                {issue.customerData.map((data, index) => (
                  <div key={index} className="rounded-md border bg-muted/40 p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {data.customerName && <span className="font-medium">{sanitizeHtml(data.customerName)}</span>}
                      {data.orderId && <span className="text-muted-foreground">Order #{sanitizeHtml(data.orderId)}</span>}
                      {data.phoneNumber && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {sanitizeHtml(data.phoneNumber)}
                        </span>
                      )}
                      {data.serviceType && (
                        <Badge variant="outline" className="text-xs">{sanitizeHtml(data.serviceType)}</Badge>
                      )}
                    </div>
                    {data.additionalDetails && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {sanitizeHtml(data.additionalDetails)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
