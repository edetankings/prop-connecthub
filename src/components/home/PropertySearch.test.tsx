import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import PropertySearch from "./PropertySearch";

function Destination() {
  const location = useLocation();
  return <output aria-label="Destination">{location.pathname + location.search}</output>;
}
afterEach(cleanup);
describe("homepage property discovery", () => {
  it("submits rent, trimmed location and a budget supported by the listings page", () => {
    render(<MemoryRouter><PropertySearch /><Destination /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Rent" }));
    fireEvent.change(screen.getByLabelText("Where would you like to live?"), { target: { value: "  Abuja  " } });
    fireEvent.change(screen.getByLabelText("Your budget"), { target: { value: "5m-20m" } });
    fireEvent.click(screen.getByRole("button", { name: "Find a property" }));
    expect(screen.getByLabelText("Destination")).toHaveTextContent("/properties?type=for_rent&q=Abuja&price=5m-20m");
  });
  it("submits land without invented location or budget defaults", () => {
    render(<MemoryRouter><PropertySearch /><Destination /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Land" }));
    fireEvent.click(screen.getByRole("button", { name: "Find a property" }));
    expect(screen.getByLabelText("Destination")).toHaveTextContent("/properties?type=land");
  });
  it("retains property kind and minimum bedrooms with the rent intent", () => {
    render(<MemoryRouter><PropertySearch /><Destination /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "Rent" }));
    fireEvent.change(screen.getByLabelText("Property type"), { target: { value: "apartment" } });
    fireEvent.change(screen.getByLabelText("Bedrooms"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Find a property" }));
    expect(screen.getByLabelText("Destination")).toHaveTextContent("/properties?type=for_rent&kind=apartment&beds=3");
    fireEvent.click(screen.getByRole("radio", { name: "Land" }));
    expect(screen.getByLabelText("Bedrooms")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Find a property" }));
    expect(screen.getByLabelText("Destination").textContent).toBe("/properties?type=land");
  });

});
