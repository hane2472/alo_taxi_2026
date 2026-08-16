import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CaptainOption = {
  id: string;
  name: string;
  phone: string | null;
  vehicle_number: string | null;
};

export function CaptainPicker({
  captains,
  value,
  onChange,
  recentIds = [],
}: {
  captains: CaptainOption[];
  value: string | null;
  onChange: (id: string) => void;
  recentIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = captains.find((c) => c.id === value) ?? null;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = captains.filter((c) =>
      !q
        ? true
        : c.name.toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q) ||
          (c.vehicle_number ?? "").toLowerCase().includes(q),
    );
    const recent = filtered.filter((c) => recentIds.includes(c.id));
    const rest = filtered.filter((c) => !recentIds.includes(c.id));
    return { recent, rest };
  }, [captains, query, recentIds]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="h-11 w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.name : "اختر الكابتن"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو رقم المركبة"
              className="h-9 pr-8"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {list.recent.length > 0 && (
            <>
              <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">آخر الكباتن</p>
              {list.recent.map((c) => (
                <Row key={c.id} captain={c} selected={c.id === value} onPick={pick} />
              ))}
              <div className="my-1 border-t" />
            </>
          )}
          {list.rest.map((c) => (
            <Row key={c.id} captain={c} selected={c.id === value} onPick={pick} />
          ))}
          {list.recent.length === 0 && list.rest.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">لا يوجد كابتن مطابق</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  captain,
  selected,
  onPick,
}: {
  captain: CaptainOption;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(captain.id)}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-right text-sm hover:bg-accent",
        selected && "bg-accent",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{captain.name}</span>
        {(captain.phone || captain.vehicle_number) && (
          <span className="block truncate text-[11px] text-muted-foreground">
            {[captain.phone, captain.vehicle_number].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
      {selected && <Check className="size-4 shrink-0 text-success" />}
    </button>
  );
}
