import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [anyAdminExists, setAnyAdminExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    if (!user) {
      setIsAdmin(false);
      setAnyAdminExists(null);
      setLoading(false);
      return;
    }
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    setIsAdmin((roles ?? []).some((r: any) => r.role === 'admin'));
    // Role assignments of other users are not readable; the server decides
    // whether the first-admin claim is still available.
    setAnyAdminExists(null);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [user?.id, authLoading]);

  return { isAdmin, anyAdminExists, loading, refresh };
}
