CREATE TABLE public.deletion_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL,
  issue_title TEXT NOT NULL,
  issue_description TEXT,
  deleted_by UUID,
  deleted_by_email TEXT,
  examples_count INTEGER NOT NULL DEFAULT 0,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.deletion_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit log"
ON public.deletion_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = deleted_by);

CREATE POLICY "Admins can delete audit log"
ON public.deletion_audit_log
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_deletion_audit_log_created_at ON public.deletion_audit_log(created_at DESC);