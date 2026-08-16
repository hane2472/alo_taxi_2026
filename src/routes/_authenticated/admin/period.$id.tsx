import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileSpreadsheet, Printer, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { downloadCsv, htmlTable, printHtml } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/period/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الدورة — ألو تكسي" },
      { name: "description", content: "تفاصيل دورة محاسبية مؤرشفة: الطلبات وعمولات الكباتن وطلبات الموظفين." },
      { property: "og:title", content: "تفاصيل الدورة — ألو تكسي" },
      { property: "og:description", content: "تقرير دورة العمولات في ألو تكسي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PeriodDetail,
});

type Report = {
  period: {
    id: string;
    name: string;
    start_date: string;
    end_date: string | null;
    status: string;
    archived_at: string | null;
    closing_note: string | null;
  } | null;
  orders_count: number;
  total_amount: number;
  total_commission: number;
  deleted_count: number;
  edited_count: number;
  captains: Array<{
    name: string;
    phone: string | null;
    orders_count: number;
    total_amount: number;
    total_commission: number;
  }>;
  users: Array<{ name: string | null; orders_count: number; total_amount: number }>;
};

type OrderRow = {
  id: string;
  order_number: string;
  order_date: string;
  amount: number;
  commission_percentage_snapshot: number;
  commission_amount: number;
  status: string;
  captain_name: string;
  user_name: string | null;
  created_at: string;
  total_count: number;
};

