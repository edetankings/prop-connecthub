import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ userId: "test-ai-user", admin: false, type: "buyer", session: vi.fn(), fetch: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAdmin: state.admin, user: { id: state.userId }, session: { access_token: "test-token" }, profile: { full_name: "Test User", profile_type: state.type } }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: state.session } } }));
vi.mock("sonner", () => ({ toast: { error: state.error } }));
import AIAssistant from "./AIAssistant";
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); state.userId = "test-ai-user"; state.admin = false; state.type = "buyer";
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  state.session.mockResolvedValue({ data: { session: { access_token: "fresh-test-token", user: { id: "test-ai-user" } } }, error: null });
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

it("keeps backend setup failures visible and restores the question", async () => {
  state.fetch.mockResolvedValue(new Response(JSON.stringify({ error: "The assistant is not configured yet. Please use property search or contact support." }), { status: 503 }));
  open();
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Help me find land" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("The assistant is not configured yet");
  expect(screen.getByPlaceholderText("Ask Prop Connect AI…")).toHaveValue("Help me find land");
  expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
});
it("keeps connection failures visible instead of leaving an unanswered chat", async () => {
  state.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
  open();
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Explain verification" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach Prop Connect AI");
});

it("clears private history and drafts when the account changes", async () => {
  localStorage.setItem("prop-connect-ai-conversation:previous-user", "private old chat");
  state.fetch.mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"Private account A reply"}}]}\n\n'));
  const view = open();
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "My private question" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByText("Private account A reply")).toBeInTheDocument();
  expect(localStorage.getItem("prop-connect-ai-conversation:previous-user")).toBeNull();
  expect(Object.keys(localStorage).filter(k => k.startsWith("prop-connect-ai-conversation"))).toEqual([]);
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Private draft" } });
  state.userId = "account-b";
  view.rerender(<MemoryRouter><AIAssistant /></MemoryRouter>);
  expect(screen.queryByText("Private account A reply")).not.toBeInTheDocument();
  expect(screen.queryByText("My private question")).not.toBeInTheDocument();
  expect(screen.getByPlaceholderText("Ask Prop Connect AI…")).toHaveValue("");
});
it("does not send account A history with account B credentials", async () => {
  state.session.mockResolvedValue({ data: { session: { access_token: "other-token", user: { id: "account-b" } } }, error: null });
  open();
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Private account A question" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Your account changed");
  expect(state.fetch).not.toHaveBeenCalled();
});
it("aborts pending requests on account switch without showing late replies", async () => {
  let finish: (response: Response) => void = () => {};
  state.fetch.mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
  const view = open();
  fireEvent.change(screen.getByPlaceholderText("Ask Prop Connect AI…"), { target: { value: "Private question" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(state.fetch).toHaveBeenCalled());
  const signal = state.fetch.mock.calls[0][1].signal as AbortSignal;
  state.userId = "account-b";
  view.rerender(<MemoryRouter><AIAssistant /></MemoryRouter>);
  expect(signal.aborted).toBe(true);
  finish(new Response('data: {"choices":[{"delta":{"content":"Late private reply"}}]}\n\n'));
  await waitFor(() => expect(screen.getByPlaceholderText("Ask Prop Connect AI…")).toBeEnabled());
  expect(screen.queryByText("Late private reply")).not.toBeInTheDocument();
});
