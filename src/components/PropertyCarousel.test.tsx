import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PropertyCarousel from "./PropertyCarousel";
import type { DBProperty } from "./DBPropertyCard";
afterEach(() => { cleanup(); localStorage.clear(); });
describe("marketplace carousel uses actual property fields", () => {
  it("shows a rental with available status as rent, uses a neutral missing-image placeholder and keeps the real ID", () => {
    const property: DBProperty = {
      id: "confirmed-record", title: "Synthetic rental", listing_type: "rental", status: "available", price: 100,
      property_type: "house", image_url: null, images: [], city: null, state: null, address: null,
      bedrooms: null, bathrooms: null, sqft: null, agent_id: "owner", description: null, is_verified: false,
    };
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PropertyCarousel properties={[property]} /></MemoryRouter>);
    expect(screen.getByText("For Rent")).toBeInTheDocument();
    expect(screen.queryByText("For Sale")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    expect(screen.getByAltText("Synthetic rental")).toHaveAttribute("src", "/placeholder.svg");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/property/confirmed-record");
  });
  it("preserves saved IDs when different cards are saved and unsaved", () => {
    const base: DBProperty = { id: "one", title: "First test listing", listing_type: "sale", status: "available", price: 100,
      property_type: "house", image_url: null, images: [], city: "Lagos", state: null, address: null,
      bedrooms: 3, bathrooms: 2, sqft: 1200, agent_id: "owner", description: null, is_verified: false };
    render(<MemoryRouter><PropertyCarousel properties={[base, { ...base, id: "two", title: "Second test listing" }]} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Save First test listing" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Second test listing" }));
    expect(JSON.parse(localStorage.getItem("prop-connect-favorites")!)).toEqual(["one", "two"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove First test listing from saved" }));
    expect(JSON.parse(localStorage.getItem("prop-connect-favorites")!)).toEqual(["two"]);
    expect(screen.getByRole("button", { name: "Remove Second test listing from saved" })).toHaveAttribute("aria-pressed", "true");
  });
  it("handles malformed saved data and a failed real image without losing listing information", () => {
    localStorage.setItem("prop-connect-favorites", '{"invalid":true}');
    const property: DBProperty = { id: "large", title: "A long property title for responsive layouts", listing_type: "sale", status: "available", price: 12500000000,
      property_type: "house", image_url: "/missing-listing.jpg", images: [], city: "Port Harcourt", state: "Rivers", address: null,
      bedrooms: 5, bathrooms: 4, sqft: 2400, agent_id: "owner", description: null, is_verified: true };
    render(<MemoryRouter><PropertyCarousel properties={[property]} /></MemoryRouter>);
    fireEvent.error(screen.getByAltText(property.title));
    expect(screen.getByAltText(property.title)).toHaveAttribute("src", "/placeholder.svg");
    expect(screen.getByText(/12,500,000,000/)).toBeInTheDocument();
    expect(screen.getByText(property.title)).toBeInTheDocument();
    expect(screen.getByText("2,400 sqft")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `Save ${property.title}` }));
    expect(JSON.parse(localStorage.getItem("prop-connect-favorites")!)).toEqual(["large"]);
  });

});
