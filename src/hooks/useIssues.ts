import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Issue, CustomerData } from '@/types/issue';

const VOTER_KEY = 'issue-tracker-voter-id';

function getVoterId(): string {
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = `voter-${crypto.randomUUID()}`;
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

type DbIssueRow = {
  id: string;
  title: string;
  description: string;
  votes: number;
  closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  workaround_available: string | null;
  customer_impact: string | null;
  team_impact: string | null;
  effort_estimate: string | null;
  churn_risk: boolean | null;
  created_at: string;
  updated_at: string;
};

type DbExampleRow = {
  id: string;
  issue_id: string;
  customer_name: string | null;
  order_id: string | null;
  phone_number: string | null;
  service_type: string | null;
  additional_details: string | null;
};

type DbVoteRow = {
  issue_id: string;
  voter_id: string;
  created_at: string;
};

const COOLDOWN_MS = 5 * 60 * 1000;

export function useIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteTimestamps, setVoteTimestamps] = useState<Map<string, number>>(new Map());
  const voterId = getVoterId();

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [issuesRes, examplesRes, votesRes] = await Promise.all([
      supabase.from('issues').select('*').order('created_at', { ascending: false }),
      supabase.from('customer_examples').select('*'),
      supabase.from('issue_votes').select('issue_id, voter_id, created_at'),
    ]);

    const issueRows = (issuesRes.data ?? []) as DbIssueRow[];
    const exampleRows = (examplesRes.data ?? []) as DbExampleRow[];
    const voteRows = (votesRes.data ?? []) as DbVoteRow[];

    const examplesByIssue = new Map<string, CustomerData[]>();
    exampleRows.forEach((row) => {
      const list = examplesByIssue.get(row.issue_id) ?? [];
      list.push({
        customerName: row.customer_name ?? undefined,
        orderId: row.order_id ?? undefined,
        phoneNumber: row.phone_number ?? undefined,
        serviceType: row.service_type ?? undefined,
        additionalDetails: row.additional_details ?? undefined,
      });
      examplesByIssue.set(row.issue_id, list);
    });

    const votersByIssue = new Map<string, string[]>();
    const myLatestVote = new Map<string, number>();
    voteRows.forEach((row) => {
      const list = votersByIssue.get(row.issue_id) ?? [];
      list.push(row.voter_id);
      votersByIssue.set(row.issue_id, list);
      if (row.voter_id === voterId) {
        const ts = new Date(row.created_at).getTime();
        const existing = myLatestVote.get(row.issue_id) ?? 0;
        if (ts > existing) myLatestVote.set(row.issue_id, ts);
      }
    });

    const mapped: Issue[] = issueRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      votes: row.votes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      closed: row.closed,
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
      closedBy: row.closed_by ?? undefined,
      votedBy: votersByIssue.get(row.id) ?? [],
      customerData: examplesByIssue.get(row.id) ?? [],
      workaroundAvailable: row.workaround_available ?? undefined,
      customerImpact: (row.customer_impact as Issue['customerImpact']) ?? undefined,
      teamImpact: (row.team_impact as Issue['teamImpact']) ?? undefined,
      effortEstimate: row.effort_estimate ?? undefined,
      churnRisk: row.churn_risk ?? undefined,
    }));

    setIssues(mapped);
    setVoteTimestamps(myLatestVote);
    setLoading(false);
  }, [voterId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createIssue = useCallback(async (
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
    const { data: created, error } = await supabase
      .from('issues')
      .insert({
        title,
        description,
        votes: 1,
        workaround_available: impactData?.workaroundAvailable,
        customer_impact: impactData?.customerImpact,
        team_impact: impactData?.teamImpact,
        effort_estimate: impactData?.effortEstimate,
        churn_risk: impactData?.churnRisk ?? false,
      })
      .select()
      .single();
    if (error || !created) throw error ?? new Error('Failed to create issue');

    await supabase.from('issue_votes').insert({ issue_id: created.id, voter_id: voterId });

    if (customerData) {
      await supabase.from('customer_examples').insert({
        issue_id: created.id,
        customer_name: customerData.customerName,
        order_id: customerData.orderId,
        phone_number: customerData.phoneNumber,
        service_type: customerData.serviceType,
        additional_details: customerData.additionalDetails,
      });
    }
    await loadAll();
  }, [voterId, loadAll]);

  const voteIssue = useCallback(async (issueId: string): Promise<{ ok: boolean; remainingMinutes?: number }> => {
    const now = Date.now();
    const last = voteTimestamps.get(issueId) ?? 0;
    if (now - last < COOLDOWN_MS) {
      return { ok: false, remainingMinutes: Math.ceil((COOLDOWN_MS - (now - last)) / 60000) };
    }
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return { ok: false };

    await supabase.from('issue_votes').insert({ issue_id: issueId, voter_id: voterId });
    await supabase.from('issues').update({ votes: issue.votes + 1 }).eq('id', issueId);

    setVoteTimestamps((prev) => new Map(prev).set(issueId, now));
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, votes: i.votes + 1, votedBy: [...i.votedBy, voterId] } : i))
    );
    return { ok: true };
  }, [issues, voteTimestamps, voterId]);

  const addCustomerData = useCallback(async (issueId: string, data: CustomerData) => {
    await supabase.from('customer_examples').insert({
      issue_id: issueId,
      customer_name: data.customerName,
      order_id: data.orderId,
      phone_number: data.phoneNumber,
      service_type: data.serviceType,
      additional_details: data.additionalDetails,
    });
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, customerData: [...i.customerData, data], updatedAt: new Date() } : i
      )
    );
  }, []);

  const closeIssue = useCallback(async (issueId: string) => {
    const closedAt = new Date();
    await supabase
      .from('issues')
      .update({ closed: true, closed_at: closedAt.toISOString(), closed_by: voterId })
      .eq('id', issueId);
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, closed: true, closedAt, closedBy: voterId } : i))
    );
  }, [voterId]);

  const reopenIssue = useCallback(async (issueId: string) => {
    await supabase
      .from('issues')
      .update({ closed: false, closed_at: null, closed_by: null })
      .eq('id', issueId);
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, closed: false, closedAt: undefined, closedBy: undefined } : i))
    );
  }, []);

  const hasVoted = useCallback((issueId: string) => voteTimestamps.has(issueId), [voteTimestamps]);

  const cooldownRemaining = useCallback((issueId: string): number => {
    const last = voteTimestamps.get(issueId) ?? 0;
    return Math.max(0, COOLDOWN_MS - (Date.now() - last));
  }, [voteTimestamps]);

  return {
    issues,
    loading,
    createIssue,
    voteIssue,
    addCustomerData,
    closeIssue,
    reopenIssue,
    hasVoted,
    cooldownRemaining,
    refresh: loadAll,
  };
}
