import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Rfq } from "@/lib/rfq-data";
import { Badge } from "@/components/ui/badge";
import { FileText, Package, Clock, Loader2 } from "lucide-react";
import { useRfqStore } from "@/lib/rfq-store";

export function RfqCard({ rfq, onOpen }: { rfq: Rfq; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rfq.id,
  });
  const isProcessing = useRfqStore((s) => s.movingId === rfq.id);
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const totalQty = rfq.lineItems.reduce((s, l) => s + l.qty, 0);
  const daysAgo = Math.floor((Date.now() - new Date(rfq.receivedAt).getTime()) / 86400000);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className="group cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-foreground/20 active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{rfq.id.slice(0, 8)}</span>
        <div className="flex items-center gap-1">
          {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Badge variant="secondary" className="text-[10px]">
            {rfq.customer.split(" ")[0]}
          </Badge>
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{rfq.subject}</p>
      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Package className="h-3 w-3" />
          {rfq.isParsed ? `${rfq.lineItems.length} × ${totalQty.toLocaleString()}` : "not parsed"}
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          PDF
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {daysAgo === 0 ? "today" : `${daysAgo}d`}
        </span>
      </div>
    </div>
  );
}
