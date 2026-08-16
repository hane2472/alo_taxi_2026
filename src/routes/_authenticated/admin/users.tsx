import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, KeyRound, Pencil, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
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
import { adminCreateUser, adminDeleteUser, adminSetPassword, adminUpdateUser } from "@/lib/admin.functions";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "المستخدمون — ألو تكسي" },
      { name: "description", content: "إدارة حسابات الموظفين والمدراء وكلمات المرور والتفعيل." },
      { property: "og:title", content: "المستخدمون — ألو تكسي" },
      { property: "og:description", content: "إدارة مستخدمي نظام ألو تكسي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsers,
});

type UserRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  role: string;
  orders_count: number;
};

function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUser);
  const passwordFn = useServerFn(adminSetPassword);
  const deleteFn = useServerFn(adminDeleteUser);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users", {});
      if (error) throw error;
      return (data ?? []) as unknown as UserRow[];
    },
  });

  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "user" });
  const [editForm, setEditForm] = useState({ full_name: "", role: "user", email: "", password: "" });
  const [newPassword, setNewPassword] = useState("");

  const create = useMutation({
    mutationFn: async () =>
      createFn({
        data: {
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          role: form.role as "admin" | "user",
        },
      }),
    onSuccess: () => {
      toast.success("تمت إضافة المستخدم بنجاح");
      setCreateOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "user" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذّرت إضافة المستخدم"),
  });

  const update = useMutation({
    mutationFn: async () =>
      updateFn({
        data: {
          user_id: editing!.id,
          full_name: editForm.full_name.trim(),
          role: editForm.role as "admin" | "user",
          ...(editForm.email.trim() ? { email: editForm.email.trim() } : {}),
          ...(editForm.password ? { password: editForm.password } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر تحديث المستخدم"),
  });

  const remove = useMutation({
    mutationFn: async () => deleteFn({ data: { user_id: deleting!.id } }),
    onSuccess: () => {
      toast.success("تم حذف الحساب نهائياً");
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر حذف الحساب"),
  });

  const setPassword = useMutation({
    mutationFn: async () => passwordFn({ data: { user_id: pwUser!.id, password: newPassword } }),
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور");
      setPwUser(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر تغيير كلمة المرور"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_active", { p_id: id, p_active: active });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.active ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("تعذّر تغيير حالة الحساب"),
  });

  const rows = (users.data ?? []).filter((u) => {
    const q = search.trim();
    if (!q) return true;
    return (u.full_name || "").includes(q) || (u.email || "").includes(q);
  });

  return (
    <AppShell title="المستخدمون">
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardContent className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو البريد"
                className="h-11 pr-9"
              />
            </div>
            <Button className="h-11" onClick={() => setCreateOpen(true)}>
              <UserPlus className="ml-1 size-4" />
              إضافة مستخدم
            </Button>
          </CardContent>
        </Card>

        {users.isLoading ? (
          <LoadingState />
        ) : users.isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="لا يوجد مستخدمون مطابقون" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((u) => (
              <Card key={u.id} className="shadow-none">
                <CardContent className="space-y-3 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{u.full_name || "بدون اسم"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{u.email ?? "—"}</p>
                    </div>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "مدير" : "موظف"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <p>
                      طلبات الدورة الحالية:{" "}
                      <span className="num font-semibold text-foreground">{formatNumber(u.orders_count)}</span>
                    </p>
                    <p>أُنشئ: {formatDate(u.created_at)}</p>
                    <p className="col-span-2">آخر دخول: {formatDateTime(u.last_login_at)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(u);
                        setEditForm({
                          full_name: u.full_name,
                          role: u.role,
                          email: u.email ?? "",
                          password: "",
                        });
                      }}
                    >
                      <Pencil className="ml-1 size-3.5" />
                      تعديل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPwUser(u)}>
                      <KeyRound className="ml-1 size-3.5" />
                      كلمة المرور
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleting(u)}>
                      <Trash2 className="ml-1 size-3.5" />
                      حذف
                    </Button>
                    <div className="mr-auto flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {u.is_active ? "مُفعّل" : "معطّل"}
                      </span>
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: u.id, active: v })}
                        aria-label="تفعيل/تعطيل الحساب"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          حذف الحساب يحذف أيضاً كل طلباته نهائياً — إن أردت الاحتفاظ بالسجلات استخدم التعطيل.
        </p>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم</DialogTitle>
            <DialogDescription>سيتم تفعيل الحساب مباشرة بعد الإنشاء.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input
                className="h-11"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input
                className="h-11"
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input
                className="h-11"
                type="text"
                dir="ltr"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>الصلاحية</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">موظف</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={
                create.isPending ||
                !form.full_name.trim() ||
                !form.email.trim() ||
                form.password.length < 6
              }
              onClick={() => create.mutate()}
            >
              {create.isPending ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input
                className="h-11"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input
                className="h-11"
                type="email"
                dir="ltr"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة مرور جديدة (اختياري)</Label>
              <Input
                className="h-11"
                dir="ltr"
                placeholder="اتركه فارغاً لعدم التغيير"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نوع الحساب</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">موظف</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button
              disabled={
                update.isPending ||
                !editForm.full_name.trim() ||
                (!!editForm.password && editForm.password.length < 6)
              }
              onClick={() => update.mutate()}
            >
              {update.isPending ? "جاري الحفظ…" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>{pwUser?.full_name || pwUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>كلمة المرور الجديدة</Label>
            <Input
              className="h-11"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>
              إلغاء
            </Button>
            <Button
              disabled={setPassword.isPending || newPassword.length < 6}
              onClick={() => setPassword.mutate()}
            >
              {setPassword.isPending ? "جاري الحفظ…" : "تغيير"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الحساب</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف حساب «{deleting?.full_name || deleting?.email}» نهائياً مع كل طلباته
              ({formatNumber(deleting?.orders_count ?? 0)} طلب في الدورة الحالية) ولا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
            >
              {remove.isPending ? "جاري الحذف…" : "حذف نهائي"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
