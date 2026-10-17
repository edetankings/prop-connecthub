import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
const mocks = vi.hoisted(() => ({
  rows: {} as Record<string, unknown[]>, failures: new Set<string>(), eq: vi.fn(), rpc: vi.fn(),
  profile: { id: "synthetic-profile", full_name: "Synthetic buyer", profile_type: "buyer", kyc_verified: false },
  user: { id: "synthetic-auth", email_confirmed_at: "2026-01-01" },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: mocks.profile, user: mocks.user }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const query = {
      select: () => query, in: () => query, order: () => query, limit: () => query, or: () => query, neq: () => query,
      maybeSingle: () => Promise.resolve({ data: mocks.rows[table]?.[0] || null, error: mocks.failures.has(table) ? { message: "Synthetic failure" } : null }),
      eq: (column: string, value: string) => { mocks.eq(table, column, value); return query; },
      then: (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve({ data: mocks.rows[table] || [], error: mocks.failures.has(table) ? { message: "Synthetic failure" } : null }).then(resolve, reject),
    }; return query;
  }, rpc: mocks.rpc,
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; }, removeChannel: vi.fn(),
} }));
import BuyerDashboard from "./BuyerDashboard";
import Inspections from "./Inspections";
import ChatInbox from "./ChatInbox";
function open(component: React.ReactNode, path = "/dashboard/buyer") {
  return render(<HelmetProvider><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/properties" element={<h1>Synthetic discovery destination</h1>} /><Route path="*" element={component} /></Routes></MemoryRouter></HelmetProvider>);
}
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); mocks.rows = {}; mocks.failures.clear(); mocks.rpc.mockResolvedValue({ data: [], error: null }); });
afterEach(cleanup);
describe("buyer workspace with synthetic SDK responses only", () => {
  it("renders honest empty records, real local saves and supported search navigation", async () => {
    open(<BuyerDashboard />);
    await screen.findByText("No inspection requests yet.");
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Trust 90|85%|Online|Verification completed/)).not.toBeInTheDocument();
    expect(mocks.eq).toHaveBeenCalledWith("reservations", "buyer_id", "synthetic-profile");
    expect(mocks.eq).toHaveBeenCalledWith("transactions", "buyer_id", "synthetic-auth");
    fireEvent.change(screen.getByLabelText("Search properties"), { target: { value: "Lagos" } });
    fireEvent.click(screen.getByRole("button", { name: "Find a place" }));
    await screen.findByRole("heading", { name: "Synthetic discovery destination" });
  });
  it("removes a browser-local saved property without a database mutation", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    localStorage.setItem("prop-connect-favorites", JSON.stringify([id]));
    mocks.rows.properties = [{ id, title: "Synthetic saved home", price: 100, property_type: "house", listing_type: "sale", status: "available", is_verified: true }];
    open(<BuyerDashboard />, "/dashboard/buyer?view=saved");
    await screen.findByRole("heading", { name: "Synthetic saved home" });
    expect(screen.getByText(/Saves do not sync/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Synthetic saved home from saved" }));
    await screen.findByText("No saved properties yet.");
    expect(JSON.parse(localStorage.getItem("prop-connect-favorites")!)).toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("distinguishes a failed personal query from an empty account and retries", async () => {
    mocks.failures.add("reservations");
    open(<BuyerDashboard />);
    await screen.findByText("Unable to load inspection requests.");
    expect(screen.queryByText("No inspection requests yet.")).not.toBeInTheDocument();
    mocks.failures.clear();
    fireEvent.click(screen.getByRole("button", { name: "Retry inspection requests" }));
    await screen.findByText("No inspection requests yet.");
  });
  it("displays real transaction status and dates with no financial controls", async () => {
    mocks.rows.transactions = [{ id: "synthetic-record", property_id: "synthetic-property", properties: { title: "Synthetic recorded home" }, amount: 150, payment_status: "under_review", created_at: "2026-01-01T10:00:00Z", released_at: null }];
    open(<BuyerDashboard />, "/dashboard/buyer?view=transactions");
    await screen.findByRole("heading", { name: "Synthetic recorded home" });
    expect(screen.getByText("under review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay|release|dispute|complete/i })).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("shows message previews without invented presence and supports inbox search", async () => {
    mocks.rows.chat_threads = [{ id: "synthetic-thread", buyer_id: "synthetic-profile", agent_id: "synthetic-agent", property_id: null, last_message_at: "2026-01-01T10:00:00Z" }];
    mocks.rows.messages = [{ content: "Synthetic received message", created_at: "2026-01-01T10:00:00Z" }];
    mocks.rpc.mockResolvedValue({ data: [{ id: "synthetic-agent", full_name: "Synthetic professional", profile_type: "agent" }], error: null });
    open(<ChatInbox />, "/messages");
    await screen.findByText("Synthetic professional");
    expect(screen.getByText("Synthetic received message")).toBeInTheDocument();
    expect(screen.queryByText("Online")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search conversations"), { target: { value: "not-a-match" } });
    expect(screen.getByText("No conversations found")).toBeInTheDocument();
    expect(screen.queryByText("Synthetic professional")).not.toBeInTheDocument();
  });
  it("shows inbox failures separately and supports retry", async () => {
    mocks.failures.add("chat_threads");
    open(<ChatInbox />, "/messages");
    await screen.findByText("Unable to load conversations.");
    expect(screen.queryByText("No conversations found")).not.toBeInTheDocument();
    mocks.failures.clear();
    fireEvent.click(screen.getByRole("button", { name: "Retry conversations" }));
    await screen.findByText("No conversations found");
  });
  it("keeps cancellation and acceptance on the existing buyer inspection RPC", async () => {
    mocks.rows.reservations = [{ id: "synthetic-inspection", property_id: "synthetic-property", agent_id: "synthetic-agent", inspection_status: "reschedule_proposed", viewing_date: "2099-01-01", proposed_date: "2099-01-02", proposed_time: "14:00", properties: { title: "Synthetic inspection home" } }];
    open(<Inspections mode="buyer" />);
    await screen.findByText("Synthetic inspection home");
    expect(screen.getByText(/Proposed: 2099-01-02/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept new time" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("buyer_respond_inspection", { _id: "synthetic-inspection", _action: "accept" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("buyer_respond_inspection", { _id: "synthetic-inspection", _action: "cancel" }));
    expect(mocks.eq).toHaveBeenCalledWith("reservations", "buyer_id", "synthetic-profile");
  });
});
