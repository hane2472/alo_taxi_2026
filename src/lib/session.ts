import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SessionProfile = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  role: "admin" | "user";
};

export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}

export function useProfile() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SessionProfile | null> => {
      if (!userId) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, is_active").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      const role = (roles ?? []).some((r) => r.role === "admin") ? "admin" : "user";
      return {
        id: userId,
        full_name: profile?.full_name || profile?.email || "مستخدم",
        email: profile?.email ?? null,
        is_active: profile?.is_active ?? true,
        role,
      };
    },
  });
}

export function useCurrentPeriod() {
  return useQuery({
    queryKey: ["current-period"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_periods")
        .select("id, name, start_date, end_date, status")
        .eq("status", "open")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
