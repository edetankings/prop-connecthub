import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
const remote = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: remote }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user:null,profile:null,isAdmin:false,signOut:vi.fn() }) }));
import AgentProfile from "./AgentProfile";
import { PreviewAgentCard } from "@/components/AgentDesignPreview";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function open() { return render(<HelmetProvider><MemoryRouter initialEntries={["/agent/preview-agent"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/agent/:id" element={<AgentProfile />} /></Routes></MemoryRouter></HelmetProvider>); }
describe("isolated sample agent design", () => {
  it("renders the fictional profile without backend queries", () => {
    open();
    expect(screen.getByRole("heading", { name:"Tobi Akin" })).toBeInTheDocument();
    expect(screen.getByText(/This agent, agency, prices and listings are fictional/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name:/Sample listing/ })).toHaveLength(3);
    expect(remote.from).not.toHaveBeenCalled();
  });
  it("opens and closes the sample house listing", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name:/Sample listing.*4 Bedroom Garden Duplex/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name:"Back to profile" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(remote.from).not.toHaveBeenCalled();
  });
  it("keeps contact, call and review actions isolated from real operations", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name:"Contact agent" }));
    expect(screen.getByRole("status")).toHaveTextContent("Contact is available only for real agent profiles");
    fireEvent.click(screen.getByRole("button", { name:"Book a call" }));
    expect(screen.getByRole("status")).toHaveTextContent("No call or inspection has been booked");
    fireEvent.click(screen.getByRole("button", { name:"Reviews" }));
    expect(screen.getByText(/No real reviews. Feedback/)).toBeInTheDocument();
    expect(remote.from).not.toHaveBeenCalled();
  });
  it("links the sample directory card to its isolated profile and saves only locally in memory", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PreviewAgentCard /></MemoryRouter>);
    expect(screen.getByRole("link", { name:"View sample profile" })).toHaveAttribute("href","/agent/preview-agent");
    const save = screen.getByRole("button", { name:"Save sample agent" });
    fireEvent.click(save); expect(save).toHaveAttribute("aria-pressed","true");
    expect(remote.from).not.toHaveBeenCalled();
  });
});
