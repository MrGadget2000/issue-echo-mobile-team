ALTER TABLE public.poll_questions ADD COLUMN closed_at timestamptz;
ALTER TABLE public.poll_questions DROP CONSTRAINT poll_questions_week_start_key;
ALTER TABLE public.poll_votes ADD COLUMN poll_id uuid REFERENCES public.poll_questions(id) ON DELETE CASCADE;
UPDATE public.poll_votes v SET poll_id = (SELECT q.id FROM public.poll_questions q WHERE q.week_start <= v.week_start ORDER BY q.week_start DESC, q.created_at DESC LIMIT 1) WHERE poll_id IS NULL;
UPDATE public.poll_questions q SET closed_at = now() WHERE q.id <> (SELECT id FROM public.poll_questions ORDER BY created_at DESC LIMIT 1);
ALTER TABLE public.poll_votes DROP CONSTRAINT poll_votes_week_start_user_id_key;
ALTER TABLE public.poll_votes ADD CONSTRAINT poll_votes_poll_week_user_key UNIQUE (poll_id, week_start, user_id);

CREATE OR REPLACE FUNCTION private.current_poll_id() RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT id FROM public.poll_questions WHERE closed_at IS NULL ORDER BY created_at DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.start_new_poll(_question text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'admins only'; END IF;
  UPDATE poll_questions SET closed_at = now() WHERE closed_at IS NULL;
  INSERT INTO poll_questions (week_start, question, created_by) VALUES (private.current_poll_week(), btrim(_question), auth.uid()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.close_current_poll() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'admins only'; END IF;
  UPDATE poll_questions SET closed_at = now() WHERE closed_at IS NULL;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.set_poll_question(_question text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.start_new_poll(_question);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.cast_poll_vote(_score integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _week date := private.current_poll_week(); _poll uuid := private.current_poll_id();
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_approved(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _score < 1 OR _score > 10 THEN RAISE EXCEPTION 'score must be 1-10'; END IF;
  IF _poll IS NULL THEN RAISE EXCEPTION 'no open poll'; END IF;
  INSERT INTO poll_votes (poll_id, week_start, user_id, score) VALUES (_poll, _week, auth.uid(), _score)
    ON CONFLICT (poll_id, week_start, user_id) DO NOTHING;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.get_current_poll() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _week date := private.current_poll_week(); _poll uuid := private.current_poll_id(); _q text; _started timestamptz; _my int; _counts jsonb; _total int;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_approved(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT question, created_at INTO _q, _started FROM poll_questions WHERE id = _poll;
  SELECT score INTO _my FROM poll_votes WHERE poll_id = _poll AND week_start = _week AND user_id = auth.uid();
  IF _poll IS NOT NULL AND (_my IS NOT NULL OR private.has_role(auth.uid(), 'admin'::app_role)) THEN
    SELECT coalesce(jsonb_object_agg(score::text, c), '{}'::jsonb), coalesce(sum(c),0)::int INTO _counts, _total
      FROM (SELECT score, count(*) c FROM poll_votes WHERE poll_id = _poll AND week_start = _week GROUP BY score) s;
  END IF;
  RETURN jsonb_build_object('poll_id', _poll, 'week_start', _week, 'started_at', _started, 'question', _q, 'my_score', _my, 'counts', _counts, 'total', _total);
END $$;

REVOKE EXECUTE ON FUNCTION public.start_new_poll(text), public.close_current_poll() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_new_poll(text), public.close_current_poll() TO authenticated;
REVOKE EXECUTE ON FUNCTION private.current_poll_id() FROM PUBLIC, anon;