import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Printer, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { downloadWord, htmlTable, printHtml } from "@/lib/export";
import { formatDate, formatDateLong, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { useCurrentPeriod } from "@/lib/session";
import { WhatsappCommissionsDialog } from "@/components/WhatsappCommissionsDialog";

export const Route = createFileRoute("/_authenticated/admin/commissions")({
  head: () => ({
    meta: [
      { title: "العمولات — ألو تكسي" },
      { name: "description", content: "عمولات الكباتن المستحقة ضمن الدورة الحالية." },
      { property: "og:title", content: "العمولات — ألو تكسي" },
      { property: "og:description", content: "متابعة عمولات الكباتن في نظام ألو تكسي." },
    ],
  }),
  component: CommissionsPage,
});

type Row = {
  id: string;
  name: string;
  phone?: string | null;
  pct: number;
  orders_count: number;
  total_amount: number;
  total_commission: number;
};

type DailyRow = {
  day: string;
  orders_count: number;
  total_amount: number;
  total_commission: number;
};

function CommissionsPage() {
  const { data: period } = useCurrentPeriod();
  const q = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_captains", { p_sort: "commission" });
      if (error) throw error;
      return ((data ?? []) as unknown as Row[]).filter((r) => r.orders_count > 0);
    },
  });

  const daily = useQuery({
    queryKey: ["admin-daily-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_daily_orders", {});
      if (error) throw error;
      return (data ?? []) as unknown as DailyRow[];
    },
  });


  const qc = useQueryClient();
  const [payFilter, setPayFilter] = useState<"all" | "paid" | "unpaid">("all");

  const settlements = useQuery({
    queryKey: ["admin-settlements"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("admin_settlements", {});
      if (error) throw error;
      const map: Record<string, { is_paid: boolean; paid_at: string | null }> = {};
      for (const s of (data ?? []) as { captain_id: string; is_paid: boolean; paid_at: string | null }[]) {
        map[s.captain_id] = { is_paid: s.is_paid, paid_at: s.paid_at };
      }
      return map;
    },
  });

  const togglePay = useMutation({
    mutationFn: async (v: { captain_id: string; paid: boolean; amount: number }) => {
      const { error } = await (supabase.rpc as any)("admin_set_commission_paid", {
        p_captain: v.captain_id,
        p_paid: v.paid,
        p_amount: v.amount,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.paid ? "تم تسجيل دفع العمولة" : "تم إلغاء حالة الدفع");
      qc.invalidateQueries({ queryKey: ["admin-settlements"] });
      qc.invalidateQueries({ queryKey: ["admin-activity"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر تحديث حالة الدفع"),
  });

  const payMap = settlements.data ?? {};
  const isPaid = (id: string) => !!payMap[id]?.is_paid;

  const allRows = q.data ?? [];
  const rows = allRows.filter((r) =>
    payFilter === "all" ? true : payFilter === "paid" ? isPaid(r.id) : !isPaid(r.id),
  );
  const dailyRows = daily.data ?? [];
  const totalAmount = allRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalCommission = allRows.reduce((s, r) => s + Number(r.total_commission), 0);
  const totalOrders = allRows.reduce((s, r) => s + Number(r.orders_count), 0);
  const paidCommission = allRows
    .filter((r) => isPaid(r.id))
    .reduce((s, r) => s + Number(r.total_commission), 0);
  const unpaidCommission = totalCommission - paidCommission;


  function reportHtml() {
    return `<h1>تقرير العمولات — ${period?.name ?? ""}</h1>
<p class="meta">إجمالي الطلبات: ${formatNumber(totalOrders)} · إجمالي القيم: ${formatMoney(totalAmount)} · إجمالي العمولات: ${formatMoney(totalCommission)}</p>
<h2>الطلبات حسب اليوم</h2>
${htmlTable(
  ["اليوم", "عدد الطلبات", "إجمالي القيم", "إجمالي العمولات"],
  dailyRows.map((d) => [
    formatDate(d.day),
    formatNumber(d.orders_count),
    formatMoney(d.total_amount),
    formatMoney(d.total_commission),
  ]),
)}
<h2>عمولات الكباتن</h2>
${htmlTable(
  ["الكابتن", "عدد الطلبات", "إجمالي القيم", "النسبة", "العمولة المستحقة", "حالة الدفع"],
  rows.map((r) => [
    r.name,
    formatNumber(r.orders_count),
    formatMoney(r.total_amount),
    formatPercent(r.pct),
    formatMoney(r.total_commission),
    isPaid(r.id) ? "مدفوعة" : "غير مدفوعة",
  ]),
)}`;
  }

  return (
    <AppShell title="العمولات">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{period?.name ?? "—"}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                downloadWord(`العمولات-${period?.name ?? "الدورة"}.doc`, "تقرير العمولات", reportHtml());
                toast.success("تم تحميل ملف Word");
              }}
            >
              <FileText className="ml-1 size-4" /> تصدير Word
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!printHtml("تقرير العمولات", reportHtml())) toast.error("تعذّر فتح نافذة الطباعة");
              }}
            >
              <Printer className="ml-1 size-4" /> طباعة / PDF
            </Button>
            <WhatsappCommissionsDialog
              captains={allRows.map((r) => ({
                id: r.id,
                name: r.name,
                phone: r.phone ?? null,
                orders_count: Number(r.orders_count),
                total_commission: Number(r.total_commission),
              }))}
              periodId={period?.id ?? null}
              periodName={period?.name ?? null}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="عدد الطلبات" value={formatNumber(totalOrders)} />
          <StatCard label="إجمالي العمولات" value={formatMoney(totalCommission)} />
          <StatCard label="عمولات مدفوعة" value={formatMoney(paidCommission)} tone="success" />
          <StatCard label="عمولات غير مدفوعة" value={formatMoney(unpaidCommission)} tone="primary" />
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            ["all", "الكل"],
            ["unpaid", "غير مدفوعة"],
            ["paid", "مدفوعة"],
          ] as const).map(([v, label]) => (
            <Button
              key={v}
              size="sm"
              variant={payFilter === v ? "default" : "outline"}
              onClick={() => setPayFilter(v)}
            >
              {label}
            </Button>
          ))}
        </div>



        <Card className="shadow-none">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-bold">الطلبات حسب اليوم</p>
            {daily.isLoading ? (
              <LoadingState />
            ) : daily.isError ? (
              <ErrorState />
            ) : dailyRows.length === 0 ? (
              <EmptyState title="لا توجد طلبات في هذه الدورة" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="text-right">اليوم</TableHead>
                      <TableHead className="text-right">عدد الطلبات</TableHead>
                      <TableHead className="text-right">إجمالي القيم</TableHead>
                      <TableHead className="text-right">إجمالي العمولات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyRows.map((d) => (
                      <TableRow key={d.day}>
                        <TableCell className="num font-medium">{formatDateLong(d.day)}</TableCell>
                        <TableCell className="num">{formatNumber(d.orders_count)}</TableCell>
                        <TableCell className="num">{formatMoney(d.total_amount)}</TableCell>
                        <TableCell className="num text-success">{formatMoney(d.total_commission)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>


        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="لا توجد عمولات في هذه الدورة" />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="text-right">الكابتن</TableHead>
                    <TableHead className="text-right">عدد الطلبات</TableHead>
                    <TableHead className="text-right">إجمالي القيم</TableHead>
                    <TableHead className="text-right">النسبة</TableHead>
                    <TableHead className="text-right">العمولة المستحقة</TableHead>
                    <TableHead className="text-right">التسوية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="num">{formatNumber(r.orders_count)}</TableCell>
                      <TableCell className="num">{formatMoney(r.total_amount)}</TableCell>
                      <TableCell className="num">{formatPercent(r.pct)}</TableCell>
                      <TableCell className="num font-semibold text-success">{formatMoney(r.total_commission)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={isPaid(r.id) ? "default" : "outline"}
                          disabled={togglePay.isPending}
                          onClick={() =>
                            togglePay.mutate({
                              captain_id: r.id,
                              paid: !isPaid(r.id),
                              amount: Number(r.total_commission),
                            })
                          }
                        >
                          {isPaid(r.id) ? <CheckCircle2 className="ml-1 size-4" /> : <Circle className="ml-1 size-4" />}
                          {isPaid(r.id) ? "مدفوعة" : "غير مدفوعة"}
                        </Button>
                      </TableCell>
                    </TableRow>

                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 lg:hidden">
              {rows.map((r) => (
                <Card key={r.id} className="shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold">{r.name}</p>
                      <Badge variant="secondary" className="shrink-0">{formatPercent(r.pct)}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-2 text-center text-[11px]">
                      <div><p className="num font-bold">{formatNumber(r.orders_count)}</p><p className="text-muted-foreground">طلب</p></div>
                      <div><p className="num font-bold">{formatMoney(r.total_amount)}</p><p className="text-muted-foreground">القيم</p></div>
                      <div><p className="num font-bold text-success">{formatMoney(r.total_commission)}</p><p className="text-muted-foreground">العمولة</p></div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      variant={isPaid(r.id) ? "default" : "outline"}
                      disabled={togglePay.isPending}
                      onClick={() =>
                        togglePay.mutate({
                          captain_id: r.id,
                          paid: !isPaid(r.id),
                          amount: Number(r.total_commission),
                        })
                      }
                    >
                      {isPaid(r.id) ? <CheckCircle2 className="ml-1 size-4" /> : <Circle className="ml-1 size-4" />}
                      {isPaid(r.id) ? "العمولة مدفوعة" : "تسجيل الدفع"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
