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
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');
    const admins = (roles ?? []).filter((r: any) => r.role === 'admin');
    setAnyAdminExists(admins.length > 0);
    setIsAdmin(!!user && admins.some((r: any) => r.user_id === user.id));
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [user?.id, authLoading]);

  return { isAdmin, anyAdminExists, loading, refresh };
}
