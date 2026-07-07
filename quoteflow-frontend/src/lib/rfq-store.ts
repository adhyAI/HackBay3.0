import { create } from "zustand";
import { mapCardToRfq, type Rfq, type StageId } from "./rfq-data";
import { TENANTS } from "./tenants";
import * as api from "./api";

type State = {
  rfqs: Rfq[];
  currentTenantId: string;
  loading: boolean;
  actionPending: string | null;
  movingId: string | null;
  error: string | null;
  setTenant: (id: string) => void;
  load: () => Promise<void>;
  moveRfq: (id: string, stage: StageId) => Promise<void>;
  parseRfq: (id: string) => Promise<void>;
  runDaytona: (id: string) => Promise<void>;
  findSimilarRfqs: (id: string) => Promise<void>;
  getVendorQuote: (id: string) => Promise<void>;
  finalize: (id: string) => Promise<void>;
  simulateIncoming: () => Promise<void>;
};

export const useRfqStore = create<State>()((set, get) => ({
  rfqs: [],
  currentTenantId: TENANTS[0].id,
  loading: false,
  actionPending: null,
  movingId: null,
  error: null,

  setTenant: (id) => {
    set({ currentTenantId: id, rfqs: [] });
    void get().load();
  },

  load: async () => {
    set({ loading: true, error: null });
    try {
      const cards = await api.fetchCards(get().currentTenantId);
      set({ rfqs: cards.map(mapCardToRfq), loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  moveRfq: async (id, stage) => {
    const prev = get().rfqs;
    // optimistic local move so the drag feels instant; the real response (which may have
    // run a Daytona sandbox / Neo4j lookup) replaces this once it lands.
    set({ rfqs: prev.map((r) => (r.id === id ? { ...r, stage } : r)), movingId: id, error: null });
    try {
      const card = await api.moveStage(get().currentTenantId, id, stage);
      const rfq = mapCardToRfq(card);
      set({ rfqs: get().rfqs.map((r) => (r.id === id ? rfq : r)), movingId: null });
    } catch (err) {
      set({ rfqs: prev, error: (err as Error).message, movingId: null });
    }
  },

  parseRfq: async (id) => {
    set({ actionPending: id, error: null });
    try {
      const card = await api.parseRfq(get().currentTenantId, id);
      const rfq = mapCardToRfq(card);
      set({ rfqs: get().rfqs.map((r) => (r.id === id ? rfq : r)), actionPending: null });
    } catch (err) {
      set({ error: (err as Error).message, actionPending: null });
    }
  },

  runDaytona: async (id) => {
    set({ actionPending: id, error: null });
    try {
      const card = await api.runDaytonaSandbox(get().currentTenantId, id);
      const rfq = mapCardToRfq(card);
      set({ rfqs: get().rfqs.map((r) => (r.id === id ? rfq : r)), actionPending: null });
    } catch (err) {
      set({ error: (err as Error).message, actionPending: null });
    }
  },

  findSimilarRfqs: async (id) => {
    set({ actionPending: id, error: null });
    try {
      const card = await api.findSimilarRfqs(get().currentTenantId, id);
      const rfq = mapCardToRfq(card);
      set({ rfqs: get().rfqs.map((r) => (r.id === id ? rfq : r)), actionPending: null });
    } catch (err) {
      set({ error: (err as Error).message, actionPending: null });
    }
  },

  getVendorQuote: async (id) => {
    set({ actionPending: id, error: null });
    try {
      const card = await api.getVendorQuote(get().currentTenantId, id);
      const rfq = mapCardToRfq(card);
      set({ rfqs: get().rfqs.map((r) => (r.id === id ? rfq : r)), actionPending: null });
    } catch (err) {
      set({ error: (err as Error).message, actionPending: null });
    }
  },

  finalize: async (id) => {
    set({ actionPending: id, error: null });
    try {
      const card = await api.finalizeQuote(get().currentTenantId, id);
      const rfq = mapCardToRfq(card);
      set({ rfqs: get().rfqs.map((r) => (r.id === id ? rfq : r)), actionPending: null });
    } catch (err) {
      set({ error: (err as Error).message, actionPending: null });
    }
  },

  simulateIncoming: async () => {
    set({ loading: true, error: null });
    try {
      await api.ingestNewRfq(get().currentTenantId, buildSyntheticRfqPayload());
      await get().load();
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
}));

const SIM_CUSTOMERS = ["Sable Robotics", "Union Forge Industries", "Kestrel Dynamics", "Vantage Fluid Systems"];
const SIM_CONTACTS = ["procurement", "sourcing", "buyer", "rfq"];
const SIM_PARTS = [
  { desc: "Stainless steel gearbox housing", note: "Wall thickness 4mm, IP67 rated" },
  { desc: "Anodized aluminum heat exchanger plate", note: "0.5mm fin spacing, brazed assembly" },
  { desc: "Composite drone airframe bracket", note: "Carbon fiber layup, drawing rev B" },
  { desc: "Precision ball screw assembly", note: "C5 accuracy grade, 25mm lead" },
];

function buildSyntheticRfqPayload(): api.NewRfqPayload {
  const customer = SIM_CUSTOMERS[Math.floor(Math.random() * SIM_CUSTOMERS.length)];
  const contact = SIM_CONTACTS[Math.floor(Math.random() * SIM_CONTACTS.length)];
  const part = SIM_PARTS[Math.floor(Math.random() * SIM_PARTS.length)];
  const quantity = [25, 50, 100, 250, 500][Math.floor(Math.random() * 5)];
  const domain = customer.toLowerCase().replace(/\s+/g, "");

  return {
    customer_name: customer,
    customer_email: `${contact}@${domain}.com`,
    email_subject: `RFQ: ${part.desc} x ${quantity}`,
    email_body: `Hi team,\n\nPlease find attached our RFQ for ${quantity} units of the ${part.desc}.\n${part.note}.\nLet us know pricing and lead time.\n\nThanks,\n${customer}`,
    pdf_url: `attachments/${domain}-rfq-${Date.now()}.pdf`,
  };
}
