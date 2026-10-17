import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { full_name: "Synthetic buyer" }, user: { email: "synthetic@example.test" }, signOut: mocks.signOut }) }));
vi.mock("@/components/NotificationBell", () => ({ default: () => <button>Mocked notifications</button> }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => <button>Mocked theme</button> }));
import BuyerWorkspaceShell from "./BuyerWorkspaceShell";
beforeEach(() => { vi.clearAllMocks(); mocks.signOut.mockResolvedValue(undefined); });
afterEach(cleanup);
function open(path = "/dashboard/buyer?view=saved") {
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/login" element={<h1>Synthetic login destination</h1>} /><Route path="*" element={<BuyerWorkspaceShell><h1>Synthetic workspace</h1></BuyerWorkspaceShell>} /></Routes></MemoryRouter>);
}
describe("buyer navigation behavior without live authentication", () => {
  it("marks saved and conversation routes correctly and closes its accessible drawer", async () => {
    open();
    expect(screen.getByRole("link", { name: "Saved properties" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Open buyer navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Buyer workspace" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Inspections" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Inspections" })).toHaveAttribute("aria-current", "page");
  });
  it("keeps Messages active when a property conversation is open", () => {
    open("/chat/synthetic-thread");
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("aria-current", "page");
  });
  it("does not claim logout or redirect on failure and permits retry", async () => {
    mocks.signOut.mockRejectedValueOnce(new Error("Synthetic failure"));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("Synthetic login destination")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText("Synthetic login destination");
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });
});
