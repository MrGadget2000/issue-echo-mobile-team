-- 1. Profiles: remove broad read access
DROP POLICY IF EXISTS "Approved users can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Limited directory view: no email exposed, approved users only
CREATE OR REPLACE VIEW public.profiles_directory
WITH (security_invoker = off) AS
SELECT p.user_id, p.display_name, p.avatar_url
FROM public.profiles p
WHERE public.is_approved(auth.uid());

REVOKE ALL ON public.profiles_directory FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_directory TO authenticated;
GRANT ALL ON public.profiles_directory TO service_role;

-- 2. user_roles: restrict visibility
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. SECURITY DEFINER hardening: trigger-only helpers must not be callable
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_approved(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;