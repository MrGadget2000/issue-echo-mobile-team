CREATE TABLE public.teams (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 1 AND 100), parent_id uuid REFERENCES public.teams(id), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated USING (private.is_approved(auth.uid()) OR private.has_role(auth.uid(),'admin'));
CREATE TABLE public.team_memberships (user_id uuid PRIMARY KEY, team_id uuid NOT NULL REFERENCES public.teams(id));
GRANT SELECT ON public.team_memberships TO authenticated;
GRANT ALL ON public.team_memberships TO service_role;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_read ON public.team_memberships FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin') OR user_id=auth.uid());
ALTER TABLE public.issues ADD COLUMN team_snapshot jsonb;
ALTER TABLE public.poll_votes ADD COLUMN team_snapshot jsonb;
CREATE OR REPLACE FUNCTION public.manage_team(_id uuid, _name text, _parent uuid, _archive boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; BEGIN
IF NOT private.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
PERFORM pg_advisory_xact_lock(987654321);
IF _parent IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.teams WHERE id=_parent AND active) THEN RAISE EXCEPTION 'Choose an active parent team'; END IF;
IF _id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.teams WHERE id=_id AND active) THEN RAISE EXCEPTION 'Team not found'; END IF;
IF _id IS NOT NULL AND _parent IS NOT NULL AND EXISTS(WITH RECURSIVE ancestors AS (SELECT id,parent_id FROM public.teams WHERE id=_parent UNION ALL SELECT t.id,t.parent_id FROM public.teams t JOIN ancestors a ON t.id=a.parent_id) SELECT 1 FROM ancestors WHERE id=_id) THEN RAISE EXCEPTION 'A team cannot roll up into itself or its own subteam'; END IF;
IF _archive THEN
IF _id IS NULL THEN RAISE EXCEPTION 'Team required'; END IF;
IF EXISTS(SELECT 1 FROM public.teams WHERE parent_id=_id AND active) THEN RAISE EXCEPTION 'Move or remove subteams first'; END IF;
DELETE FROM public.team_memberships WHERE team_id=_id;
UPDATE public.teams SET active=false WHERE id=_id; RETURN _id;
END IF;
IF _name IS NULL OR char_length(btrim(_name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Team name must be 1–100 characters'; END IF;
IF _id IS NULL THEN INSERT INTO public.teams(name,parent_id) VALUES(btrim(_name),_parent) RETURNING id INTO result;
ELSE UPDATE public.teams SET name=btrim(_name),parent_id=_parent WHERE id=_id RETURNING id INTO result; END IF;
RETURN result; END $$;
CREATE OR REPLACE FUNCTION public.assign_team(_user_id uuid, _team_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT private.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
PERFORM pg_advisory_xact_lock(987654321);
IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=_user_id) THEN RAISE EXCEPTION 'Person not found'; END IF;
IF _team_id IS NULL THEN DELETE FROM public.team_memberships WHERE user_id=_user_id;
ELSE
IF NOT EXISTS(SELECT 1 FROM public.teams WHERE id=_team_id AND active) THEN RAISE EXCEPTION 'Team not found'; END IF;
INSERT INTO public.team_memberships(user_id,team_id) VALUES(_user_id,_team_id) ON CONFLICT(user_id) DO UPDATE SET team_id=excluded.team_id;
END IF; END $$;
CREATE OR REPLACE FUNCTION private.submission_team_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE member uuid; BEGIN
IF TG_OP='UPDATE' THEN NEW.team_snapshot:=OLD.team_snapshot; RETURN NEW; END IF;
IF TG_TABLE_NAME='issues' THEN member:=NEW.created_by; ELSE member:=NEW.user_id; END IF;
WITH RECURSIVE ancestry AS (
SELECT t.id,t.name,t.parent_id,0 depth FROM public.teams t JOIN public.team_memberships m ON m.team_id=t.id WHERE m.user_id=member AND t.active
UNION ALL SELECT t.id,t.name,t.parent_id,a.depth+1 FROM public.teams t JOIN ancestry a ON t.id=a.parent_id
) SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY depth),'[]'::jsonb) INTO NEW.team_snapshot FROM ancestry;
RETURN NEW; END $$;
CREATE TRIGGER issues_team_snapshot BEFORE INSERT OR UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION private.submission_team_snapshot();
CREATE TRIGGER poll_votes_team_snapshot BEFORE INSERT OR UPDATE ON public.poll_votes FOR EACH ROW EXECUTE FUNCTION private.submission_team_snapshot();
CREATE OR REPLACE FUNCTION public.get_poll_team_results(_poll_id uuid, _historical boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE admin boolean:=private.has_role(auth.uid(),'admin'); result jsonb;
BEGIN
IF auth.uid() IS NULL OR NOT private.is_approved(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF _historical AND NOT admin THEN RAISE EXCEPTION 'Admins only'; END IF;
IF NOT _historical THEN
IF _poll_id IS DISTINCT FROM private.current_poll_id() THEN RAISE EXCEPTION 'Current poll only'; END IF;
IF NOT admin AND NOT EXISTS(SELECT 1 FROM public.poll_votes WHERE poll_id=_poll_id AND user_id=auth.uid() AND week_start=private.current_poll_week()) THEN RAISE EXCEPTION 'Vote to see results'; END IF;
END IF;
WITH votes AS (SELECT id,score,answer,team_snapshot FROM public.poll_votes WHERE poll_id=_poll_id AND (_historical OR week_start=private.current_poll_week())), expanded AS (
SELECT v.id,v.score,v.answer,x->>'id' team_id,x->>'name' name FROM votes v CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN coalesce(jsonb_array_length(v.team_snapshot),0)=0 THEN '[{"id":"unassigned","name":"Unassigned / not recorded"}]'::jsonb ELSE v.team_snapshot END) x
), groups AS (SELECT team_id, max(name) name,count(*) total,avg(score) average,jsonb_agg(answer) FILTER(WHERE answer IS NOT NULL) answers FROM expanded GROUP BY team_id)
SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.team_id,'name',g.name,'total',g.total,'average',g.average,'answers',coalesce(g.answers,'[]'::jsonb),'counts',coalesce((SELECT jsonb_object_agg(label,n) FROM (SELECT coalesce(e.score::text,e.answer) label,count(*) n FROM expanded e WHERE e.team_id=g.team_id AND coalesce(e.score::text,e.answer) IS NOT NULL GROUP BY coalesce(e.score::text,e.answer)) c),'{}'::jsonb)) ORDER BY g.name),'[]'::jsonb) INTO result FROM groups g;
RETURN result; END $$;
REVOKE ALL ON FUNCTION public.manage_team(uuid,text,uuid,boolean), public.assign_team(uuid,uuid), public.get_poll_team_results(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_team(uuid,text,uuid,boolean), public.assign_team(uuid,uuid), public.get_poll_team_results(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION private.submission_team_snapshot() FROM PUBLIC,anon,authenticated;