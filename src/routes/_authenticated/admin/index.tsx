import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import {
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  ORDER_STATUS_LABEL,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — ألو تكسي" },
      { name: "description", content: "إحصائيات الدورة الحالية: الطلبات والعمولات والكباتن والموظفون." },
      { property: "og:title", content: "لوحة التحكم — ألو تكسي" },
      { property: "og:description", content: "لوحة تحكم مدير مكتب ألو تكسي." },
    ],
  }),
  component: AdminDashboard,
});

type Stats = {
  period: { id: string; name: string; start_date: string } | null;
  orders_count: number;
  total_amount: number;
  total_commission: number;
  avg_amount: number;
  avg_commission: number;
  active_captains: number;
  active_users: number;
  recent_orders: Array<{
    order_number: string;
    order_date: string;
    amount: number;
    commission_amount: number;
    created_at: string;
    captain_name: string;
    user_name: string;
  }>;
  top_captains: Array<{ name: string; orders_count: number; total_amount: number; total_commission: number }>;
  per_user: Array<{ name: string; orders_count: number }>;
  recent_changes: Array<{
    order_number: string;
    status: string;
    updated_at: string;
    deletion_reason: string | null;
    user_name: string;
  }>;
};

function AdminDashboard() {
  const [closing, setClosing] = useState(false);

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  return (
    <AppShell title="لوحة التحكم">
      <div className="space-y-4">
        <Card className="shadow-card">
          <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{stats.data?.period?.name ?? "لا توجد دورة مفتوحة"}</p>
              <p className="truncate text-xs text-muted-foreground">
                بدأت في {formatDate(stats.data?.period?.start_date)}
              </p>
            </div>
            <Button className="shrink-0" onClick={() => setClosing(true)}>
              <Archive className="ml-1 size-4" />
              إغلاق وأرشفة
            </Button>
          </CardContent>
        </Card>

        {stats.isLoading ? (
          <LoadingState />
        ) : stats.isError ? (
          <ErrorState />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="عدد الطلبات" value={formatNumber(stats.data?.orders_count)} tone="primary" />
              <StatCard label="إجمالي قيمة الطلبات" value={formatMoney(stats.data?.total_amount)} />
              <StatCard label="إجمالي العمولات" value={formatMoney(stats.data?.total_commission)} tone="success" />
              <StatCard label="متوسط قيمة الطلب" value={formatMoney(stats.data?.avg_amount)} />
              <StatCard label="متوسط العمولة" value={formatMoney(stats.data?.avg_commission)} />
              <StatCard label="الكباتن النشطون" value={formatNumber(stats.data?.active_captains)} />
              <StatCard label="المستخدمون النشطون" value={formatNumber(stats.data?.active_users)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">آخر الطلبات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(stats.data?.recent_orders ?? []).length === 0 ? (
                    <EmptyState title="لا توجد طلبات في هذه الدورة" />
                  ) : (
                    stats.data?.recent_orders.map((o) => (
                      <div
                        key={o.order_number}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="num truncate text-xs font-bold">{o.order_number}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {o.captain_name} · {o.user_name} · {formatDate(o.order_date)}
                          </p>
                        </div>
                        <div className="shrink-0 text-left">
                          <p className="num text-xs font-semibold">{formatMoney(o.amount)}</p>
                          <p className="num text-[11px] text-success">{formatMoney(o.commission_amount)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">أكثر الكباتن طلبات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(stats.data?.top_captains ?? []).length === 0 ? (
                    <EmptyState title="لا توجد بيانات بعد" />
                  ) : (
                    stats.data?.top_captains.map((c) => (
                      <div
                        key={c.name}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b pb-2 last:border-0"
                      >
                        <p className="truncate text-xs font-medium">{c.name}</p>
                        <div className="shrink-0 text-left">
                          <p className="num text-xs">{formatNumber(c.orders_count)} طلب</p>
                          <p className="num text-[11px] text-success">{formatMoney(c.total_commission)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">طلبات كل موظف</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(stats.data?.per_user ?? []).length === 0 ? (
                    <EmptyState title="لا توجد بيانات بعد" />
                  ) : (
                    stats.data?.per_user.map((u) => (
                      <div key={u.name} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <p className="truncate text-xs font-medium">{u.name || "—"}</p>
                        <p className="num text-xs">{formatNumber(u.orders_count)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">آخر التعديلات والحذف</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(stats.data?.recent_changes ?? []).length === 0 ? (
                    <EmptyState title="لا توجد تغييرات" />
                  ) : (
                    stats.data?.recent_changes.map((c) => (
                      <div
                        key={`${c.order_number}-${c.updated_at}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="num truncate text-xs font-bold">{c.order_number}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {c.user_name} · {formatDateTime(c.updated_at)}
                            {c.deletion_reason ? ` · ${c.deletion_reason}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={c.status === "deleted" ? "destructive" : "secondary"}
                          className="shrink-0"
                        >
                          {ORDER_STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <ClosePeriodDialog open={closing} onOpenChange={setClosing} stats={stats.data ?? null} />
    </AppShell>
  );
}

function ClosePeriodDialog({
  open,
  onOpenChange,
  stats,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stats: Stats | null;
}) {
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const close = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_close_period", {
        p_note: note,
        p_new_name: name || "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إغلاق الدورة وبدء دورة جديدة");
      queryClient.invalidateQueries();
      setNote("");
      setName("");
      onOpenChange(false);
    },
    onError: () => toast.error("تعذّر إغلاق الدورة"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إغلاق وأرشفة الدورة الحالية</DialogTitle>
          <DialogDescription>راجع الملخص قبل التأكيد.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border p-3 text-sm">
          <Row label="اسم الدورة" value={stats?.period?.name ?? "—"} />
          <Row label="تاريخ البداية" value={formatDate(stats?.period?.start_date)} />
          <Row label="تاريخ الإغلاق" value={formatDate(new Date())} />
          <Row label="عدد الطلبات" value={formatNumber(stats?.orders_count)} />
          <Row label="إجمالي قيمة الطلبات" value={formatMoney(stats?.total_amount)} />
          <Row label="إجمالي العمولات" value={formatMoney(stats?.total_commission)} />
          <Row label="كباتن لديهم طلبات" value={formatNumber(stats?.top_captains?.length ?? 0)} />
        </div>

        <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="space-y-1">
            <p>بعد الإغلاق لن يتمكن الموظفون من تعديل أو حذف طلبات هذه الدورة.</p>
            <p>ستنتقل جميع الطلبات إلى الأرشيف مع الاحتفاظ الكامل بالبيانات.</p>
            <p>ستبدأ دورة جديدة بأرقام صفرية مع بقاء الكباتن والمستخدمين ونسبهم.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>اسم الدورة الجديدة (اختياري)</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="عمولات الشهر القادم" />
        </div>
        <div className="space-y-1.5">
          <Label>ملاحظة الإغلاق أو رقم إيصال القبض (اختياري)</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button disabled={close.isPending} onClick={() => close.mutate()}>
            {close.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
            تأكيد الإغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="num truncate font-semibold">{value}</span>
    </div>
  );
}
