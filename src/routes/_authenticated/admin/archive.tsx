import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, FileSpreadsheet, Printer, ChevronLeft, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { downloadCsv, htmlTable, printHtml } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/archive")({
  head: () => ({
    meta: [
      { title: "أرشيف الدورات — ألو تكسي" },
      { name: "description", content: "جميع الدورات المحاسبية المؤرشفة مع الطلبات والعمولات." },
      { property: "og:title", content: "أرشيف الدورات — ألو تكسي" },
      { property: "og:description", content: "أرشيف دورات العمولات في ألو تكسي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminArchive,
});

type PeriodRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  archived_at: string | null;
  archived_by_name: string | null;
  closing_note: string | null;
  orders_count: number;
  total_amount: number;
  total_commission: number;
};

function AdminArchive() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [onlyArchived, setOnlyArchived] = useState(true);
  const [deleting, setDeleting] = useState<PeriodRow | null>(null);

  const removePeriod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)("admin_delete_period", { p_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم حذف الدورة نهائياً");
      setDeleting(null);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر حذف الدورة"),
  });

  const periods = useQuery({
    queryKey: ["admin-periods"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_periods");
      if (error) throw error;
      return (data ?? []) as unknown as PeriodRow[];
    },
  });

  const rows = (periods.data ?? []).filter((p) => {
    if (onlyArchived && p.status !== "archived") return false;
    const q = search.trim();
    return !q || p.name.includes(q);
  });

  const exportRows = rows.map((p) => [
    p.name,
    formatDate(p.start_date),
    formatDate(p.end_date),
    p.status === "archived" ? "مؤرشفة" : "مفتوحة",
    p.orders_count,
    p.total_amount,
    p.total_commission,
  ]);
  const headers = ["الدورة", "البداية", "الإغلاق", "الحالة", "عدد الطلبات", "إجمالي التكلفة", "إجمالي العمولة"];

  return (
    <AppShell title="أرشيف الدورات">
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardContent className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم الدورة"
                className="h-11 pr-9"
              />
            </div>
            <Button variant="outline" className="h-11" onClick={() => setOnlyArchived((v) => !v)}>
              {onlyArchived ? "عرض كل الدورات" : "المؤرشفة فقط"}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={rows.length === 0}
              onClick={() => downloadCsv("الدورات", headers, exportRows)}
            >
              <FileSpreadsheet className="ml-1 size-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={rows.length === 0}
              onClick={() =>
                printHtml(
                  "أرشيف الدورات",
                  `<h1>أرشيف الدورات</h1><p class="meta">ألو تكسي</p>${htmlTable(
                    headers,
                    exportRows.map((r) => [
                      r[0],
                      r[1],
                      r[2],
                      r[3],
                      formatNumber(r[4] as number),
                      formatMoney(r[5] as number),
                      formatMoney(r[6] as number),
                    ]),
                  )}`,
                )
              }
            >
              <Printer className="ml-1 size-4" />
              طباعة / PDF
            </Button>
          </CardContent>
        </Card>

        {periods.isLoading ? (
          <LoadingState />
        ) : periods.isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا توجد دورات مؤرشفة بعد"
            description="عند إغلاق الدورة الحالية ستظهر هنا للاطلاع فقط."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((p) => (
              <Card key={p.id} className="shadow-none">
                <CardContent className="space-y-3 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{p.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {formatDate(p.start_date)} — {formatDate(p.end_date)}
                      </p>
                    </div>
                    <Badge variant={p.status === "archived" ? "secondary" : "default"}>
                      {p.status === "archived" ? (
                        <>
                          <Lock className="ml-1 size-3" />
                          مؤرشفة
                        </>
                      ) : (
                        "مفتوحة"
                      )}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-2 text-center">
                    <div>
                      <p className="num text-sm font-bold">{formatNumber(p.orders_count)}</p>
                      <p className="text-[10px] text-muted-foreground">طلب</p>
                    </div>
                    <div>
                      <p className="num text-sm font-bold">{formatMoney(p.total_amount)}</p>
                      <p className="text-[10px] text-muted-foreground">التكلفة</p>
                    </div>
                    <div>
                      <p className="num text-sm font-bold text-success">{formatMoney(p.total_commission)}</p>
                      <p className="text-[10px] text-muted-foreground">العمولة</p>
                    </div>
                  </div>

                  {p.closing_note && (
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{p.closing_note}</p>
                  )}

                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/period/$id" params={{ id: p.id }}>
                        عرض التفاصيل
                        <ChevronLeft className="mr-1 size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={p.status === "open"}
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 className="ml-1 size-4" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الدورة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف دورة «{deleting?.name}» نهائياً مع كل طلباتها
              ({formatNumber(deleting?.orders_count ?? 0)} طلب) وسجلات عمولاتها، ولا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={removePeriod.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) removePeriod.mutate(deleting.id);
              }}
            >
              {removePeriod.isPending ? "جاري الحذف…" : "حذف نهائي"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
