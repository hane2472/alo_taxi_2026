import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DELETION_REASONS } from "@/lib/format";

export function DeleteOrderDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
}: {
  orderId: string | null;
  orderNumber: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reason, setReason] = useState(DELETION_REASONS[0]);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      const { error } = await supabase
        .from("orders")
        .update({ deleted_at: new Date().toISOString(), deletion_reason: reason })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الطلب");
      queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: () => toast.error("تعذّر حذف الطلب. قد تكون الدورة مؤرشفة."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>تأكيد حذف الطلب</DialogTitle>
          <DialogDescription>
            سيتم حذف الطلب <span className="num font-semibold">{orderNumber}</span> مع الاحتفاظ به في
            السجلات. اختر سبب الحذف.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {DELETION_REASONS.map((r) => (
            <Label
              key={r}
              className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
            >
              <RadioGroupItem value={r} />
              {r}
            </Label>
          ))}
        </RadioGroup>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
            حذف الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
