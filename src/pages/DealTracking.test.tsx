import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
const state = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), eq: vi.fn(), fail: false, auth: { user: { id: "synthetic-buyer-auth" }, isAdmin: false } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: state.from, rpc: state.rpc } }));
import DealRoom from "./DealRoom";
import DealsList from "./DealsList";
import Inspections from "./Inspections";
import { ChatPropertyCard } from "@/components/chat/ChatPropertyCard";
const deal = { id: "synthetic-deal", deal_number: 7, property_id: "synthetic-property", buyer_id: "synthetic-buyer-auth", agent_user_id: "synthetic-agent-auth", created_at: "2026-01-01T12:00:00Z", stage: "payment_pending", transaction_id: null, properties: { id: "synthetic-property", title: "Synthetic Home", price: 100, city: "Lagos", state: "Lagos" } };
class Query {
  table: string; single = false;
  constructor(table: string) { this.table = table; }
  select() { return this; } order() { return this; } eq(column: string, value: string) { state.eq(this.table, column, value); return this; } maybeSingle() { this.single = true; return this; }
  then(resolve: (result: { data: unknown; error: object | null }) => unknown) {
    return Promise.resolve({ data: this.table === "deal_requests" ? this.single ? deal : [deal] : this.table === "reservations" ? [{ id: "synthetic-inspection", property_id: deal.property_id, inspection_status: "requested", viewing_date: "2026-01-05", inspection_time: "10:00", buyer_name: "Synthetic Buyer", properties: { title: "Synthetic inspection property" } }] : [], error: state.fail ? { message: "Synthetic denied read" } : null }).then(resolve);
  }
}
beforeEach(() => { vi.clearAllMocks(); state.fail = false; state.auth.isAdmin = false; state.from.mockImplementation((table: string) => new Query(table)); state.rpc.mockResolvedValue({ data: [{ user_id: deal.buyer_id, full_name: "Synthetic Buyer" }], error: null }); });
afterEach(cleanup);
const open = (element: React.ReactNode, path = "/deal/synthetic-deal") => render(<HelmetProvider><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="*" element={element} /><Route path="/deal/:id" element={element} /></Routes></MemoryRouter></HelmetProvider>);
describe("read-only deal tracking with mocked service responses", () => {
  it("renders recorded stage without payment or stage-change controls or invented milestones", async () => {
    open(<DealRoom />); await screen.findByText("Synthetic Home"); expect(screen.getByText("No linked transaction record.")).toBeInTheDocument(); expect(screen.getByText(/No recorded activity/)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: /payment|complete|forward/i })).not.toBeInTheDocument(); expect(state.rpc).toHaveBeenCalledTimes(1); expect(state.rpc).toHaveBeenCalledWith("get_deal_participants", { _deal_id: deal.id });
  });
  it("does not turn a failed deal read into a not-found or successful empty state", async () => {
    state.fail = true; open(<DealRoom />); await screen.findByRole("alert"); expect(screen.queryByText("Deal unavailable")).not.toBeInTheDocument(); state.fail = false; fireEvent.click(screen.getByRole("button", { name: "Retry deal details" })); await screen.findByText("Synthetic Home");
  });
  it("retains the buyer Auth UUID filter and does not query admin records for a non-admin", async () => {
    const result = open(<DealsList mode="buyer" />, "/records"); await screen.findByText("Synthetic Home"); expect(state.eq).toHaveBeenCalledWith("deal_requests", "buyer_id", state.auth.user.id); result.unmount(); state.from.mockClear(); open(<DealsList mode="admin" />, "/records"); expect(state.from).not.toHaveBeenCalled();
  });
  it("keeps administrator inspections read-only while showing the actual requested schedule", async () => {
    state.auth.isAdmin = true; open(<Inspections mode="admin" />, "/inspections"); await screen.findByText("Synthetic inspection property"); expect(screen.getByText(/Requested: 2026-01-05 10:00/)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument(); expect(state.rpc).not.toHaveBeenCalled();
  });
  it("keeps the shared chat financial control disabled", () => {
    const reserve = vi.fn(); open(<ChatPropertyCard property={{ id: "synthetic-property", title: "Synthetic Home" }} isBuyer onReserve={reserve} />); const locked = screen.getByRole("button", { name: "Financial operations locked" }); expect(locked).toBeDisabled(); fireEvent.click(locked); expect(state.rpc).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
  });
});
