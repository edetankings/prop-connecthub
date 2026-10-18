import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExperienceCarousel from "./ExperienceCarousel";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function open() { return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ExperienceCarousel /></MemoryRouter>); }
describe("image journey carousel", () => {
  it("keeps each image and text synchronized every five seconds, including while hovered", () => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", class { constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { this.notify = callback; } notify: (entries: { isIntersecting: boolean }[]) => void; observe() { this.notify([{ isIntersecting: true }]); } disconnect() {} });
    open();
    expect(screen.getByRole("heading", { name: "Search your way" })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4999); });
    expect(screen.getByRole("heading", { name: "Search your way" })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole("heading", { name: "Keep your favourites close" })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("region", { name: "Your property journey" }));
    expect(screen.queryByRole("button", { name: "Pause journey slideshow" })).not.toBeInTheDocument();
    for (const [title, image] of [["Start a conversation", "cinematic-3.jpg"], ["See it for yourself", "/images/categories/commercial.jpg"], ["Follow your enquiries", "/images/categories/developments.jpg"], ["Search your way", "/images/categories/houses.jpg"]]) {
      act(() => { vi.advanceTimersByTime(5000); });
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(document.querySelectorAll(".experience-images img.is-active")).toHaveLength(1);
      expect(document.querySelector(".experience-images img.is-active")?.getAttribute("src")).toContain(image);
    }
    fireEvent.click(screen.getByRole("button", { name: "Next property journey step" }));
    expect(screen.getByRole("link", { name: "Explore this step" })).toHaveAttribute("href", "/properties");
  });
  it("retains manual navigation without autoplay under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({ matches: true, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true }));
    open();
    expect(screen.queryByRole("button", { name: "Pause journey slideshow" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous property journey step" }));
    expect(screen.getByRole("heading", { name: "Follow your enquiries" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore this step" })).toHaveAttribute("href", "/dashboard");
  });
});
