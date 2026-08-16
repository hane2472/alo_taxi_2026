import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "success";
}) {
  return (
    <Card className={cn("shadow-none", tone === "primary" && "bg-accent", tone === "success" && "bg-success/10")}>
      <CardContent className="p-4">
        <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="num mt-1 truncate text-lg font-extrabold lg:text-xl">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
