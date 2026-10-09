ALTER TABLE public.poll_questions ADD COLUMN poll_type text NOT NULL DEFAULT 'numeric' CHECK (poll_type IN ('numeric','choice','text'));
ALTER TABLE public.poll_questions ADD COLUMN options text[];
ALTER TABLE public.poll_votes ADD COLUMN answer text CHECK (answer IS NULL OR char_length(answer) <= 1000);
ALTER TABLE public.poll_votes ALTER COLUMN score DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.start_poll(_question text, _type text, _options text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid; _opts text[];
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'admins only'; END IF;
  IF _type NOT IN ('numeric','choice','text') THEN RAISE EXCEPTION 'invalid poll type'; END IF;
  IF char_length(btrim(_question)) < 3 THEN RAISE EXCEPTION 'question too short'; END IF;
  IF _type = 'choice' THEN
    SELECT array_agg(DISTINCT btrim(o)) INTO _opts FROM unnest(_options) o WHERE btrim(o) <> '';
    IF coalesce(array_length(_opts,1),0) < 2 THEN RAISE EXCEPTION 'at least 2 options required'; END IF;
  END IF;
  UPDATE poll_questions SET closed_at = now() WHERE closed_at IS NULL;
  INSERT INTO poll_questions (week_start, question, created_by, poll_type, options)
    VALUES (private.current_poll_week(), btrim(_question), auth.uid(), _type, _opts) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.cast_poll_answer(_score integer, _answer text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _week date := private.current_poll_week(); _poll uuid := private.current_poll_id(); _type text; _opts text[];
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_approved(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _poll IS NULL THEN RAISE EXCEPTION 'no open poll'; END IF;
  SELECT poll_type, options INTO _type, _opts FROM poll_questions WHERE id = _poll;
  IF _type = 'numeric' THEN
    IF _score IS NULL OR _score < 1 OR _score > 10 THEN RAISE EXCEPTION 'score must be 1-10'; END IF;
    _answer := NULL;
  ELSIF _type = 'choice' THEN
    IF _answer IS NULL OR NOT (_answer = ANY(_opts)) THEN RAISE EXCEPTION 'invalid option'; END IF;
    _score := NULL;
  ELSE
    _answer := btrim(coalesce(_answer,''));
    IF _answer = '' OR char_length(_answer) > 1000 THEN RAISE EXCEPTION 'answer must be 1-1000 characters'; END IF;
    _score := NULL;
  END IF;
  INSERT INTO poll_votes (poll_id, week_start, user_id, score, answer) VALUES (_poll, _week, auth.uid(), _score, _answer)
    ON CONFLICT (poll_id, week_start, user_id) DO NOTHING;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.get_current_poll()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _week date := private.current_poll_week(); _poll uuid := private.current_poll_id();
  _q text; _started timestamptz; _type text; _opts text[]; _voted boolean := false; _my int; _my_ans text;
  _counts jsonb; _total int; _answers jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_approved(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT question, created_at, poll_type, options INTO _q, _started, _type, _opts FROM poll_questions WHERE id = _poll;
  SELECT true, score, answer INTO _voted, _my, _my_ans FROM poll_votes WHERE poll_id = _poll AND week_start = _week AND user_id = auth.uid();
  _voted := coalesce(_voted, false);
  IF _poll IS NOT NULL AND (_voted OR private.has_role(auth.uid(), 'admin'::app_role)) THEN
    IF _type = 'numeric' THEN
      SELECT coalesce(jsonb_object_agg(score::text, c), '{}'::jsonb), coalesce(sum(c),0)::int INTO _counts, _total
        FROM (SELECT score, count(*) c FROM poll_votes WHERE poll_id = _poll AND week_start = _week AND score IS NOT NULL GROUP BY score) s;
    ELSIF _type = 'choice' THEN
      SELECT coalesce(jsonb_object_agg(answer, c), '{}'::jsonb), coalesce(sum(c),0)::int INTO _counts, _total
        FROM (SELECT answer, count(*) c FROM poll_votes WHERE poll_id = _poll AND week_start = _week AND answer IS NOT NULL GROUP BY answer) s;
    ELSE
      SELECT coalesce(jsonb_agg(answer ORDER BY created_at DESC), '[]'::jsonb), count(*)::int INTO _answers, _total
        FROM poll_votes WHERE poll_id = _poll AND week_start = _week AND answer IS NOT NULL;
      _counts := '{}'::jsonb;
    END IF;
  END IF;
  RETURN jsonb_build_object('poll_id', _poll, 'week_start', _week, 'started_at', _started, 'question', _q,
    'poll_type', coalesce(_type,'numeric'), 'options', to_jsonb(_opts), 'has_voted', _voted,
    'my_score', _my, 'my_answer', _my_ans, 'counts', _counts, 'total', _total, 'answers', _answers);
END $$;

REVOKE EXECUTE ON FUNCTION public.start_poll(text, text, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cast_poll_answer(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_poll(text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_poll_answer(integer, text) TO authenticated;