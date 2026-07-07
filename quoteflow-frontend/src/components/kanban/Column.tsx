import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Rfq, StageId } from "@/lib/rfq-data";
import { RfqCard } from "./RfqCard";

export function Column({
  stage,
  label,
  description,
  rfqs,
  onOpen,
}: {
  stage: StageId;
  label: string;
  description: string;
  rfqs: Rfq[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-baseline justify-between border-b px-3 py-2.5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium">
          {rfqs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 p-2 transition-colors ${isOver ? "bg-accent/40" : ""}`}
        style={{ minHeight: 120 }}
      >
        <SortableContext items={rfqs.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {rfqs.map((r) => (
            <RfqCard key={r.id} rfq={r} onOpen={() => onOpen(r.id)} />
          ))}
        </SortableContext>
        {rfqs.length === 0 && (
          <div className="grid flex-1 place-items-center py-6 text-[11px] text-muted-foreground">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
