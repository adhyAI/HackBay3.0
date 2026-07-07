import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { TENANTS, CURRENT_USER } from "@/lib/tenants";
import { useRfqStore } from "@/lib/rfq-store";
import { Check, Mail, Database, Server, Network } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Quotsy" },
      { name: "description", content: "Manage accounts and integrations." },
    ],
  }),
  component: Profile,
});

const INTEGRATIONS = [
  { icon: Mail, name: "Email inbox", desc: "Ingest RFQ emails from Gmail / Outlook" },
  { icon: Database, name: "CRM", desc: "Sync customers and deals to Hubspot / Salesforce" },
  { icon: Network, name: "Neo4j", desc: "Learn from past RFQs and vendor performance" },
  { icon: Server, name: "Daytona", desc: "Spin up sandboxes for agents to run cost calcs" },
];

function Profile() {
  const currentTenantId = useRfqStore((s) => s.currentTenantId);
  const setTenant = useRfqStore((s) => s.setTenant);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[900px] px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Signed in as
          </h2>
          <div className="mt-3 flex items-center gap-3 rounded-lg border p-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">
              {CURRENT_USER.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <div className="text-sm font-medium">{CURRENT_USER.name}</div>
              <div className="text-xs text-muted-foreground">
                {CURRENT_USER.email} · {CURRENT_USER.role}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Accounts
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Switch between customer accounts. Each has its own pipeline of RFQs.
          </p>
          <div className="mt-3 space-y-2">
            {TENANTS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTenant(t.id)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-md text-xs font-semibold text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.initials}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.industry}</div>
                </div>
                {t.id === currentTenantId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                    <Check className="h-3 w-3" /> active
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Integrations
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect the systems that feed and receive from the pipeline.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {INTEGRATIONS.map((i) => (
              <div key={i.name} className="flex items-start gap-3 rounded-lg border p-3">
                <i.icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.desc}</div>
                </div>
                <button
                  onClick={() => toast(`${i.name} connection coming soon`)}
                  className="rounded border px-2 py-1 text-[11px] hover:bg-accent"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
