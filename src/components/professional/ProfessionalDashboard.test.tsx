import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, unknown>[]>, eq: vi.fn(), remove: vi.fn(), rpc: vi.fn(),
  profile: { id: "synthetic-professional", full_name: "Synthetic professional", profile_type: "agent", kyc_verified: false },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: mocks.profile, isAdmin: false }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const filters: Record<string, string> = {};
    const result = () => ({ data: (mocks.rows[table] || []).filter(row => Object.entries(filters).every(([key,value]) => row[key] === value)), error: null });
    const query = {
      select: () => query, order: () => query,
      eq: (key: string, value: string) => { filters[key] = value; mocks.eq(table, key, value); return query; },
      delete: () => { mocks.remove(); return query; },
      maybeSingle: async () => ({ data: result().data[0] || null, error: null }),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(result()).then(resolve,reject),
    }; return query;
  }, rpc: mocks.rpc,
} }));
import ProfessionalDashboard from "./ProfessionalDashboard";
beforeEach(() => { vi.clearAllMocks(); mocks.rows = {}; mocks.profile.profile_type = "agent"; mocks.rpc.mockResolvedValue({ data: [], error: null }); });
afterEach(cleanup);
function open(role: "agent" | "builder" = "agent", view = "overview") { render(<MemoryRouter initialEntries={[`/dashboard/${role}?view=${view}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ProfessionalDashboard role={role} /></MemoryRouter>); }
const property = (id: string, status: string, owner = "synthetic-professional") => ({ id, title: `Synthetic ${id}`, status, agent_id: owner, price: 100, property_type: "house", is_verified: status === "available", listing_type: "sale" });
describe("professional workspace uses synthetic owned records only", () => {
  it("shows honest empty states and uses the profile UUID for owned reads", async () => {
    open();
    await screen.findByText("No property listings yet.");
    expect(screen.getByText("No inquiries yet.")).toBeInTheDocument();
    expect(mocks.eq).toHaveBeenCalledWith("properties", "agent_id", "synthetic-professional");
    expect(mocks.eq).toHaveBeenCalledWith("reservations", "agent_id", "synthetic-professional");
    expect(screen.queryByText(/85%|Total revenue|140 leads/i)).not.toBeInTheDocument();
  });
  it("filters listing records and excludes other owners", async () => {
    mocks.rows.properties = [property("draft", "draft"), property("approved", "available"), property("someone-else", "draft", "other-owner")];
    open("agent", "listings");
    await screen.findByRole("heading", { name: "Synthetic draft" });
    expect(screen.queryByText("Synthetic someone-else")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Listing status"), { target: { value: "draft" } });
    expect(screen.queryByText("Synthetic approved")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search your listings"), { target: { value: "no-match" } });
    expect(screen.getByText("No listings match your filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "Synthetic approved" })).toBeInTheDocument();
  });
  it("offers only draft deletion and scopes the mutation to owner and draft status", async () => {
    mocks.rows.properties = [property("draft", "draft"), property("locked", "sold")];
    open("agent", "listings");
    const lockedTitle = await screen.findByRole("heading", { name: "Synthetic locked" });
    const lockedCard = within(lockedTitle.closest("article")!);
    expect(lockedCard.queryByRole("link", { name: "Edit listing" })).not.toBeInTheDocument();
    expect(lockedCard.queryByRole("button", { name: "Delete draft" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this draft?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete draft" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    expect(mocks.eq).toHaveBeenCalledWith("properties", "status", "draft");
    expect(mocks.eq).toHaveBeenCalledWith("properties", "id", "draft");
    expect(mocks.eq).toHaveBeenCalledWith("properties", "agent_id", "synthetic-professional");
  });
  it("presents builders as property professionals without manufacturing development tools", async () => {
    mocks.profile.profile_type = "builder";
    open("builder", "listings");
    await screen.findByText("No property listings yet.");
    expect(screen.getByText(/Construction progress, phases and multi-unit inventory are not tracked/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New development|Construction progress/ })).not.toBeInTheDocument();
  });
  it("renders permitted inquiry participants and actual message previews", async () => {
    mocks.rows.chat_threads = [{ id: "thread", buyer_id: "synthetic-buyer", agent_id: "synthetic-professional", properties: { title: "Synthetic inquiry property" }, messages: [{ content: "Synthetic buyer question", created_at: "2026-01-01T10:00:00Z", sender_id: "synthetic-buyer", seen: false }], created_at: "2026-01-01T09:00:00Z" }];
    mocks.rpc.mockResolvedValue({ data: [{ id: "synthetic-buyer", full_name: "Synthetic buyer" }], error: null });
    open("agent", "inquiries");
    await screen.findByText("Synthetic buyer question");
    expect(screen.getByText("1 unread")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Synthetic buyer/ })).toHaveAttribute("href", "/chat/thread");
    expect(screen.queryByText("Closed Won")).not.toBeInTheDocument();
  });
  it("does not expose a professional action panel to an incompatible profile", async () => {
    mocks.profile.profile_type = "buyer";
    await act(async () => { open(); });
    expect(screen.getByText("Professional workspace unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add property" })).not.toBeInTheDocument();
    expect(mocks.eq).not.toHaveBeenCalled();
  });
});
