-- Tighten EXECUTE on approval-related SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.set_user_approved(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_approved(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;