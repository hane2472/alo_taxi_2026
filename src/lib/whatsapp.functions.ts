import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendSchema = z.object({
  period_id: z.string().uuid().nullable().optional(),
  captain_ids: z.array(z.string().uuid()).min(1).max(200),
});

type CaptainRow = {
  id: string;
  name: string;
  phone: string | null;
  orders_count: number;
  total_amount: number;
  total_commission: number;
};

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("963")) return d;
  if (d.startsWith("0")) return `963${d.slice(1)}`;
  if (d.length === 9 && d.startsWith("9")) return `963${d}`;
  return d;
}

function buildMessage(o: {
  name: string;
  periodName: string;
  orders: number;
  commission: number;
}): string {
  const money = new Intl.NumberFormat("en-US").format(Math.round(o.commission));
  const count = new Intl.NumberFormat("en-US").format(o.orders);
  return [
    `مرحباً ${o.name}`,
    `كشف عمولات الو تكسي`,
    `الدورة: ${o.periodName}`,
    `عدد الطلبات: ${count}`,
    `إجمالي العمولة: ${money} ل.س`,
  ].join("\n");
}

export const sendCommissionWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const token = process.env["WHATSAPP_ACCESS_TOKEN"];
    const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
    if (!token || !phoneId) {
      throw new Error(
        "لم يتم ضبط مفاتيح واتساب بعد (WHATSAPP_ACCESS_TOKEN و WHATSAPP_PHONE_NUMBER_ID).",
      );
    }

    const periodId = data.period_id ?? null;

    const { data: periodRow } = await context.supabase
      .from("accounting_periods")
      .select("id, name, status")
      .eq(periodId ? "id" : "status", periodId ?? "open")
      .maybeSingle();

    const resolvedPeriodId = periodRow?.id ?? null;
    const periodName = periodRow?.name ?? "الدورة الحالية";

    const { data: captainsData, error: captainsError } = await context.supabase.rpc(
      "admin_captains",
      { p_period: resolvedPeriodId ?? undefined } as never,
    );
    if (captainsError) throw new Error(captainsError.message);

    const captains = ((captainsData ?? []) as unknown as CaptainRow[]).filter((c) =>
      data.captain_ids.includes(c.id),
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: {
      captain_id: string;
      captain_name: string;
      status: "sent" | "failed";
      error?: string;
    }[] = [];

    for (const c of captains) {
      const to = normalizePhone(c.phone);
      let status: "sent" | "failed" = "failed";
      let errorMessage: string | null = null;
      let messageId: string | null = null;

      if (!to) {
        errorMessage = "لا يوجد رقم هاتف مسجّل لهذا الكابتن";
      } else {
        try {
          const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to,
              type: "text",
              text: {
                preview_url: false,
                body: buildMessage({
                  name: c.name,
                  periodName,
                  orders: Number(c.orders_count),
                  commission: Number(c.total_commission),
                }),
              },
            }),
          });
          const body = (await res.json().catch(() => ({}))) as {
            messages?: { id: string }[];
            error?: { message?: string };
          };
          if (res.ok && body.messages?.[0]?.id) {
            status = "sent";
            messageId = body.messages[0].id;
          } else {
            errorMessage = body.error?.message ?? `HTTP ${res.status}`;
          }
        } catch (e) {
          errorMessage = e instanceof Error ? e.message : "تعذّر الاتصال بخدمة واتساب";
        }
      }

      await supabaseAdmin.from("whatsapp_logs").insert({
        captain_id: c.id,
        captain_name: c.name,
        period_id: resolvedPeriodId,
        period_name: periodName,
        phone: to ?? c.phone,
        orders_count: Number(c.orders_count),
        commission_amount: Number(c.total_commission),
        status,
        error_message: errorMessage,
        message_id: messageId,
        sent_by: context.userId,
      });

      results.push({
        captain_id: c.id,
        captain_name: c.name,
        status,
        ...(errorMessage ? { error: errorMessage } : {}),
      });
    }

    return {
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };
  });
