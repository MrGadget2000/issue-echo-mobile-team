-- Internal helpers (RLS / triggers only): no client EXECUTE needed
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Admin RPCs called from the app: lock down to authenticated only
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.grant_admin_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_user_approved(uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_approved(uuid, boolean) TO authenticated;