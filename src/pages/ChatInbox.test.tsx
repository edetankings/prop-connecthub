import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
const state = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), membership: vi.fn(), fail: false, channel: { on: vi.fn(), subscribe: vi.fn() }, removeChannel: vi.fn() }));
const profile = { id: "synthetic-buyer" };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: state.from, rpc: state.rpc, channel: () => state.channel, removeChannel: state.removeChannel } }));
import ChatInbox from "./ChatInbox";
class Query {
  table: string; head = false;
  constructor(table: string) { this.table = table; }
  select(_columns: string, options?: { head?: boolean }) { this.head = options?.head === true; return this; }
  or(value: string) { state.membership(value); return this; } eq() { return this; } neq() { return this; } order() { return this; } limit() { return this; } maybeSingle() { return this; }
  then(resolve: (value: { data: unknown; error: object | null; count: number }) => unknown) {
    const data = this.table === "chat_threads" ? [{ id: "synthetic-thread", buyer_id: profile.id, agent_id: "synthetic-builder", property_id: "synthetic-property", last_message_at: "2026-01-01T12:00:00Z" }] : this.table === "properties" ? { title: "Synthetic Garden Home", property_code: "TEST-1" } : this.table === "public_profiles" ? { kyc_verified: true } : this.head ? null : { content: "Synthetic message" };
    return Promise.resolve({ data, error: state.fail ? { message: "Synthetic denial" } : null, count: 1 }).then(resolve);
  }
}
beforeEach(() => { vi.clearAllMocks(); state.fail = false; state.from.mockImplementation((table: string) => new Query(table)); state.rpc.mockResolvedValue({ data: [{ id: "synthetic-builder", full_name: "Synthetic Professional", profile_type: "builder" }], error: null }); state.channel.on.mockReturnValue(state.channel); state.channel.subscribe.mockReturnValue(state.channel); });
afterEach(cleanup);
function open() { render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ChatInbox /></MemoryRouter>); }
describe("shared role-aware inbox with mocked services only", () => {
  it("scopes conversations to membership, searches property titles and includes developers in professionals", async () => {
    open(); await screen.findByText("Synthetic Professional"); expect(state.membership).toHaveBeenCalledWith("buyer_id.eq.synthetic-buyer,agent_id.eq.synthetic-buyer");
    fireEvent.click(screen.getByRole("button", { name: "Professionals" })); fireEvent.change(screen.getByLabelText("Search conversations"), { target: { value: "garden" } }); expect(screen.getByText("Synthetic Professional")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buyers" })); expect(screen.getByText("No conversations found")).toBeInTheDocument();
  });
  it("reports denied conversation reads and supports retry without claiming empty success", async () => {
    state.fail = true; open(); await screen.findByRole("alert"); expect(screen.queryByText("No conversations found")).not.toBeInTheDocument(); state.fail = false; fireEvent.click(screen.getByRole("button", { name: "Retry conversations" })); await screen.findByText("Synthetic Professional");
  });
  it("cleans up its existing Realtime subscription on unmount without asserting live delivery", async () => {
    const result = render(<MemoryRouter><ChatInbox /></MemoryRouter>); await screen.findByText("Synthetic Professional"); result.unmount(); expect(state.removeChannel).toHaveBeenCalledWith(state.channel);
  });
});
