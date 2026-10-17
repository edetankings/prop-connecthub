import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
const mocks = vi.hoisted(() => ({ insert: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(), user: { id: "test-auth" }, profile: { id: "test-profile", full_name: "Synthetic buyer" } }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error, warning: mocks.warning } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, profile: mocks.profile }) }));
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/PropertyMapPreview", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const query = {
    select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => query,
    maybeSingle: () => Promise.resolve({ data: table === "properties" ? {
      id: "test-property", title: "Synthetic inspection property", agent_id: "test-agent",
      price: 100, property_type: "house", status: "available", listing_type: "sale", images: [],
    } : table === "chat_threads" ? { id: "existing-test-thread" } : null, error: null }),
    insert: (payload: unknown) => mocks.insert(table, payload),
  }; return query;
} } }));
import PropertyDetail from "./PropertyDetail";
beforeEach(() => { vi.clearAllMocks(); mocks.insert.mockResolvedValue({ error: null }); });
afterEach(cleanup);
async function openForm() {
  render(<HelmetProvider><MemoryRouter initialEntries={["/property/test-property"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/property/:id" element={<PropertyDetail />} /></Routes></MemoryRouter></HelmetProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Book Inspection" }));
  fireEvent.change(screen.getByLabelText("Preferred Date *"), { target: { value: "2099-12-15" } });
  fireEvent.change(screen.getByLabelText("Preferred Time"), { target: { value: "14:30" } });
}
describe("inspection requests with mocked services only", () => {
  it("retains the existing IDs and preferred date/time contract and reports a request", async () => {
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Request Inspection" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Inspection request sent to the agent."));
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith("reservations", {
      property_id: "test-property", buyer_id: "test-profile", agent_id: "test-agent",
      buyer_name: "Synthetic buyer", viewing_date: "2099-12-15", inspection_time: "14:30", message: null, notes: null,
    });
    expect(screen.getByText("Inspection Requested")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("keeps the form retryable after transport failure and prevents duplicate pending submissions", async () => {
    mocks.insert.mockRejectedValueOnce(new Error("Synthetic network failure"));
    await openForm();
    fireEvent.click(screen.getByRole("button", { name: "Request Inspection" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Failed to send inspection request. Please try again."));
    expect(mocks.success).not.toHaveBeenCalled();
    const submit = screen.getByRole("button", { name: "Request Inspection" });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1));
    expect(mocks.insert).toHaveBeenCalledTimes(2);
  });
});
