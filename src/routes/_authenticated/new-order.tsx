import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderFormFields, emptyOrderForm, rememberCaptain, type OrderFormValue } from "@/components/OrderForm";

export const Route = createFileRoute("/_authenticated/new-order")({
  head: () => ({
    meta: [
      { title: "إضافة طلب — ألو تكسي" },
      { name: "description", content: "تسجيل طلب جديد وربطه بالكابتن ضمن الدورة الحالية." },
      { property: "og:title", content: "إضافة طلب — ألو تكسي" },
      { property: "og:description", content: "تسجيل طلب جديد في نظام ألو تكسي." },
    ],
  }),
  component: NewOrderPage,
});

function NewOrderPage() {
  const [form, setForm] = useState<OrderFormValue>(emptyOrderForm());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      if (!form.amount || form.amount <= 0) throw new Error("قيمة الطلب غير صحيحة");
      if (!form.captain_id) throw new Error("اختر الكابتن");
      const { data, error } = await supabase
        .from("orders")
        .insert({
          order_date: form.order_date,
          amount: form.amount,
          captain_id: form.captain_id,
          pickup_location: form.pickup_location.trim() || null,
          destination: form.destination.trim() || null,
          notes: form.notes || null,
        })
        .select("order_number")
        .single();
      if (error) throw error;
      return data;
    },
  });

  async function submit(again: boolean) {
    if (save.isPending) return;
    try {
      const data = await save.mutateAsync();
      if (form.captain_id) rememberCaptain(form.captain_id);
      queryClient.invalidateQueries();
      toast.success(`تم حفظ الطلب رقم ${data?.order_number ?? ""}`);
      if (again) {
        setForm({ ...emptyOrderForm(), order_date: form.order_date });
      } else {
        navigate({ to: "/my-orders" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر حفظ الطلب";
      toast.error(msg.includes("row-level") ? "لا يمكن الحفظ: لا توجد دورة مفتوحة" : msg);
    }
  }

  return (
    <AppShell title="إضافة طلب جديد">
      <div className="mx-auto max-w-lg">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <OrderFormFields value={form} onChange={setForm} />

            <div className="mt-6 grid gap-2">
              <Button
                className="h-12 text-base font-bold"
                disabled={save.isPending}
                onClick={() => submit(false)}
              >
                {save.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                حفظ الطلب
              </Button>
              <Button
                variant="secondary"
                className="h-11"
                disabled={save.isPending}
                onClick={() => submit(true)}
              >
                حفظ وإضافة طلب آخر
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/home" })}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
