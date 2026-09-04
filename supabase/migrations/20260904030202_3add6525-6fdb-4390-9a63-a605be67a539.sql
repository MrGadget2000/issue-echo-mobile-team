CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _target UUID;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant admin role';
  END IF;
  SELECT user_id INTO _target FROM public.profile_emails WHERE lower(email) = lower(_email) LIMIT 1;
  IF _target IS NULL THEN
    RAISE EXCEPTION 'No user with that email';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin') ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_admin(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke admin role';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_user_approved(_user_id uuid, _approved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change approval status';
  END IF;
  UPDATE public.profiles SET approved = _approved WHERE user_id = _user_id;
  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_approved(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_approved(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;