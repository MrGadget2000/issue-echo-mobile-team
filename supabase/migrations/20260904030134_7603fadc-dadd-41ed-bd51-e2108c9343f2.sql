CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_approved(uuid) SET SCHEMA private;
ALTER FUNCTION public.set_updated_at() SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path TO public;
ALTER FUNCTION private.is_approved(uuid) SET search_path TO public;
ALTER FUNCTION private.set_updated_at() SET search_path TO public;
ALTER FUNCTION private.handle_new_user() SET search_path TO public;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_approved(uuid) TO authenticated;