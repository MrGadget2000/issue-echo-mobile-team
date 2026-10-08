CREATE OR REPLACE FUNCTION private.current_poll_week() RETURNS date
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT date_trunc('week', (now() AT TIME ZONE 'Pacific/Auckland'))::date
$$;

CREATE TABLE public.poll_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 300),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.poll_questions TO authenticated;
GRANT ALL ON public.poll_questions TO service_role;
ALTER TABLE public.poll_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can view poll questions" ON public.poll_questions
  FOR SELECT TO authenticated USING (private.is_approved(auth.uid()));

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  user_id uuid NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, user_id)
);
GRANT SELECT ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own poll votes" ON public.poll_votes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all poll votes" ON public.poll_votes
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Current week's question: this week's, else the most recent earlier one
CREATE OR REPLACE FUNCTION public.get_current_poll() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _week date := private.current_poll_week(); _q text; _my int; _counts jsonb; _total int;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_approved(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT question INTO _q FROM poll_questions WHERE week_start <= _week ORDER BY week_start DESC LIMIT 1;
  SELECT score INTO _my FROM poll_votes WHERE week_start = _week AND user_id = auth.uid();
  IF _my IS NOT NULL OR private.has_role(auth.uid(), 'admin'::app_role) THEN
    SELECT coalesce(jsonb_object_agg(score::text, c), '{}'::jsonb), coalesce(sum(c),0)::int INTO _counts, _total
      FROM (SELECT score, count(*) c FROM poll_votes WHERE week_start = _week GROUP BY score) s;
  END IF;
  RETURN jsonb_build_object('week_start', _week, 'question', _q, 'my_score', _my, 'counts', _counts, 'total', _total);
END $$;

CREATE OR REPLACE FUNCTION public.cast_poll_vote(_score integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _week date := private.current_poll_week();
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_approved(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _score < 1 OR _score > 10 THEN RAISE EXCEPTION 'score must be 1-10'; END IF;
  IF NOT EXISTS (SELECT 1 FROM poll_questions WHERE week_start <= _week) THEN RAISE EXCEPTION 'no poll question set'; END IF;
  INSERT INTO poll_votes (week_start, user_id, score) VALUES (_week, auth.uid(), _score)
    ON CONFLICT (week_start, user_id) DO NOTHING;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.set_poll_question(_question text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _week date := private.current_poll_week();
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'admins only'; END IF;
  INSERT INTO poll_questions (week_start, question, created_by) VALUES (_week, btrim(_question), auth.uid())
    ON CONFLICT (week_start) DO UPDATE SET question = EXCLUDED.question, created_by = EXCLUDED.created_by;
  RETURN true;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_current_poll(), public.cast_poll_vote(integer), public.set_poll_question(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_poll(), public.cast_poll_vote(integer), public.set_poll_question(text) TO authenticated;