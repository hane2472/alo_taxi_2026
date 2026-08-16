import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { AUDIT_ACTION_LABEL, formatDateTime } from "@/lib/format";

const PAGE_SIZE = 50;

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => ({
    meta: [
      { title: "سجل النشاط — ألو تكسي" },
      { name: "description", content: "سجل كامل لعمليات الطلبات والمستخدمين والكباتن والدورات." },
      { property: "og:title", content: "سجل النشاط — ألو تكسي" },
      { property: "og:description", content: "تتبع كل العمليات داخل نظام ألو تكسي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminActivity,
});

type LogRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user_name: string | null;
  total_count: number;
};

const FIELD_LABEL: Record<string, string> = {
  amount: "القيمة",
  commission_amount: "العمولة",
  commission_percentage_snapshot: "نسبة العمولة",
  pct: "نسبة العمولة",
  captain_id: "الكابتن",
  order_date: "تاريخ الطلب",
  status: "الحالة",
  deletion_reason: "سبب الحذف",
  full_name: "الاسم",
  name: "الاسم",
  role: "الصلاحية",
  is_active: "الحالة",
  note: "ملاحظة الإغلاق",
  deleted_at: "وقت الحذف",
};

const TRACKED = Object.keys(FIELD_LABEL);

function diffOf(row: LogRow) {
  const oldD = (row.old_data ?? {}) as Record<string, unknown>;
  const newD = (row.new_data ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(oldD), ...Object.keys(newD)])).filter(
    (k) => TRACKED.includes(k) && JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]),
  );
  return keys.map((k) => ({
    label: FIELD_LABEL[k] ?? k,
    before: format(oldD[k]),
    after: format(newD[k]),
  }));
}

function format(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "مُفعّل" : "معطّل";
  return String(v);
}

function AdminActivity() {
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(0);

  const logs = useQuery({
    queryKey: ["admin-audit", action, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_audit", {
        p_action: action === "all" ? undefined : action,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
  });

  const rows = logs.data ?? [];
  const total = rows[0]?.total_count ?? 0;

  return (
    <AppShell title="سجل النشاط">
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمليات</SelectItem>
                {Object.entries(AUDIT_ACTION_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {logs.isLoading ? (
          <LoadingState />
        ) : logs.isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="لا توجد عمليات مسجّلة" />
        ) : (
          <>
            <div className="space-y-2">
              {rows.map((r) => {
                const changes = diffOf(r);
                return (
                  <Card key={r.id} className="shadow-none">
                    <CardContent className="space-y-2 p-3">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <History className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">
                            {AUDIT_ACTION_LABEL[r.action] ?? r.action}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {r.user_name || "—"} · {formatDateTime(r.created_at)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {r.entity_type ?? "—"}
                        </Badge>
                      </div>

                      {changes.length > 0 && (
                        <div className="space-y-1 rounded-lg bg-muted/50 p-2">
                          {changes.map((c) => (
                            <div
                              key={c.label}
                              className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-[11px]"
                            >
                              <span className="text-muted-foreground">{c.label}:</span>
                              <span className="num truncate">
                                <span className="text-destructive line-through">{c.before}</span>
                                {" → "}
                                <span className="font-semibold text-success">{c.after}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                السابق
              </Button>
              <p className="num text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + rows.length} من {total}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
