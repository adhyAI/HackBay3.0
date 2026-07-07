import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Board } from "@/components/kanban/Board";
import { useRfqStore } from "@/lib/rfq-store";
import { TENANTS } from "@/lib/tenants";
import { Mailbox } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Pipeline — Quotsy" },
      { name: "description", content: "Drag RFQs across stages: request, sales & engineering, vendor, landed cost, customer quote." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PipelineHeader />
      <Board />
    </div>
  );
}

function PipelineHeader() {
  const tenantId = useRfqStore((s) => s.currentTenantId);
  const rfqs = useRfqStore((s) => s.rfqs);
  const loading = useRfqStore((s) => s.loading);
  const simulateIncoming = useRfqStore((s) => s.simulateIncoming);
  const tenant = TENANTS.find((t) => t.id === tenantId);
  const count = rfqs.filter((r) => r.tenantId === tenantId).length;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">RFQ Pipeline</h1>
          <p className="text-xs text-muted-foreground">
            {tenant?.name} · {count} active RFQs · drag cards between stages to advance
          </p>
        </div>
        <button
          onClick={() => void simulateIncoming()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
        >
          <Mailbox className="h-3.5 w-3.5" />
          Simulate incoming RFQ
        </button>
      </div>
    </div>
  );
}
