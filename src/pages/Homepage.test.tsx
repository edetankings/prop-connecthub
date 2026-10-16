import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { PropsWithChildren } from "react";
import type { DBProperty } from "@/components/DBPropertyCard";

const mocks = vi.hoisted(() => ({ properties: vi.fn(), profiles: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const query = { select: () => query, eq: (...args: unknown[]) => { mocks.eq(table, ...args); return query; },
    in: () => query, order: () => query, limit: () => table === "properties" ? mocks.properties() : mocks.profiles() };
  return query;
} } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, profile: null, isAdmin: false }) }));
vi.mock("@/components/home/HomeMotion", () => ({ default: ({ children }: PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/PropertyCarousel", () => ({ default: ({ properties }: { properties: DBProperty[] }) => <div>{properties.map(p => <a key={p.id} href={`/property/${p.id}`}>{p.title}</a>)}</div> }));
import Homepage from "./Index";

function open() {
  return render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Homepage /></MemoryRouter></HelmetProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.properties.mockResolvedValue({ data: [], error: null });
  mocks.profiles.mockResolvedValue({ data: [], error: null });
});
afterEach(cleanup);

describe("complete homepage content and data boundaries (mocked backend)", () => {
  it("renders all 14 sections with honest empty states and working destination URLs", async () => {
    open();
    await screen.findByText("A little room for possibility.");
    await screen.findByText("Great connections are on their way.");
    expect([...document.querySelectorAll("[data-home-section]")].map(node => node.getAttribute("data-home-section"))).toEqual([
      "navigation", "hero", "categories", "featured", "locations", "journey", "trust", "professionals", "developments", "experience", "partnership", "resources", "final-cta", "footer",
    ]);
    const locations = document.querySelector('[data-home-section="locations"]')! as HTMLElement;
    expect(within(locations).getByRole("link", { name: /Lagos/ })).toHaveAttribute("href", "/properties?q=Lagos");
    const categories = document.querySelector('[data-home-section="categories"]')! as HTMLElement;
    expect(within(categories).getByRole("link", { name: /New Developments/ })).toHaveAttribute("href", "/properties?type=estate");
    expect(document.querySelectorAll('a[href="/property/fake"]')).toHaveLength(0);
    expect(mocks.eq).toHaveBeenCalledWith("public_profiles", "kyc_verified", true);
    expect(mocks.eq).toHaveBeenCalledWith("public_profiles", "profile_type", "agent");
    expect(screen.queryByText(/guaranteed safe/i)).not.toBeInTheDocument();
  });
  it("renders only returned estate records in the developments collection", async () => {
    mocks.properties.mockResolvedValue({ data: [
      { id: "estate-row", title: "Returned estate listing", property_type: "estate", image_url: "/estate-image.jpg" },
      { id: "house-row", title: "Returned house listing", property_type: "house" },
    ], error: null });
    open();
    const developments = document.querySelector('[data-home-section="developments"]')! as HTMLElement;
    await within(developments).findByText("Returned estate listing");
    expect(within(developments).queryByText("Returned house listing")).not.toBeInTheDocument();
    expect(within(developments).getByRole("link", { name: "Returned estate listing" })).toHaveAttribute("href", "/property/estate-row");
    expect(within(developments).getByAltText("Returned estate listing")).toHaveAttribute("src", "/estate-image.jpg");
    fireEvent.error(within(developments).getByAltText("Returned estate listing"));
    expect(within(developments).getByAltText("Returned estate listing")).toHaveAttribute("src", "/placeholder.svg");
  });
  it("shows request failure separately from no listings and supports retry", async () => {
    mocks.properties.mockResolvedValueOnce({ data: null, error: { message: "Unavailable" } }).mockResolvedValue({ data: [], error: null });
    open();
    await screen.findByText("We couldn't load the listings.");
    expect(screen.queryByText("A little room for possibility.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("A little room for possibility.");
  });
});
