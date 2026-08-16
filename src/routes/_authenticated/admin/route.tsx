import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useProfile } from "@/lib/session";
import { LoadingState } from "@/components/States";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && profile && profile.role !== "admin") {
      navigate({ to: "/home", replace: true });
    }
  }, [profile, isLoading, navigate]);

  if (isLoading || !profile) return <LoadingState />;
  if (profile.role !== "admin") return <LoadingState label="جاري التحويل…" />;

  return <Outlet />;
}
