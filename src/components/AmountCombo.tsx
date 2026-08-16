import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AMOUNT_PRESETS, formatNumber } from "@/lib/format";

const OTHER = "__other__";

export function AmountCombo({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const isPreset = value != null && AMOUNT_PRESETS.includes(value);
  const [custom, setCustom] = useState(!isPreset && value != null);

  return (
    <div className="space-y-2">
      <Select
        value={custom ? OTHER : value != null ? String(value) : ""}
        onValueChange={(v) => {
          if (v === OTHER) {
            setCustom(true);
            onChange(null);
          } else {
            setCustom(false);
            onChange(Number(v));
          }
        }}
      >
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder="اختر قيمة الطلب" />
        </SelectTrigger>
        <SelectContent>
          {AMOUNT_PRESETS.map((p) => (
            <SelectItem key={p} value={String(p)}>
              <span className="num">{formatNumber(p)}</span> ل.س
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>قيمة أخرى…</SelectItem>
        </SelectContent>
      </Select>

      {custom && (
        <div className="relative">
          <Input
            autoFocus
            inputMode="numeric"
            className="h-11 pl-14 text-base num"
            value={value != null ? formatNumber(value) : ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "");
              onChange(digits ? Number(digits) : null);
            }}
            placeholder="أدخل القيمة"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ل.س
          </span>
        </div>
      )}
    </div>
  );
}
