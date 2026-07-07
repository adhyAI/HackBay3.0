import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { ArrowRight, Mail, Bot, Factory, Calculator, Send, Boxes } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quotsy — Turn RFQ emails into quotes, faster" },
      {
        name: "description",
        content:
          "A human-in-the-loop pipeline that takes RFQ emails from inbox to costed customer quote, with AI agents assisting sales and engineering at every stage.",
      },
      { property: "og:title", content: "Quotsy — RFQ to quote, faster" },
      {
        property: "og:description",
        content:
          "Pipeline for turning inbound RFQ emails into vendor-costed customer quotes with human-in-the-loop review.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

const STAGES = [
  { icon: Mail, title: "Request", copy: "RFQ email lands with PDF attachment. We parse quantity, drawings and specs." },
  { icon: Bot, title: "Sales & Engineering", copy: "Agent spins up a Daytona sandbox, extracts specs, flags risks for review." },
  { icon: Factory, title: "Vendor RFQ", copy: "Send costed request to matched vendors. Track responses and lead times." },
  { icon: Calculator, title: "Landed Cost", copy: "Material + freight + duties + markup, computed and ready to review." },
  { icon: Send, title: "Customer Quote", copy: "Human-approved quote goes back to the customer. Won deals feed Neo4j." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6">
        {/* Hero */}
        <section className="grid gap-10 py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Human-in-the-loop RFQ pipeline
            </div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">
              From RFQ email
              <br />
              to costed quote,
              <br />
              <span className="text-muted-foreground">without the spreadsheet chaos.</span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Quotsy drops your inbound RFQs into a five-stage pipeline. Agents extract specs,
              request vendor quotes and compute landed cost. You stay in control — drag cards
              forward when a human sign-off is needed.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Open pipeline <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                View accounts
              </Link>
            </div>
          </div>

          {/* Mini kanban preview */}
          <div className="rounded-2xl border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              <Boxes className="h-3.5 w-3.5" /> Pipeline preview
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {STAGES.map((s, i) => (
                <div key={i} className="rounded-lg bg-background p-2">
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="mt-2 space-y-1">
                    {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
                      <div
                        key={j}
                        className="h-8 rounded border bg-card"
                        style={{ opacity: 1 - j * 0.25 }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t py-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            How it works
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {STAGES.map((s, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <s.icon className="h-4 w-4" />
                  <span className="text-[10px] font-mono text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-medium">{s.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <Feat title="Multi-tenant" body="Switch between customer accounts with a single click. Each tenant has its own pipeline." />
            <Feat title="Agent-assisted" body="AI extracts line items from PDFs, matches historical RFQs via Neo4j and drafts vendor emails." />
            <Feat title="Human in the loop" body="Every stage advance is a human decision. Nothing goes to a vendor or customer without approval." />
          </div>
        </section>

        <footer className="border-t py-8 text-xs text-muted-foreground">
          Quotsy prototype · frontend preview
        </footer>
      </main>
    </div>
  );
}

function Feat({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
