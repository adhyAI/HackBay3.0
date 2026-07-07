export type Tenant = {
  id: string;
  name: string;
  initials: string;
  color: string;
  industry: string;
};

export const TENANTS: Tenant[] = [
  { id: "9e7bd1b2-61b5-43f7-9679-8ac8339d0981", name: "Alpha Tech", initials: "AT", color: "#f97316", industry: "Precision electronics" },
  { id: "272bbe54-e6c2-4653-ab3c-94fa1d60d1c0", name: "Beta Aero", initials: "BA", color: "#0ea5e9", industry: "Aerospace components" },
];

export const CURRENT_USER = {
  name: "Priya Menon",
  email: "priya@quotsy.io",
  role: "Sales Engineer",
};
