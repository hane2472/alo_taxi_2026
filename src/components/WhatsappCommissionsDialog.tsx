import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Send, CheckCircle2, XCircle, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendCommissionWhatsapp } from "@/lib/whatsapp.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney, formatNumber } from "@/lib/format";

export type WhatsappCaptain = {
  id: string;
  name: string;
  phone?: string | null;
  orders_count: number;
  total_commission: number;
};

type SendResult = { captain_id: string; captain_name: string; status: "sent" | "failed"; error?: string };

export function WhatsappCommissionsDialog({
  captains,
  periodId,
  periodName,
}: {
  captains: WhatsappCaptain[];
  periodId?: string | null;
  periodName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const qc = useQueryClient();
  const send = useServerFn(sendCommissionWhatsapp);

  const logs = useQuery({
    queryKey: ["whatsapp-logs", periodId ?? "current"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_logs")
        .select("id, captain_name, phone, status, error_message, created_at, commission_amount")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const allIds = useMemo(() => captains.map((c) => c.id), [captains]);
  const chosen = selected.length ? selected : [];

  const mutation = useMutation({
    mutationFn: async (ids: string[]) =>
      send({ data: { period_id: periodId ?? null, captain_ids: ids } }),
    onSuccess: (res) => {
      setResults(res.results as SendResult[]);
      setConfirming(false);
      if (res.failed === 0) toast.success(`تم إرسال ${res.sent} رسالة بنجاح`);
      else toast.warning(`نجح ${res.sent} وفشل ${res.failed}`);
      qc.invalidateQueries({ queryKey: ["whatsapp-logs"] });
    },
    onError: (e: Error) => {
      setConfirming(false);
      toast.error(e.message || "تعذّر إرسال الرسائل");
    },
  });

  function statusOf(id: string) {
    return results.find((r) => r.captain_id === id);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setConfirming(false);
          setResults([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageCircle className="ml-1 size-4" /> إرسال العمولات عبر واتساب
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">إرسال العمولات للكباتن عبر واتساب</DialogTitle>
          <DialogDescription className="text-xs">
            {periodName ?? "الدورة الحالية"} — سيتم إرسال رسالة منفصلة لكل كابتن على رقمه المسجّل.
          </DialogDescription>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-3">
            <div className="rounded-xl border bg-muted p-4 text-center">
              <p className="text-sm">سيتم الإرسال إلى</p>
              <p className="num text-2xl font-extrabold">{formatNumber(chosen.length)}</p>
              <p className="text-sm">كابتن</p>
            </div>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                size="sm"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(chosen)}
              >
                {mutation.isPending ? (
                  <Loader2 className="ml-1 size-4 animate-spin" />
                ) : (
                  <Send className="ml-1 size-4" />
                )}
                تأكيد الإرسال
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
                رجوع
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(allIds)}>
                تحديد الكل
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelected([])}>
                إلغاء التحديد
              </Button>
            </div>

            <div className="space-y-2">
              {captains.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا يوجد كباتن لديهم عمولات في هذه الدورة.</p>
              ) : (
                captains.map((c) => {
                  const st = statusOf(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border p-2">
                      <Checkbox
                        checked={selected.includes(c.id)}
                        onCheckedChange={(v) =>
                          setSelected((prev) =>
                            v ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                          )
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{c.name}</p>
                        <p className="num text-[11px] text-muted-foreground">
                          {c.phone || "لا يوجد رقم"} · {formatNumber(c.orders_count)} طلب ·{" "}
                          {formatMoney(c.total_commission)}
                        </p>
                        {st?.status === "failed" && st.error ? (
                          <p className="text-[11px] text-destructive">{st.error}</p>
                        ) : null}
                      </div>
                      {st ? (
                        st.status === "sent" ? (
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <CheckCircle2 className="size-3" /> تم
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="shrink-0 gap-1">
                            <XCircle className="size-3" /> فشل
                          </Badge>
                        )
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate([c.id])}
                      >
                        {st?.status === "failed" ? (
                          <RotateCw className="size-4" />
                        ) : (
                          <Send className="size-4" />
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {results.some((r) => r.status === "failed") ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate(results.filter((r) => r.status === "failed").map((r) => r.captain_id))
                }
              >
                <RotateCw className="ml-1 size-4" /> إعادة إرسال الرسائل الفاشلة
              </Button>
            ) : null}

            <DialogFooter className="sm:justify-start">
              <Button
                size="sm"
                disabled={selected.length === 0 || mutation.isPending}
                onClick={() => setConfirming(true)}
              >
                <Send className="ml-1 size-4" /> إرسال للمحدّدين ({formatNumber(selected.length)})
              </Button>
            </DialogFooter>

            <div className="space-y-1 border-t pt-2">
              <p className="text-xs font-bold">آخر عمليات الإرسال</p>
              {logs.data && logs.data.length > 0 ? (
                logs.data.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate">
                      {l.captain_name} · <span className="num">{l.phone ?? "—"}</span>
                    </span>
                    <span className={l.status === "sent" ? "text-success" : "text-destructive"}>
                      {l.status === "sent" ? "ناجح" : "فاشل"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground">لا يوجد سجل بعد.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
