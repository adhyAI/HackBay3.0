import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Column } from "./Column";
import { RfqDetailDrawer } from "./RfqDetailDrawer";
import { STAGES, type StageId } from "@/lib/rfq-data";
import { useRfqStore } from "@/lib/rfq-store";

export function Board() {
  const rfqs = useRfqStore((s) => s.rfqs);
  const tenantId = useRfqStore((s) => s.currentTenantId);
  const moveRfq = useRfqStore((s) => s.moveRfq);
  const load = useRfqStore((s) => s.load);
  const loading = useRfqStore((s) => s.loading);
  const error = useRfqStore((s) => s.error);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const filtered = rfqs.filter((r) => r.tenantId === tenantId);
    return STAGES.map((s) => ({
      ...s,
      rfqs: filtered.filter((r) => r.stage === s.id),
    }));
  }, [rfqs, tenantId]);

  const openRfq = openId ? rfqs.find((r) => r.id === openId) ?? null : null;

  function onDragEnd(e: DragEndEvent) {
    const overId = e.over?.id as StageId | string | undefined;
    if (!overId) return;
    const targetStage = STAGES.find((s) => s.id === overId)?.id;
    if (targetStage) moveRfq(String(e.active.id), targetStage);
  }

  return (
    <>
      {loading && (
        <div className="px-6 pb-3 text-xs text-muted-foreground">Loading pipeline…</div>
      )}
      {error && (
        <div className="mx-6 mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto px-6 pb-6">
          {grouped.map((col) => (
            <Column
              key={col.id}
              stage={col.id}
              label={col.label}
              description={col.description}
              rfqs={col.rfqs}
              onOpen={setOpenId}
            />
          ))}
        </div>
      </DndContext>
      <RfqDetailDrawer
        rfq={openRfq}
        open={!!openRfq}
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </>
  );
}
