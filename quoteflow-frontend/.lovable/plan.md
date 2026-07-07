
## Goal

A clean frontend prototype for an RFQ-to-quote workflow tool. No backend yet — everything runs off in-memory synthetic data so the flow is tangible and demoable. Human-in-the-loop is the core interaction: you drag cards across a 5-stage Kanban.

## Scope (this pass, frontend only)

1. **Landing page** (`/`) — short pitch, "how it works" (5 stages), CTA into the dashboard.
2. **Dashboard** (`/dashboard`) — Kanban with 5 columns:
   - **Request** — inbound email + attached PDF (rendered as an email preview card with subject, sender, body snippet, PDF thumbnail + line items)
   - **Sales & Engineering** — internal review; shows AI-agent notes (mocked) with quantities, specs extracted, questions raised
   - **Vendor RFQ** — outbound request to vendor(s); shows vendor list + status
   - **Landed Cost** — vendor cost + freight/duties + markup calculator
   - **Customer Quote** — final quote preview ready to send
   Cards drag between columns (dnd-kit). Clicking a card opens a right-side detail drawer with the full record for that stage.
3. **Account switcher** — top-right avatar menu listing 3 seeded tenants (e.g. "Acme Industrial", "Nordic Metals", "Delta Precision"). Switching filters the Kanban to that tenant's RFQs. State kept in localStorage.
4. **Profile section** (`/profile`) — current user + tenant, list of accounts to switch between, mock "connected integrations" (Email, CRM, Neo4j, Daytona) shown as disconnected chips with "Connect" buttons that just toast "coming soon".
5. **Synthetic data** — 100 RFQs generated at module load, distributed across the 5 stages and 3 tenants, with realistic-looking industrial part descriptions, quantities, vendor names, and cost breakdowns. Kept in a Zustand store so drags persist within the session.

## Tech choices

- TanStack Start routes: `/`, `/dashboard`, `/profile`
- `@dnd-kit/core` + `@dnd-kit/sortable` for the Kanban
- Zustand for client state (RFQs + current tenant)
- Faker-like seeded generator (hand-rolled, no dep) for the 100 RFQs
- shadcn components already in the stack; no new UI lib
- No Lovable Cloud yet — you said butter base (Supabase/Cloud) is for later

## Out of scope (explicitly deferred)

- Real email/CRM/Neo4j/Daytona integrations
- Auth (account switcher is a mock picker, not real multitenancy)
- Persisting drags across reloads to a backend
- PDF parsing (PDF is shown as a static preview image + fake extracted fields)

## About the "rocket ride" / other tools you mentioned

- **Neo4j** — makes sense later for learning patterns across RFQs (similar past quotes, vendor performance graph). For the prototype I'll mock a "Similar past RFQs" panel in the detail drawer so the UX is designed for it.
- **Daytona** — fits as the sandbox where the sales/engineer agent spins up to run cost calcs. I'll show a mocked "Agent run" log in the Sales & Engineering stage so the slot exists.
- **RocketRide** — I don't have a clear product fit here. My suggestion: **skip it for this prototype**. If you meant something specific (a payment/checkout flow for the final customer quote? a delivery/logistics tracker for landed cost?) tell me and I'll wire it into the right stage. Otherwise it stays out.

## File plan

```text
src/routes/
  index.tsx              landing
  dashboard.tsx          kanban + account switcher in header
  profile.tsx            profile + tenant list + integration chips
src/components/
  Header.tsx             logo, nav, AccountSwitcher
  AccountSwitcher.tsx
  kanban/
    Board.tsx
    Column.tsx
    RfqCard.tsx
    RfqDetailDrawer.tsx
    stages/
      RequestStage.tsx        email + pdf preview
      SalesEngStage.tsx       agent notes + extracted specs
      VendorStage.tsx         vendor list + status
      LandedCostStage.tsx     cost + markup calculator
      CustomerQuoteStage.tsx  final quote preview
src/lib/
  rfq-data.ts            synthetic generator (100 RFQs, 3 tenants)
  rfq-store.ts           zustand store
  tenants.ts
```

## One open question before I build

You said the prototype should "make sense" — I'm assuming a **desktop-first** workflow tool aesthetic (dense, functional, closer to Linear/Height than a marketing SaaS). Confirm or say "no, keep it airy/marketing-y" and I'll adjust the visual direction.
