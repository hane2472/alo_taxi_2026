import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { DeleteOrderDialog } from "@/components/DeleteOrderDialog";
import { useCaptains } from "@/components/OrderForm";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  ORDER_STATUS_LABEL,
} from "@/lib/format";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "الطلبات — ألو تكسي" },
      { name: "description", content: "إدارة جميع طلبات الدورة الحالية مع الفلاتر والعمولات." },
      { property: "og:title", content: "الطلبات — ألو تكسي" },
      { property: "og:description", content: "إدارة الطلبات في نظام ألو تكسي." },
    ],
  }),
  component: AdminOrders,
});

type OrderRow = {
  id: string;
  order_number: string;
  order_date: string;
  amount: number;
  commission_percentage_snapshot: number;
  commission_amount: number;
  status: string;
  created_at: string;
  deletion_reason: string | null;
  captain_name: string;
  user_name: string | null;
  total_count: number;
};

function AdminOrders() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [captain, setCaptain] = useState("all");
  const [user, setUser] = useState("all");
  const [status, setStatus] = useState("all");
  const [deleted, setDeleted] = useState(false);
  const [sort, setSort] = useState("newest");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<OrderRow | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const captains = useCaptains();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users", {});
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders", debounced, captain, user, status, deleted, sort, from, to, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_orders", {
        p_search: debounced,
        p_captain: captain === "all" ? undefined : captain,
        p_user: user === "all" ? undefined : user,
        p_status: status === "all" ? undefined : status,
        p_deleted: deleted,
        p_sort: sort,
        p_from: from || undefined,
        p_to: to || undefined,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ deleted_at: null, deletion_reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت استعادة الطلب");
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("تعذّرت استعادة الطلب"),
  });

  const rows = orders.data ?? [];
  const total = rows[0]?.total_count ?? 0;

  return (
    <AppShell title="الطلبات">
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardContent className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الطلب أو الكابتن أو الموظف"
                className="h-11 pr-9"
              />
            </div>
            <Select value={captain} onValueChange={(v) => { setCaptain(v); setPage(0); }}>
              <SelectTrigger className="h-11"><SelectValue placeholder="الكابتن" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الكباتن</SelectItem>
                {(captains.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={user} onValueChange={(v) => { setUser(v); setPage(0); }}>
              <SelectTrigger className="h-11"><SelectValue placeholder="الموظف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                {(users.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" className="h-11" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
            <Input type="date" className="h-11" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="h-11"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="edited">معدّل</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-11"><SelectValue placeholder="الترتيب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="amount_desc">الأعلى قيمة</SelectItem>
                <SelectItem value="amount_asc">الأقل قيمة</SelectItem>
                <SelectItem value="comm_desc">الأعلى عمولة</SelectItem>
                <SelectItem value="comm_asc">الأقل عمولة</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={deleted ? "destructive" : "outline"}
              className="h-11"
              onClick={() => { setDeleted((d) => !d); setPage(0); }}
            >
              {deleted ? "عرض الطلبات النشطة" : "عرض المحذوفة"}
            </Button>
          </CardContent>
        </Card>

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
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">الموظف</TableHead>
                    <TableHead className="text-right">الكابتن</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">القيمة</TableHead>
                    <TableHead className="text-right">النسبة</TableHead>
                    <TableHead className="text-right">العمولة</TableHead>
                    <TableHead className="text-right">وقت الإنشاء</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="num font-semibold">{o.order_number}</TableCell>
                      <TableCell>{o.user_name ?? "—"}</TableCell>
                      <TableCell>{o.captain_name}</TableCell>
                      <TableCell>{formatDate(o.order_date)}</TableCell>
                      <TableCell className="num">{formatMoney(o.amount)}</TableCell>
                      <TableCell className="num">{formatPercent(o.commission_percentage_snapshot)}</TableCell>
                      <TableCell className="num text-success">{formatMoney(o.commission_amount)}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(o.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "deleted" ? "destructive" : "secondary"}>
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {deleted ? (
                          <Button size="sm" variant="outline" onClick={() => restore.mutate(o.id)}>
                            <RotateCcw className="ml-1 size-4" /> استعادة
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(o)}>
                            <Trash2 className="ml-1 size-4" /> حذف
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 lg:hidden">
              {rows.map((o) => (
                <Card key={o.id} className="shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div className="min-w-0">
                        <p className="num truncate text-sm font-bold">{o.order_number}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.captain_name} · {o.user_name ?? "—"}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {formatDate(o.order_date)} · {formatDateTime(o.created_at)}
                        </p>
                      </div>
                      <Badge variant={o.status === "deleted" ? "destructive" : "secondary"} className="shrink-0">
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                      <span className="num">{formatMoney(o.amount)}</span>
                      <span className="num">{formatPercent(o.commission_percentage_snapshot)}</span>
                      <span className="num font-semibold text-success">{formatMoney(o.commission_amount)}</span>
                    </div>
                    {deleted ? (
                      <Button size="sm" variant="outline" onClick={() => restore.mutate(o.id)}>
                        <RotateCcw className="ml-1 size-4" /> استعادة
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(o)}>
                        <Trash2 className="ml-1 size-4" /> حذف
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              <p className="text-xs text-muted-foreground">
                <span className="num">{formatNumber(total)}</span> طلب — صفحة{" "}
                <span className="num">{page + 1}</span> من{" "}
                <span className="num">{Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
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

      <DeleteOrderDialog
        orderId={deleting?.id ?? null}
        orderNumber={deleting?.order_number ?? null}
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      />
    </AppShell>
  );
}