function PeriodDetail() {
  const { id } = Route.useParams();
  const [search, setSearch] = useState("");

  const report = useQuery({
    queryKey: ["period-report", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_period_report", { p_id: id });
      if (error) throw error;
      return data as unknown as Report;
    },
  });

  const orders = useQuery({
    queryKey: ["period-orders", id, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_orders", {
        p_period: id,
        p_search: search,
        p_limit: 500,
        p_offset: 0,
      });
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const p = report.data?.period;
  const rows = orders.data ?? [];

  const orderHeaders = ["رقم الطلب", "التاريخ", "الموظف", "الكابتن", "القيمة", "النسبة", "العمولة"];
  const orderRows = rows.map((o) => [
    o.order_number,
    formatDate(o.order_date),
    o.user_name ?? "—",
    o.captain_name,
    o.amount,
    o.commission_percentage_snapshot,
    o.commission_amount,
  ]);

  function printAll() {
    const r = report.data;
    if (!r) return;
    printHtml(
      `تقرير ${r.period?.name ?? ""}`,
      `<h1>تقرير ${r.period?.name ?? ""}</h1>
       <p class="meta">من ${formatDate(r.period?.start_date)} إلى ${formatDate(r.period?.end_date)} · عدد الطلبات ${formatNumber(
         r.orders_count,
       )} · إجمالي التكلفة ${formatMoney(r.total_amount)} · إجمالي العمولة ${formatMoney(r.total_commission)}</p>
       <h2>عمولات الكباتن</h2>
       ${htmlTable(
         ["الكابتن", "الهاتف", "عدد الطلبات", "إجمالي التكلفة", "إجمالي العمولة"],
         r.captains.map((c) => [
           c.name,
           c.phone ?? "—",
           formatNumber(c.orders_count),
           formatMoney(c.total_amount),
           formatMoney(c.total_commission),
         ]),
       )}
       <h2>طلبات الموظفين</h2>
       ${htmlTable(
         ["الموظف", "عدد الطلبات", "إجمالي التكلفة"],
         r.users.map((u) => [u.name ?? "—", formatNumber(u.orders_count), formatMoney(u.total_amount)]),
       )}
       <h2>الطلبات</h2>
       ${htmlTable(
         orderHeaders,
         orderRows.map((o) => [
           o[0],
           o[1],
           o[2],
           o[3],
           formatMoney(o[4] as number),
           formatPercent(o[5] as number),
           formatMoney(o[6] as number),
         ]),
       )}`,
    );
  }

  return (
    <AppShell title="تفاصيل الدورة">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link to="/admin/archive">
            <ArrowRight className="ml-1 size-4" />
            العودة للأرشيف
          </Link>
        </Button>

        {report.isLoading ? (
          <LoadingState />
        ) : report.isError ? (
          <ErrorState />
        ) : !p ? (
          <EmptyState title="الدورة غير موجودة" />
        ) : (
          <>
            <Card className="shadow-card">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    {p.status === "archived" && (
                      <Badge variant="secondary">
                        <Lock className="ml-1 size-3" />
                        للقراءة فقط
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(p.start_date)} — {formatDate(p.end_date)}
                    {p.archived_at ? ` · أُرشفت في ${formatDateTime(p.archived_at)}` : ""}
                  </p>
                  {p.closing_note && <p className="mt-1 text-xs text-muted-foreground">{p.closing_note}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => downloadCsv(`طلبات-${p.name}`, orderHeaders, orderRows)}
                    disabled={rows.length === 0}
                  >
                    <FileSpreadsheet className="ml-1 size-4" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={printAll}>
                    <Printer className="ml-1 size-4" />
                    طباعة / PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard label="عدد الطلبات" value={formatNumber(report.data?.orders_count)} tone="primary" />
              <StatCard label="إجمالي التكلفة" value={formatMoney(report.data?.total_amount)} />
              <StatCard label="إجمالي العمولات" value={formatMoney(report.data?.total_commission)} tone="success" />
              <StatCard label="طلبات محذوفة" value={formatNumber(report.data?.deleted_count)} />
              <StatCard label="طلبات معدّلة" value={formatNumber(report.data?.edited_count)} />
            </div>

            <Tabs defaultValue="orders">
              <TabsList className="w-full">
                <TabsTrigger value="orders" className="flex-1">
                  الطلبات
                </TabsTrigger>
                <TabsTrigger value="captains" className="flex-1">
                  الكباتن
                </TabsTrigger>
                <TabsTrigger value="users" className="flex-1">
                  الموظفون
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث برقم الطلب أو الكابتن أو الموظف"
                    className="h-11 pr-9"
                  />
                </div>

                {orders.isLoading ? (
                  <LoadingState />
                ) : orders.isError ? (
                  <ErrorState />
                ) : rows.length === 0 ? (
                  <EmptyState title="لا توجد طلبات مطابقة" />
                ) : (
                  <>
                    <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
                      <Table>
                        <TableHeader className="bg-muted">
                          <TableRow>
                            {orderHeaders.map((h) => (
                              <TableHead key={h} className="text-right">
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((o) => (
                            <TableRow key={o.id}>
                              <TableCell className="num font-semibold">{o.order_number}</TableCell>
                              <TableCell>{formatDate(o.order_date)}</TableCell>
                              <TableCell>{o.user_name ?? "—"}</TableCell>
                              <TableCell>{o.captain_name}</TableCell>
                              <TableCell className="num">{formatMoney(o.amount)}</TableCell>
                              <TableCell className="num">
                                {formatPercent(o.commission_percentage_snapshot)}
                              </TableCell>
                              <TableCell className="num text-success">
                                {formatMoney(o.commission_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="grid gap-2 lg:hidden">
                      {rows.map((o) => (
                        <Card key={o.id} className="shadow-none">
                          <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3">
                            <div className="min-w-0">
                              <p className="num truncate text-xs font-bold">{o.order_number}</p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {o.captain_name} · {o.user_name ?? "—"} · {formatDate(o.order_date)}
                              </p>
                            </div>
                            <div className="shrink-0 text-left">
                              <p className="num text-xs font-semibold">{formatMoney(o.amount)}</p>
                              <p className="num text-[11px] text-success">{formatMoney(o.commission_amount)}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="captains">
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">عمولات الكباتن</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(report.data?.captains ?? []).length === 0 ? (
                      <EmptyState title="لا توجد بيانات" />
                    ) : (
                      report.data?.captains.map((c) => (
                        <div
                          key={c.name}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b pb-2 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{c.name}</p>
                            <p className="num truncate text-[11px] text-muted-foreground">{c.phone ?? "—"}</p>
                          </div>
                          <div className="shrink-0 text-left">
                            <p className="num text-xs">
                              {formatNumber(c.orders_count)} طلب · {formatMoney(c.total_amount)}
                            </p>
                            <p className="num text-[11px] text-success">{formatMoney(c.total_commission)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">طلبات الموظفين</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(report.data?.users ?? []).length === 0 ? (
                      <EmptyState title="لا توجد بيانات" />
                    ) : (
                      report.data?.users.map((u) => (
                        <div
                          key={u.name ?? "—"}
                          className="flex items-center justify-between border-b pb-2 last:border-0"
                        >
                          <p className="truncate text-xs font-medium">{u.name || "—"}</p>
                          <p className="num text-xs">{formatNumber(u.orders_count)} طلب</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  );
}
