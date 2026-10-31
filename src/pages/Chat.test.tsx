import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ insert: vi.fn(), insertResult: vi.fn(), order: vi.fn(), limit: vi.fn(), error: vi.fn(), callback: null as null | ((payload: any) => void) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "auth-buyer" }, profile: { id: "buyer" }, isAdmin: false }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/chat/AttachmentMenu", () => ({ AttachmentMenu: () => null }));
vi.mock("@/components/chat/VoiceRecorder", () => ({ VoiceRecorder: () => null }));
vi.mock("@/components/chat/MessageBubble", () => ({ MessageBubble: ({ message }: any) => <p>{message.content}{message.pending ? " pending" : " saved"}</p> }));
vi.mock("sonner", () => ({ toast: { error: state.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const result = table === "chat_threads" ? { data: { id: "thread", buyer_id: "buyer", agent_id: "agent", status: "active" }, error: null } : { data: [], error: null };
    const query: any = { select: () => query, eq: () => query, neq: () => query, update: () => query,
      order: (...args: any[]) => { state.order(...args); return query; },
      limit: (...args: any[]) => { state.limit(...args); return query; },
      single: async () => result, then: (resolve: any) => Promise.resolve(result).then(resolve),
      insert: (...args: any[]) => { state.insert(...args); return { select: () => ({ single: state.insertResult }) }; },
    }; return query;
  },
  rpc: async () => ({ data: [{ id: "agent", full_name: "Agent" }], error: null }),
  channel: () => { const channel: any = { on: (_kind: string, filter: any, callback: any) => { if (filter.table === "chat_threads") state.callback = callback; return channel; }, send: vi.fn(), subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));

import Chat from "./Chat";
beforeEach(() => {
  vi.clearAllMocks(); state.callback = null;
  Object.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true });
  state.insertResult.mockResolvedValue({ data: { id: "confirmed", sender_id: "buyer", content: "Hello agent", created_at: "2026-10-31T12:00:00Z", seen: false }, error: null });
});
afterEach(cleanup);
const open = () => render(<MemoryRouter initialEntries={["/chat/thread"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/chat/:threadId" element={<Chat />} /></Routes></MemoryRouter>);
it("loads the newest page instead of the oldest database result window", async () => {
  open(); await screen.findByRole("textbox", { name: "Message" });
  expect(state.order).toHaveBeenCalledWith("created_at", { ascending: false });
  expect(state.limit).toHaveBeenCalledWith(30);
});
it("confirms a sent message without waiting for a realtime event", async () => {
  open(); const input = await screen.findByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Hello agent" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByText("Hello agent saved")).toBeInTheDocument();
  expect(screen.queryByText("Hello agent pending")).not.toBeInTheDocument();
});
it("restores a failed message for retry and removes its optimistic bubble", async () => {
  state.insertResult.mockResolvedValue({ data: null, error: new Error("Send denied") });
  open(); const input = await screen.findByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Hello agent" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(state.error).toHaveBeenCalledWith("Send denied"));
  expect(input).toHaveValue("Hello agent");
  expect(screen.queryByText("Hello agent pending")).not.toBeInTheDocument();
});

it("updates restricted composer controls when an administrator activates a thread", async () => {
  open(); await screen.findByRole("textbox", { name: "Message" });
  act(() => state.callback?.({ new: { status: "restricted" } }));
  expect(screen.queryByRole("textbox", { name: "Message" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Is this property still available?" })).toBeInTheDocument();
  act(() => state.callback?.({ new: { status: "active" } }));
  expect(screen.getByRole("textbox", { name: "Message" })).toBeInTheDocument();
});
