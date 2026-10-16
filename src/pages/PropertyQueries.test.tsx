import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
const mocks = vi.hoisted(() => ({ result: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, in: () => query, order: mocks.result, maybeSingle: mocks.result };
  return query;
} } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/PropertyMapPreview", () => ({ default: () => null }));
import Properties from "./Properties";
import PropertyDetail from "./PropertyDetail";
function open(detail = false) {
  return render(<HelmetProvider><MemoryRouter initialEntries={[detail ? "/property/p1" : "/properties"]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/properties" element={<Properties />} /><Route path="/property/:id" element={<PropertyDetail />} />
  </Routes></MemoryRouter></HelmetProvider>);
}
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);
describe("real marketplace query states", () => {
  it("renders an empty state for a successful empty discovery query", async () => {
    mocks.result.mockResolvedValue({ data: [], error: null });
    open(); await screen.findByText("No properties yet. Check back soon.");
    expect(screen.queryByText("Unable to load properties.")).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/property/p1"]')).toBeNull();
  });
  it("distinguishes a failed discovery query from empty results and retries", async () => {
    mocks.result.mockResolvedValueOnce({ data: null, error: { message: "Denied" } }).mockResolvedValueOnce({ data: [], error: null });
    open(); await screen.findByText("Unable to load properties.");
    expect(screen.queryByText("No properties yet. Check back soon.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("No properties yet. Check back soon.");
  });
  it("never substitutes the p1 demo listing when the detail query returns no row", async () => {
    mocks.result.mockResolvedValue({ data: null, error: null });
    open(true); await screen.findByText("Property not found.");
    expect(screen.queryByRole("button", { name: /inspection/i })).not.toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
  it("shows a detail error and retry for thrown requests without rendering demo data", async () => {
    mocks.result.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ data: null, error: null });
    open(true); await screen.findByText("Unable to load property.");
    expect(screen.queryByText("Property not found.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Property not found.");
  });
  it("does not fabricate in-stock availability for a returned sold listing", async () => {
    mocks.result.mockResolvedValueOnce({ data: {
      id: "confirmed-record", title: "Synthetic sold property", price: 100, listing_type: "sale",
      status: "sold", agent_id: "owner", is_verified: false, images: [], videos: [], amenities: [],
    }, error: null }).mockResolvedValue({ data: null, error: null });
    open(true); await screen.findByRole("heading", { name: "Synthetic sold property" });
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      expect(JSON.parse(script!.textContent!).offers.availability).toBe("https://schema.org/SoldOut");
    });
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });
});
