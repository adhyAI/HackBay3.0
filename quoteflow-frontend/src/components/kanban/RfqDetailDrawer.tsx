import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Rfq } from "@/lib/rfq-data";
import { STAGES } from "@/lib/rfq-data";
import { useRfqStore } from "@/lib/rfq-store";
import { FileText, Mail, Bot, Factory, Calculator, Send, Network, Sparkles } from "lucide-react";

export function RfqDetailDrawer({
  rfq,
  open,
  onOpenChange,
}: {
  rfq: Rfq | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const actionPending = useRfqStore((s) => s.actionPending);
  const parseRfq = useRfqStore((s) => s.parseRfq);
  const runDaytona = useRfqStore((s) => s.runDaytona);
  const findSimilarRfqs = useRfqStore((s) => s.findSimilarRfqs);
  const getVendorQuote = useRfqStore((s) => s.getVendorQuote);
  const finalize = useRfqStore((s) => s.finalize);

  if (!rfq) return null;
  const stageLabel = STAGES.find((s) => s.id === rfq.stage)?.label ?? rfq.stage;
  const totalQty = rfq.lineItems.reduce((s, l) => s + l.qty, 0);
  const isBusy = actionPending === rfq.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{rfq.id.slice(0, 8)}</span>
            <span>·</span>
            <Badge variant="outline">{stageLabel}</Badge>
          </div>
          <SheetTitle className="text-base leading-snug">{rfq.subject}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {rfq.customer} — {rfq.contact}
          </p>
        </SheetHeader>

        <div className="space-y-6 p-5">
          {/* Request stage: email + PDF */}
          <section>
            <SectionTitle icon={<Mail className="h-3.5 w-3.5" />}>Inbound email</SectionTitle>
            <div className="mt-2 rounded-lg border bg-muted/30 p-3">
              <div className="text-[11px] text-muted-foreground">
                From: <span className="text-foreground">{rfq.contact}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Received: {new Date(rfq.receivedAt).toLocaleString()}
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/90">
                {rfq.emailBody}
              </pre>
              <div className="mt-3 flex items-center gap-2 rounded-md border bg-background p-2">
                <FileText className="h-4 w-4 text-red-500" />
                <div className="flex-1 text-xs">
                  <div className="font-medium">{rfq.pdfName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {rfq.lineItems.length} line item{rfq.lineItems.length > 1 ? "s" : ""} extracted
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Line items */}
          <section>
            <SectionTitle icon={<FileText className="h-3.5 w-3.5" />}>Line items</SectionTitle>
            {rfq.isParsed ? (
              <div className="mt-2 overflow-hidden rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Part</th>
                      <th className="px-2 py-1.5 text-left">Material / Note</th>
                      <th className="px-2 py-1.5 text-right">Qty</th>
                      <th className="px-2 py-1.5 text-right">Unit $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.lineItems.map((l) => (
                      <tr key={l.partNumber} className="border-t">
                        <td className="px-2 py-1.5">
                          <div className="font-mono text-[11px]">{l.partNumber}</div>
                          <div className="text-[10px] text-muted-foreground">{l.description}</div>
                        </td>
                        <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{l.material}</td>
                        <td className="px-2 py-1.5 text-right">{l.qty.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {l.unitCostUsd ? `$${l.unitCostUsd.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Not yet parsed — move this card to Sales Review to extract the part, quantity, and spec notes from the email.
              </div>
            )}
          </section>

          {/* Agent activity */}
          {rfq.agentNotes.length > 0 && (
            <section>
              <SectionTitle icon={<Bot className="h-3.5 w-3.5" />}>
                Agent activity{rfq.daytonaRunId && (
                  <span className="ml-2 font-mono text-[10px] font-normal text-muted-foreground">
                    daytona:{rfq.daytonaRunId.slice(0, 8)}
                  </span>
                )}
              </SectionTitle>
              <ul className="mt-2 space-y-1.5 text-xs">
                {rfq.agentNotes.map((n, i) => (
                  <li key={i} className="flex gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                    <span className="text-muted-foreground">›</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Vendor quote */}
          {rfq.vendorName && rfq.vendorLandingCost != null && (
            <section>
              <SectionTitle icon={<Factory className="h-3.5 w-3.5" />}>Vendor quote</SectionTitle>
              <div className="mt-2 flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                <div className="font-medium">{rfq.vendorName}</div>
                <span className="font-mono">${rfq.vendorLandingCost.toFixed(2)} landing cost</span>
              </div>
            </section>
          )}

          {/* Cost calc */}
          {rfq.vendorLandingCost != null && (
            <section>
              <SectionTitle icon={<Calculator className="h-3.5 w-3.5" />}>
                Landed cost + markup
              </SectionTitle>
              <div className="mt-2 rounded-lg border p-3 text-xs">
                <Row label="Vendor landing cost" value={`$${rfq.vendorLandingCost.toFixed(2)}`} bold />
                <Row
                  label={`Markup (${rfq.markupPct}%)`}
                  value={`+$${(rfq.vendorLandingCost * (rfq.markupPct / 100)).toFixed(2)}`}
                />
                <Separator className="my-2" />
                <Row
                  label="Customer quote"
                  value={rfq.finalQuote != null ? `$${rfq.finalQuote.toFixed(2)}` : "not finalized yet"}
                  bold
                  accent
                />
              </div>
              {rfq.stage === "customer_sent" && rfq.finalQuote != null && (
                <div className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600/10 py-2 text-xs font-medium text-emerald-700">
                  <Send className="h-3.5 w-3.5" /> Quote sent to {rfq.contact}
                </div>
              )}
            </section>
          )}

          {/* Similar past RFQs (Neo4j) */}
          {rfq.similarPastRfqs.length > 0 && (
            <section>
              <SectionTitle icon={<Network className="h-3.5 w-3.5" />}>
                Similar past RFQs
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[9px] font-normal text-muted-foreground">
                  Neo4j
                </span>
              </SectionTitle>
              <div className="mt-2 space-y-1">
                {rfq.similarPastRfqs.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs"
                  >
                    <span>{p.customer}</span>
                    <span className="font-mono text-[11px]">won @ ${p.wonUsd.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pipeline actions */}
          <section>
            <SectionTitle icon={<Sparkles className="h-3.5 w-3.5" />}>Pipeline actions</SectionTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <ActionButton
                label="Parse Email (Nebius)"
                busy={isBusy}
                onClick={() => parseRfq(rfq.id)}
              />
              <ActionButton
                label="Run Daytona Sandbox"
                busy={isBusy}
                disabled={!rfq.isParsed}
                onClick={() => runDaytona(rfq.id)}
              />
              <ActionButton
                label="Find Similar RFQs"
                busy={isBusy}
                variant="secondary"
                disabled={!rfq.isParsed}
                onClick={() => findSimilarRfqs(rfq.id)}
              />
              <ActionButton
                label="Get Vendor Quote"
                busy={isBusy}
                variant="secondary"
                onClick={() => getVendorQuote(rfq.id)}
              />
              <ActionButton
                label="Finalize & Send"
                busy={isBusy}
                disabled={rfq.vendorLandingCost == null}
                onClick={() => finalize(rfq.id)}
              />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionButton({
  label,
  onClick,
  busy,
  disabled,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={
        variant === "primary"
          ? "inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
          : "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
      }
    >
      {busy ? "Working…" : label}
    </button>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {children}
    </h4>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span
        className={`font-mono ${bold ? "font-semibold" : ""} ${accent ? "text-base text-foreground" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
