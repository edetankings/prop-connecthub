import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ admin: false, type: "buyer", session: vi.fn(), fetch: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAdmin: state.admin, user: { id: "test-ai-user" }, session: { access_token: "test-token" }, profile: { full_name: "Test User", profile_type: state.type } }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: state.session } } }));
vi.mock("sonner", () => ({ toast: { error: state.error } }));
import AIAssistant from "./AIAssistant";
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); state.admin = false; state.type = "buyer";
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  state.session.mockResolvedValue({ data: { session: { access_token: "fresh-test-token" } }, error: null });
  vi.stubGlobal("fetch", state.fetch);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const open = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AIAssistant /></MemoryRouter>);
it("shows administrator prompts based on the assigned role, not the profile category", () => {
  state.admin = true; open();
  expect(screen.getByRole("button", { name: "What are common property fraud signals?" })).toBeInTheDocument();
});
it("offers professional prompts to builders", () => {
  state.type = "builder"; open();
  expect(screen.getByRole("button", { name: "How do I increase my trust score?" })).toBeInTheDocument();
});
it("resets the composer when reading the session fails", async () => {
  state.session.mockRejectedValue(new Error("Session unavailable")); open();
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Find a property" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(state.error).toHaveBeenCalledWith("Session unavailable"));
  expect(state.fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Retry" } });
  expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
});
it("uses the authenticated endpoint and renders a streamed reply", async () => {
  state.fetch.mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"Browse verified listings."}}]}\n\ndata: [DONE]\n\n', { headers: { "Content-Type": "text/event-stream" } }));
  open(); fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Find a property" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByText("Browse verified listings.")).toBeInTheDocument();
  expect(state.fetch).toHaveBeenCalledWith(expect.stringContaining("/functions/v1/prop-ai"), expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer fresh-test-token" }) }));
});
