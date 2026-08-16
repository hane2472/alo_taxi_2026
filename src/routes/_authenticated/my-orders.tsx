import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Pencil, Trash2, Eye, PlusCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { DeleteOrderDialog } from "@/components/DeleteOrderDialog";
import { OrderFormFields, type OrderFormValue } from "@/components/OrderForm";
import { formatDate, formatTime, formatMoney, ORDER_STATUS_LABEL } from "@/lib/format";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/_authenticated/my-orders")({
  head: () => ({
    meta: [
      { title: "طلباتي — ألو تكسي" },
      { name: "description", content: "قائمة الطلبات التي أدخلتها ضمن الدورة الحالية مع البحث والتعديل." },
      { property: "og:title", content: "طلباتي — ألو تكسي" },
      { property: "og:description", content: "إدارة طلباتي في نظام ألو تكسي." },
    ],
  }),
  component: MyOrdersPage,
});

type Row = {
  id: string;
  order_number: string;
  order_date: string;
  amount: number;
  captain_id: string;
  pickup_location: string | null;
  destination: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  captains: { name: string } | null;
};

function MyOrdersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ["my-orders", debounced, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let request = supabase
        .from("orders")
        .select(
          "id, order_number, order_date, amount, captain_id, pickup_location, destination, notes, status, created_at, captains(name)",
          { count: "exact" },
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (debounced.trim()) request = request.ilike("order_number", `%${debounced.trim()}%`);
      const { data, error, count } = await request;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Row[], count: count ?? 0 };
    },
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.count ?? 0;

  return (
    <AppShell title="طلباتي">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative min-w-0">
            <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الطلب"
              className="h-11 pr-9"
            />
          </div>
          <Button asChild className="h-11 shrink-0">
            <Link to="/new-order">
              <PlusCircle className="ml-1 size-4" />
              طلب جديد
            </Link>
          </Button>
        </div>

        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="لا توجد طلبات" description="لم يتم العثور على طلبات مطابقة." />
        ) : (
          <div className="space-y-2">
            {rows.map((o) => (
              <Card key={o.id} className="shadow-none">
                <CardContent className="space-y-3 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="num truncate text-sm font-bold">{o.order_number}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.captains?.name ?? "—"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {formatDate(o.order_date)} · وقت الإدخال {formatTime(o.created_at)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewing(o)}>
                      <Eye className="ml-1 size-4" /> عرض
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(o)}>
                      <Pencil className="ml-1 size-4" /> تعديل
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(o)}>
                      <Trash2 className="ml-1 size-4" /> حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              السابق
            </Button>
            <p className="text-xs text-muted-foreground">
              صفحة <span className="num">{page + 1}</span> من{" "}
              <span className="num">{Math.ceil(total / PAGE_SIZE)}</span>
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
        )}
      </div>

      <ViewDialog order={viewing} onOpenChange={(v) => !v && setViewing(null)} />
      <EditDialog order={editing} onClose={() => setEditing(null)} />
      <DeleteOrderDialog
        orderId={deleting?.id ?? null}
        orderNumber={deleting?.order_number ?? null}
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      />
    </AppShell>
  );
}

function ViewDialog({ order, onOpenChange }: { order: Row | null; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="num">{order?.order_number}</DialogTitle>
          <DialogDescription>تفاصيل الطلب</DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          <Item label="الكابتن" value={order?.captains?.name ?? "—"} />
          <Item label="تاريخ الطلب" value={formatDate(order?.order_date)} />
          <Item label="وقت الإدخال" value={formatTime(order?.created_at)} />
          <Item label="قيمة الطلب" value={formatMoney(order?.amount)} />
          <Item label="الحالة" value={ORDER_STATUS_LABEL[order?.status ?? ""] ?? "—"} />
          {order?.pickup_location && <Item label="نقطة البداية" value={order.pickup_location} />}
          {order?.destination && <Item label="الوجهة" value={order.destination} />}
          {order?.notes && <Item label="ملاحظة" value={order.notes} />}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function EditDialog({ order, onClose }: { order: Row | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OrderFormValue | null>(null);

  useEffect(() => {
    if (order) {
      setForm({
        order_date: order.order_date,
        amount: Number(order.amount),
        captain_id: order.captain_id,
        pickup_location: order.pickup_location ?? "",
        destination: order.destination ?? "",
        notes: order.notes ?? "",
      });
    } else {
      setForm(null);
    }
  }, [order]);

  const save = useMutation({
    mutationFn: async () => {
      if (!order || !form) return;
      if (!form.amount || form.amount <= 0) throw new Error("قيمة الطلب غير صحيحة");
      if (!form.captain_id) throw new Error("اختر الكابتن");
      const { error } = await supabase
        .from("orders")
        .update({
          order_date: form.order_date,
          amount: form.amount,
          captain_id: form.captain_id,
          pickup_location: form.pickup_location.trim() || null,
          destination: form.destination.trim() || null,
          notes: form.notes || null,
        })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تعديل الطلب");
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر تعديل الطلب"),
  });

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل الطلب</DialogTitle>
          <DialogDescription className="num">{order?.order_number}</DialogDescription>
        </DialogHeader>
        {form && <OrderFormFields value={form} onChange={setForm} />}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
