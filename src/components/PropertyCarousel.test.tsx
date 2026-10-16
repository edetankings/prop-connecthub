import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PropertyCarousel from "./PropertyCarousel";
import type { DBProperty } from "./DBPropertyCard";
afterEach(cleanup);
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
});
