import type { ReactNode } from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";

export function LoadingState({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = "لا توجد بيانات",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card py-12 text-center">
      <Inbox className="size-7 text-muted-foreground" />
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "حدث خطأ أثناء جلب البيانات" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-10 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm font-medium text-destructive">{message}</p>
    </div>
  );
}
