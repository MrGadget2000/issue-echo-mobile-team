DROP VIEW IF EXISTS public.profiles_directory;

-- Separate, protected email storage
CREATE TABLE IF NOT EXISTS public.profile_emails (
  user_id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profile_emails TO authenticated;
GRANT ALL ON public.profile_emails TO service_role;
ALTER TABLE public.profile_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own email" ON public.profile_emails;
CREATE POLICY "Users can view their own email"
ON public.profile_emails FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view emails" ON public.profile_emails;
CREATE POLICY "Admins can view emails"
ON public.profile_emails FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.profile_emails (user_id, email)
SELECT user_id, email FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Approved members may read the non-sensitive profile directory
DROP POLICY IF EXISTS "Approved users can view profile directory" ON public.profiles;
CREATE POLICY "Approved users can view profile directory"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_approved(auth.uid()));

-- Keep signup trigger in sync with the new table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.profile_emails (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- grant_admin_by_email must read the new email table
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _target UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant admin role';
  END IF;
  SELECT user_id INTO _target FROM public.profile_emails WHERE lower(email) = lower(_email) LIMIT 1;
  IF _target IS NULL THEN
    RAISE EXCEPTION 'No user with that email';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;