import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
const state = vi.hoisted(() => ({
  auth: { isAdmin: true, user: { id: "synthetic-admin-auth" } },
  fail: false, rejectUpdate: false, stepFixture: false, warning: vi.fn(), success: vi.fn(), from: vi.fn(), update: vi.fn(), rpc: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: state.success, warning: state.warning, error: vi.fn(), info: vi.fn() } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@/hooks/useFinancialAvailability", () => ({ useFinancialAvailability: () => ({ enabled: false, unavailableMessage: "Financial operations remain locked." }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/NotificationBell", () => ({ default: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/components/ReferralTree", () => ({ default: () => null }));
vi.mock("@/components/SignedBucketAsset", () => ({ SignedBucketAsset: () => <span>Private asset uses existing signed access</span> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: state.from, rpc: state.rpc } }));
vi.mock("./SubscriptionControl", () => ({ default: () => null }));
import OperationsOverview from "./OperationsOverview";
import UserDirectory from "./UserDirectory";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminAudit from "@/pages/AdminAudit";
import AdminDisputes from "@/pages/AdminDisputes";
import AdminPropertyMonitoring from "@/pages/AdminPropertyMonitoring";
import WorkspaceShell from "@/components/WorkspaceShell";
const profile = { id: "synthetic-profile", user_id: "synthetic-auth", full_name: "Synthetic Agent", location: "Lagos", profile_type: "agent", kyc_verified: false, is_visible: true, last_login_at: null, trust_score: 20, created_at: "2026-01-01T00:00:00Z" } as Tables<"profiles">;
class Query {
  table: string; mutation = false;
  constructor(table: string) { this.table = table; }
  select() { return this; } order() { return this; } eq() { return this; } in() { return this; } limit() { return this; } maybeSingle() { return this; }
  insert() { return Promise.reject(new Error("Synthetic notification transport failure")); }
  update(payload: unknown) { this.mutation = true; state.update(this.table, payload); return this; }
  then(resolve: (result: { data: unknown; error: object | null; count: number }) => unknown) {
    const data = this.mutation ? [{ id: "synthetic-property" }] : this.table === "verification_steps" && state.stepFixture ? [{ id: "synthetic-step", user_id: profile.user_id, step_name: "identity", status: "pending", updated_at: "2026-01-01T00:00:00Z" }] : this.table === "profiles" ? [profile] : this.table === "properties" ? [{ id: "synthetic-property", title: "Synthetic review property", status: "under_verification", agent_id: profile.id, created_at: "2026-01-01T00:00:00Z", price: 100, images: [] }] : [];
    return Promise.resolve({ data, error: state.fail || this.mutation && state.rejectUpdate ? { message: "Synthetic denial" } : null, count: 0 }).then(resolve);
  }
}
beforeEach(() => { vi.clearAllMocks(); state.auth.isAdmin = true; state.fail = false; state.rejectUpdate = false; state.stepFixture = false; state.from.mockImplementation((table: string) => new Query(table)); });
afterEach(cleanup);
const open = (element: React.ReactNode, path = "/admin") => render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{element}</MemoryRouter>);
describe("administrator operations using mocked services only", () => {
  it("does not query or reveal an operations summary to a non-admin", () => {
    state.auth.isAdmin = false; open(<OperationsOverview />); expect(state.from).not.toHaveBeenCalled(); expect(screen.queryByLabelText("Authorized platform summary")).not.toBeInTheDocument();
  });
  it("shows genuine zero counts without invented revenue or settlement controls", async () => {
    open(<OperationsOverview />);
    await waitFor(() => expect(within(screen.getByLabelText("Priority platform metrics")).getAllByText("0")).toHaveLength(4));
    expect(within(screen.getByLabelText("Priority platform metrics")).getAllByText("0")).toHaveLength(4); expect(screen.queryByText("Revenue Overview")).not.toBeInTheDocument(); expect(state.rpc).not.toHaveBeenCalled();
  });
  it("shows a summary failure instead of false zeros and permits retry", async () => {
    state.fail = true; open(<OperationsOverview />); await screen.findByText("Summary unavailable"); expect(screen.queryByText("0")).not.toBeInTheDocument(); state.fail = false; fireEvent.click(screen.getByRole("button", { name: "Retry summary" })); await screen.findAllByText("View records");
  });
  it("filters profiles, displays separately assigned roles and opens a read-only detail dialog", async () => {
    const props = { profiles: [profile], roles: [{ user_id: profile.user_id, role: "admin" }], onReview: vi.fn(), onVisibility: vi.fn(), onChat: vi.fn() };
    open(<UserDirectory {...props} />); expect(screen.getByText("admin")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Profile category"), { target: { value: "buyer" } }); expect(screen.getByText("No profiles match")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Profile category"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Search profiles"), { target: { value: "lagos" } });
    fireEvent.click(screen.getByRole("button", { name: "Profile details" })); const dialog = screen.getByRole("dialog"); expect(within(dialog).getByText("Not verified")).toBeInTheDocument(); expect(state.update).not.toHaveBeenCalled(); expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
  it("requires explicit confirmation before existing property moderation and exposes returned denial", async () => {
    state.rejectUpdate = true; open(<AdminDashboard />, "/admin?view=moderation");
    await screen.findByText("Synthetic review property");
    const approve = screen.getByRole("button", { name: "Approve", hidden: true });
    expect(approve).toBeVisible(); fireEvent.click(approve);
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toBeVisible(); expect(state.update).not.toHaveBeenCalled();
    const confirm = within(dialog).getByRole("button", { name: "Confirm decision", hidden: true });
    expect(confirm).toBeVisible(); fireEvent.click(confirm);
    expect(await within(dialog).findByRole("alert", { hidden: true })).toBeVisible();
    expect(state.update).toHaveBeenCalledWith("properties", { status: "available", is_verified: true }); expect(dialog).toBeInTheDocument(); expect(state.rpc).not.toHaveBeenCalled();
  });
  it("offers an admin navigation drawer with no payment or role-assignment actions", async () => {
    open(<WorkspaceShell role="admin"><h1>Synthetic admin workspace</h1></WorkspaceShell>);
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/admin?view=users");
    expect(screen.queryByRole("link", { name: "Withdrawals" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open admin navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Admin operations" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Properties" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("switches property review filters without writing data or using a global window filter", async () => {
    open(<AdminDashboard />, "/admin?view=moderation"); await screen.findByText("Synthetic review property");
    fireEvent.click(screen.getByRole("button", { name: /Approved$/ })); expect(screen.getByText("No properties in this category")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Pending$/ })); expect(screen.getByText("Synthetic review property")).toBeInTheDocument(); expect(state.update).not.toHaveBeenCalled();
  });
  it.each([
    ["audit", AdminAudit], ["disputes", AdminDisputes], ["property monitoring", AdminPropertyMonitoring],
  ] as const)("distinguishes a denied %s request from an empty result", async (_label, Component) => {
    state.fail = true; open(<Component />); await screen.findByRole("alert");
  });
  it("keeps an acknowledged step review successful when only its notification transport fails", async () => {
    state.stepFixture = true; open(<AdminDashboard />, "/admin?view=verification");
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" })); fireEvent.click(screen.getByRole("button", { name: "Confirm decision" }));
    await waitFor(() => expect(state.warning).toHaveBeenCalledWith("The review was saved, but its notification could not be confirmed."));
    expect(state.success).toHaveBeenCalledWith("Review saved"); expect(state.update).toHaveBeenCalledWith("verification_steps", { status: "approved" });
  });
  it("loads only the chosen admin section and preserves the section URL", async () => {
    state.from.mockImplementation((table: string) => {
      if (["transactions", "company_wallet", "support_tickets"].includes(table)) throw new Error("Unrelated service unavailable");
      return new Query(table);
    });
    open(<AdminDashboard />, "/admin?view=users");
    expect(await screen.findByRole("heading", { name: "User directory", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText("Synthetic Agent")).toBeInTheDocument();
    expect(state.from).not.toHaveBeenCalledWith("transactions");
    expect(state.from).not.toHaveBeenCalledWith("support_tickets");
    expect(screen.queryByText("Operations unavailable")).not.toBeInTheDocument();
  });
  it("shows a failed operations request instead of an empty administrator table", async () => {
    state.fail = true; open(<AdminDashboard />, "/admin?view=users"); await screen.findByRole("alert"); expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
