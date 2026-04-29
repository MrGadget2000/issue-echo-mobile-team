
-- Issues table
CREATE TABLE public.issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  workaround_available TEXT,
  customer_impact TEXT CHECK (customer_impact IN ('none','low','medium','high')),
  team_impact TEXT CHECK (team_impact IN ('none','low','medium','high')),
  effort_estimate TEXT,
  churn_risk BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  customer_name TEXT,
  order_id TEXT,
  phone_number TEXT,
  service_type TEXT,
  additional_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.issue_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_examples_issue ON public.customer_examples(issue_id);
CREATE INDEX idx_issue_votes_issue ON public.issue_votes(issue_id);
CREATE INDEX idx_issue_votes_voter ON public.issue_votes(issue_id, voter_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_votes ENABLE ROW LEVEL SECURITY;

-- Open access policies (collaborative tracker, no auth yet)
CREATE POLICY "Anyone can view issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Anyone can create issues" ON public.issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update issues" ON public.issues FOR UPDATE USING (true);

CREATE POLICY "Anyone can view customer examples" ON public.customer_examples FOR SELECT USING (true);
CREATE POLICY "Anyone can add customer examples" ON public.customer_examples FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view votes" ON public.issue_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can cast votes" ON public.issue_votes FOR INSERT WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER issues_set_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
