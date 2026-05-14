-- 1. Add approved flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- 2. Helper: is_approved (admins are always approved)
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND approved = true)
  );
$$;

-- 3. Admin-only approve/unapprove RPC
CREATE OR REPLACE FUNCTION public.set_user_approved(_user_id uuid, _approved boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval status';
  END IF;
  UPDATE public.profiles SET approved = _approved WHERE user_id = _user_id;
  RETURN TRUE;
END;
$$;

-- 4. Auto-approve any existing admins so they don't get locked out
UPDATE public.profiles p
SET approved = true
WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'admin');

-- 5. Tighten RLS: replace public-read policies with approved-only

-- issues
DROP POLICY IF EXISTS "Anyone can view issues" ON public.issues;
CREATE POLICY "Approved users can view issues"
  ON public.issues FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.issues;
CREATE POLICY "Approved users can create issues"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Anyone can update issues" ON public.issues;
CREATE POLICY "Approved users can update issues"
  ON public.issues FOR UPDATE
  TO authenticated
  USING (public.is_approved(auth.uid()));

-- customer_examples
DROP POLICY IF EXISTS "Anyone can view customer examples" ON public.customer_examples;
CREATE POLICY "Approved users can view customer examples"
  ON public.customer_examples FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Anyone can add customer examples" ON public.customer_examples;
CREATE POLICY "Approved users can add customer examples"
  ON public.customer_examples FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

-- issue_votes
DROP POLICY IF EXISTS "Anyone can view votes" ON public.issue_votes;
CREATE POLICY "Approved users can view votes"
  ON public.issue_votes FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can cast votes" ON public.issue_votes;
CREATE POLICY "Approved users can cast votes"
  ON public.issue_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

-- profiles: keep so users can always see their own row (to learn their approval status);
-- approved users + admins can see all.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Approved users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));