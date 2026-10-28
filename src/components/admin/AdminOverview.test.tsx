import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({ isAdmin: true, failed: "", rows: {} as Record<string, Row[]>, calls: [] as string[] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAdmin: state.isAdmin, profile: { full_name: "Test Administrator" }, user: { id: "test-admin" }, signOut: vi.fn() }) }));
vi.mock("@/hooks/useFinancialAvailability", () => ({ useFinancialAvailability: () => ({ enabled: false }) }));
vi.mock("./SubscriptionControl", () => ({ default: () => <p>Subscription requirement</p> }));
vi.mock("@/components/NotificationBell", () => ({ default: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  state.calls.push(table);
  let head = false; let max = Infinity;
  const conditions: [string, unknown][] = [];
  const q = {
    select: (_columns: string, options?: { head?: boolean }) => { head = !!options?.head; return q; },
    eq: (key: string, value: unknown) => { conditions.push([key, value]); return q; },
    in: () => q, order: () => q, limit: (value: number) => { max = value; return q; },
    then: (resolve: (value: { data: Row[] | null; error: unknown; count: number }) => unknown) => {
      const rows = (state.rows[table] || []).filter(row => conditions.every(([key, value]) => row[key] === value));
      return Promise.resolve({ data: head ? null : rows.slice(0, max), error: state.failed === table ? { message: "Denied" } : null, count: rows.length }).then(resolve);
    },
  }; return q;
} } }));
import OperationsOverview from "./OperationsOverview";
import AdminShell from "./AdminShell";

beforeEach(() => {
  state.isAdmin = true; state.failed = ""; state.calls = [];
  state.rows = {
    properties: Array.from({ length: 7 }, (_, i) => ({ id: `property-${i}`, title: `Test property ${i}`, status: "under_verification", created_at: `2026-10-${String(20 + i).padStart(2, "0")}T10:00:00Z`, city: "Lagos", property_code: `PROP-${i}` })),
    profiles: [{ user_id: "test-applicant", full_name: "Test Applicant", profile_type: "agent" }],
    kyc_verifications: [{ id: "kyc-1", user_id: "test-applicant", submitted_at: "2026-10-28T08:00:00Z", kyc_status: "pending" }],
    reservations: [], audit_logs: [], support_tickets: [],
  };
});
afterEach(cleanup);
const open = (element: React.ReactNode, path = "/admin") => render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{element}</MemoryRouter>);
it("combines real returned review types, paginates, searches and links to the correct record", async () => {
  open(<OperationsOverview />);
  expect(await screen.findByRole("link", { name: "Review Test Applicant" })).toHaveAttribute("href", "/admin?view=verification&user=test-applicant");
  fireEvent.click(screen.getByRole("button", { name: /Properties 7/ }));
  expect(screen.queryByRole("link", { name: "Review Test Applicant" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Review Test property 0" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next review page" }));
  expect(screen.getByRole("link", { name: "Review Test property 0" })).toHaveAttribute("href", "/admin?view=moderation&property=property-0");
  fireEvent.change(screen.getByRole("textbox", { name: "Search loaded review submissions" }), { target: { value: "PROP-6" } });
  expect(screen.getByRole("link", { name: "Review Test property 6" })).toBeInTheDocument();
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
});
it("keeps reviews and controls available when only the support request fails", async () => {
  state.failed = "support_tickets"; open(<OperationsOverview />);
  expect(await screen.findByText("Support requests unavailable")).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: "Review Test Applicant" })).toBeInTheDocument();
  expect(screen.getByText("Subscription requirement")).toBeInTheDocument();
  expect(screen.queryByText("Operations unavailable")).not.toBeInTheDocument();
  expect(within(screen.getByLabelText("Priority platform metrics")).getByText("7")).toBeInTheDocument();
});
it("does not query or expose operational data to a non-admin", () => {
  state.isAdmin = false; open(<OperationsOverview />);
  expect(state.calls).toHaveLength(0);
  expect(screen.queryByText("Reviews needing attention")).not.toBeInTheDocument();
});
function LocationProbe() { const location = useLocation(); return <output aria-label="Current route">{location.pathname + location.search}</output>; }
it("preserves active navigation for record deep links and jumps to sections by name", async () => {
  open(<AdminShell><LocationProbe /></AdminShell>, "/admin?view=verification&user=test-applicant");
  expect(screen.getByRole("link", { name: "KYC reviews" })).toHaveAttribute("aria-current", "page");
  fireEvent.change(screen.getByRole("combobox", { name: "Find an admin section" }), { target: { value: "Support inbox" } });
  fireEvent.submit(screen.getByRole("search"));
  await waitFor(() => expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin?view=support"));
  expect(screen.getByRole("link", { name: "Support inbox" })).toHaveAttribute("aria-current", "page");
});
