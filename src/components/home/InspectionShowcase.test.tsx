import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DBProperty } from "@/components/DBPropertyCard";
const remote = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: remote.from, rpc: remote.rpc, functions: { invoke: remote.invoke } } }));
import InspectionShowcase from "./InspectionShowcase";
const listing: DBProperty = { id: "synthetic-public-property", title: "Synthetic available home", price: 1234567, property_type: "house", status: "available", listing_type: "sale", image_url: "/synthetic-exterior.jpg", images: ["/synthetic-exterior.jpg", "/synthetic-interior.jpg"], city: "Lagos", state: "Lagos", address: null, bedrooms: 3, bathrooms: 2, sqft: 1200, agent_id: "synthetic-profile", description: "Synthetic publicly displayed description.", is_verified: true };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });
function open(listings: DBProperty[] = []) { return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><InspectionShowcase listings={listings} /></MemoryRouter>); }
describe("isolated cinematic inspection demonstration", () => {
  it("provides all six scenes and an always-functional marketplace CTA without presentation labels", () => {
    open(); expect(document.querySelectorAll('[data-home-section="final-cta"]')).toHaveLength(1); expect(document.querySelectorAll("[data-phone-scene]")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "Explore Properties" })).toHaveAttribute("href", "/properties");
    expect(screen.queryByText(/Product demonstration|Demo viewer|Demo request submitted|Demonstration only/)).not.toBeInTheDocument();
  });
  it("plays as a presentation without visible animation controls or remote operations", () => {
    open();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelector(".showcase-controls")).toBeNull();
    expect(remote.from).not.toHaveBeenCalled(); expect(remote.rpc).not.toHaveBeenCalled(); expect(remote.invoke).not.toHaveBeenCalled();
    expect(document.querySelector(".showcase-device")).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelectorAll(".showcase-device form, .showcase-device input, .showcase-device button, .showcase-device a, .showcase-device select")).toHaveLength(0);
  });
  it("uses supplied public listing content without inventing pricing or available appointment slots", () => {
    open([listing]); expect(screen.getAllByText("₦1,234,567").length).toBeGreaterThan(0); expect(screen.getAllByText("Synthetic available home").length).toBeGreaterThan(0);
    expect(screen.getByText("Inspection request sent")).toBeInTheDocument();
    expect(screen.getByText(/must respond before a viewing is confirmed/)).toBeInTheDocument();
  });
  it("advances the real local timeline, pauses offscreen and cleans up without replaying on re-entry", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({ matches: query === "(prefers-reduced-motion: no-preference)", media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true }));
    let callbacks: ScrollTrigger.Vars = {};
    const kill = vi.fn();
    const trigger = { kill } as unknown as ReturnType<typeof ScrollTrigger.create>;
    vi.spyOn(ScrollTrigger, "create").mockImplementation(vars => { callbacks = vars; return trigger; });
    const timelineSpy = vi.spyOn(gsap, "timeline");
    const view = open();
    const sequence = timelineSpy.mock.results[0].value as gsap.core.Timeline;
    act(() => { callbacks.onEnter?.(trigger); });
    expect(sequence.paused()).toBe(false);
    act(() => { sequence.time(17.8, false); });
    expect(document.querySelector(".showcase-stage")).toHaveAttribute("data-current-scene", "4");
    act(() => { callbacks.onLeave?.(trigger); }); expect(sequence.paused()).toBe(true);
    act(() => { callbacks.onEnterBack?.(trigger); }); expect(sequence.paused()).toBe(false);
    act(() => { sequence.totalProgress(1, false); });
    expect(document.querySelector(".showcase-stage")).toHaveAttribute("data-current-scene", "5");
    act(() => { callbacks.onLeave?.(trigger); callbacks.onEnterBack?.(trigger); });
    expect(sequence.progress()).toBe(1); expect(sequence.paused()).toBe(true);
    expect(remote.from).not.toHaveBeenCalled(); expect(remote.rpc).not.toHaveBeenCalled();
    view.unmount(); expect(kill).toHaveBeenCalledTimes(1);
  });
  it("shows a static final scene without controls when reduced motion is requested", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({ matches: query === "(prefers-reduced-motion: reduce)", media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true }));
    open();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelector(".showcase-stage")).toHaveAttribute("data-current-scene", "5");
  });
});
