import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AmountCombo } from "@/components/AmountCombo";
import { CaptainPicker } from "@/components/CaptainPicker";
import { formatDate, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";

const RECENT_KEY = "alotaxi.recent-captains";

export type OrderFormValue = {
  order_date: string;
  amount: number | null;
  captain_id: string | null;
  pickup_location: string;
  destination: string;
  notes: string;
};

export function useCaptains() {
  return useQuery({
    queryKey: ["captains-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("captains")
        .select("id, name, phone, vehicle_number")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function rememberCaptain(id: string) {
  if (typeof window === "undefined") return;
  const prev = readRecent().filter((x) => x !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, 4)));
}

export function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function OrderFormFields({
  value,
  onChange,
  showNotes = true,
}: {
  value: OrderFormValue;
  onChange: (v: OrderFormValue) => void;
  showNotes?: boolean;
}) {
  const { data: captains, isLoading } = useCaptains();
  const [recent, setRecent] = useState<string[]>([]);
  const [openDate, setOpenDate] = useState(false);

  useEffect(() => setRecent(readRecent()), []);

  const selectedDate = useMemo(() => new Date(`${value.order_date}T00:00:00`), [value.order_date]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>تاريخ الطلب</Label>
        <Popover open={openDate} onOpenChange={setOpenDate}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11 w-full justify-between font-normal">
              <span>{formatDate(value.order_date)}</span>
              <CalendarIcon className="size-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) onChange({ ...value, order_date: toDateInput(d) });
                setOpenDate(false);
              }}
              disabled={{ after: new Date() }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5">
        <Label>قيمة الطلب</Label>
        <AmountCombo value={value.amount} onChange={(amount) => onChange({ ...value, amount })} />
      </div>

      <div className="space-y-1.5">
        <Label>الكابتن</Label>
        {isLoading ? (
          <div className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جاري تحميل الكباتن…
          </div>
        ) : (
          <CaptainPicker
            captains={captains ?? []}
            value={value.captain_id}
            recentIds={recent}
            onChange={(captain_id) => onChange({ ...value, captain_id })}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>نقطة البداية (اختياري)</Label>
          <Input
            className="h-11"
            value={value.pickup_location}
            onChange={(e) => onChange({ ...value, pickup_location: e.target.value })}
            placeholder="مثال: دوار المدينة"
          />
        </div>
        <div className="space-y-1.5">
          <Label>الوجهة (اختياري)</Label>
          <Input
            className="h-11"
            value={value.destination}
            onChange={(e) => onChange({ ...value, destination: e.target.value })}
            placeholder="مثال: حي الزهور"
          />
        </div>
      </div>

      {showNotes && (
        <div className="space-y-1.5">
          <Label>ملاحظة (اختياري)</Label>
          <Textarea
            rows={2}
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            placeholder="أي ملاحظة قصيرة"
          />
        </div>
      )}
    </div>
  );
}

export function emptyOrderForm(): OrderFormValue {
  return {
    order_date: toDateInput(new Date()),
    amount: null,
    captain_id: null,
    pickup_location: "",
    destination: "",
    notes: "",
  };
}
