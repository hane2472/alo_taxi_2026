import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { useProfile, useCurrentPeriod } from "@/lib/session";
import { formatDate, formatTime, formatNumber, ORDER_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "الرئيسية — ألو تكسي" },
      { name: "description", content: "لوحة الموظف: عدد الطلبات المُدخلة وإضافة طلب جديد." },
      { property: "og:title", content: "الرئيسية — ألو تكسي" },
      { property: "og:description", content: "لوحة الموظف في نظام ألو تكسي." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: profile } = useProfile();
  const { data: period } = useCurrentPeriod();

  const count = useQuery({
    queryKey: ["my-order-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_order_count");
      if (error) throw error;
      return data ?? 0;
    },
  });

  const orders = useQuery({
    queryKey: ["my-orders", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, order_date, status, created_at, captains(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell title="الرئيسية">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="shadow-card">
          <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold">{profile?.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {period?.name ?? "لا توجد دورة مفتوحة"}
              </p>
            </div>
            <div className="shrink-0 rounded-xl bg-accent px-4 py-2 text-center">
              <p className="num text-2xl font-extrabold">{formatNumber(count.data ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground">طلباتي في الدورة</p>
            </div>
          </CardContent>
        </Card>

        <Button asChild size="lg" className="h-14 w-full text-base font-bold">
          <Link to="/new-order">
            <PlusCircle className="ml-2 size-5" />
            إضافة طلب جديد
          </Link>
        </Button>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">آخر طلباتي</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/my-orders">
              <ListOrdered className="ml-1 size-4" />
              عرض الكل
            </Link>
          </Button>
        </div>

        {orders.isLoading ? (
          <LoadingState />
        ) : orders.isError ? (
          <ErrorState />
        ) : (orders.data ?? []).length === 0 ? (
          <EmptyState
            title="لم تُضف أي طلب بعد"
            description="ابدأ بإضافة أول طلب في هذه الدورة."
            action={
              <Button asChild size="sm">
                <Link to="/new-order">إضافة طلب</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {(orders.data ?? []).map((o) => (
              <Card key={o.id} className="shadow-none">
                <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                  <div className="min-w-0">
                    <p className="num truncate text-sm font-bold">{o.order_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.captains?.name} · {formatDate(o.order_date)} · {formatTime(o.created_at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
