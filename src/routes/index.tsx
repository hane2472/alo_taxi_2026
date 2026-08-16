import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Car } from "lucide-react";
import { useProfile } from "@/lib/session";
import { useCurrentUserId } from "@/lib/session";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const userId = useCurrentUserId();
  const { data: profile, isLoading } = useProfile();

  useEffect(() => {
    if (userId === undefined) return;
    if (userId === null) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (profile) {
      navigate({ to: profile.role === "admin" ? "/admin" : "/home", replace: true });
    }
  }, [userId, profile, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Car className="size-7" />
      </div>
      <h1 className="text-lg font-bold">ألو تكسي</h1>
      {(isLoading || userId === undefined) && (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
