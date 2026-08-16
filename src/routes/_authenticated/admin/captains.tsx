import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/captains")({
  head: () => ({
    meta: [
      { title: "الكباتن — ألو تكسي" },
      { name: "description", content: "إدارة الكباتن ونسب العمولة وإحصائيات الدورة الحالية." },
      { property: "og:title", content: "الكباتن — ألو تكسي" },
      { property: "og:description", content: "إدارة الكباتن في نظام ألو تكسي." },
    ],
  }),
  component: CaptainsPage,
});

type CaptainRow = {
  id: string;
  name: string;
  phone: string | null;
  vehicle_number: string | null;
  pct: number;
  is_active: boolean;
  orders_count: number;
  total_amount: number;
  total_commission: number;
};

function CaptainsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("all");
  const [sort, setSort] = useState("name");
  const [editing, setEditing] = useState<Partial<CaptainRow> | null>(null);
  const [deleting, setDeleting] = useState<CaptainRow | null>(null);

  const removeCaptain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_captain", { p_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم حذف الكابتن نهائياً");
      setDeleting(null);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر حذف الكابتن"),
  });

  const captains = useQuery({
    queryKey: ["admin-captains", search, active, sort],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_captains", {
        p_search: search,
        p_active: active === "all" ? undefined : active === "active",
        p_sort: sort,
      });
      if (error) throw error;
      return (data ?? []) as unknown as CaptainRow[];
    },
  });

  return (
    <AppShell title="الكباتن">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <Input
            className="h-11"
            placeholder="بحث بالاسم أو الهاتف أو رقم المركبة"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">معطل</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">الاسم</SelectItem>
              <SelectItem value="orders">الأعلى طلبات</SelectItem>
              <SelectItem value="commission">الأعلى عمولات</SelectItem>
              <SelectItem value="pct">نسبة العمولة</SelectItem>
            </SelectContent>
          </Select>
          <Button className="h-11" onClick={() => setEditing({})}>
            <Plus className="ml-1 size-4" /> كابتن جديد
          </Button>
        </div>

        {captains.isLoading ? (
          <LoadingState />
        ) : captains.isError ? (
          <ErrorState />
        ) : (captains.data ?? []).length === 0 ? (
          <EmptyState title="لا يوجد كباتن" />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {(captains.data ?? []).map((c) => (
              <Card key={c.id} className="shadow-none">
                <CardContent className="space-y-3 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[c.phone, c.vehicle_number].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <Badge variant={c.is_active ? "default" : "secondary"} className="shrink-0">
                      {c.is_active ? "نشط" : "معطل"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted p-2 text-center text-[11px]">
                    <div><p className="num font-bold">{formatNumber(c.orders_count)}</p><p className="text-muted-foreground">طلب</p></div>
                    <div><p className="num font-bold">{formatMoney(c.total_amount)}</p><p className="text-muted-foreground">القيمة</p></div>
                    <div><p className="num font-bold text-success">{formatMoney(c.total_commission)}</p><p className="text-muted-foreground">العمولة</p></div>
                    <div><p className="num font-bold">{formatPercent(c.pct)}</p><p className="text-muted-foreground">النسبة</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                      <Pencil className="ml-1 size-4" /> تعديل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleting(c)}>
                      <Trash2 className="ml-1 size-4" /> حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CaptainDialog captain={editing} onClose={() => setEditing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الكابتن</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleting?.name}» نهائياً مع كل طلباته وسجلات عمولاته، ولا يمكن التراجع.
              إن أردت الاحتفاظ بالسجلات استخدم التعطيل بدلاً من الحذف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeCaptain.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) removeCaptain.mutate(deleting.id);
              }}
            >
              {removeCaptain.isPending ? "جاري الحذف…" : "حذف نهائي"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function CaptainDialog({
  captain,
  onClose,
}: {
  captain: Partial<CaptainRow> | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [pct, setPct] = useState("7");
  const [isActive, setIsActive] = useState(true);
  const [key, setKey] = useState<string | null>(null);

  if (captain && key !== (captain.id ?? "new")) {
    setKey(captain.id ?? "new");
    setName(captain.name ?? "");
    setPhone(captain.phone ?? "");
    setVehicle(captain.vehicle_number ?? "");
    setPct(String(captain.pct ?? 7));
    setIsActive(captain.is_active ?? true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("الاسم مطلوب");
      const { error } = await supabase.rpc("admin_save_captain", {
        p_id: captain?.id ?? (null as unknown as string),
        p_name: name.trim(),
        p_phone: phone.trim(),
        p_vehicle: vehicle.trim(),
        p_pct: Number(pct) || 0,
        p_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ بيانات الكابتن");
      queryClient.invalidateQueries();
      setKey(null);
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الحفظ"),
  });

  return (
    <Dialog open={!!captain} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{captain?.id ? "تعديل كابتن" : "إضافة كابتن"}</DialogTitle>
          <DialogDescription>لا يمكن حذف الكابتن نهائياً، يمكن تعطيله فقط.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>رقم الهاتف</Label><Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>رقم المركبة</Label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>نسبة العمولة %</Label><Input dir="ltr" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>الحالة نشط</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
