import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ insert: vi.fn(), insertResult: vi.fn(), order: vi.fn(), limit: vi.fn(), error: vi.fn(), messageRead: vi.fn(), removeChannel: vi.fn(), insertCallback: null as null | ((payload: any) => void), callback: null as null | ((payload: any) => void) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "auth-buyer" }, profile: { id: "buyer" }, isAdmin: false }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/chat/AttachmentMenu", () => ({ AttachmentMenu: () => null }));
vi.mock("@/components/chat/VoiceRecorder", () => ({ VoiceRecorder: () => null }));
vi.mock("@/components/chat/MessageBubble", () => ({ MessageBubble: ({ message }: any) => <p>{message.content}{message.pending ? " pending" : " saved"}</p> }));
vi.mock("sonner", () => ({ toast: { error: state.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const result = table === "chat_threads" ? { data: { id: "thread", buyer_id: "buyer", agent_id: "agent", status: "active" }, error: null } : { data: [], error: null };
    let mutation = false;
    const query: any = { select: () => query, eq: () => query, neq: () => query, update: () => { mutation = true; return query; },
      order: (...args: any[]) => { state.order(...args); return query; },
      limit: (...args: any[]) => { state.limit(...args); return query; },
      single: async () => result, then: (resolve: any) => (table === "messages" && !mutation ? state.messageRead() : Promise.resolve(result)).then(resolve),
      insert: (...args: any[]) => { state.insert(...args); return { select: () => ({ single: state.insertResult }) }; },
    }; return query;
  },
  rpc: async () => ({ data: [{ id: "agent", full_name: "Agent" }], error: null }),
  channel: () => { const channel: any = { on: (_kind: string, filter: any, callback: any) => { if (filter.table === "chat_threads") state.callback = callback; if (filter.table === "messages" && filter.event === "INSERT") state.insertCallback = callback; return channel; }, send: vi.fn(), subscribe: () => channel }; return channel; },
  removeChannel: state.removeChannel,
} }));

import Chat from "./Chat";
beforeEach(() => {
  vi.clearAllMocks(); state.callback = null; state.insertCallback = null;
  state.messageRead.mockResolvedValue({ data: [], error: null });
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

it("deduplicates the same message delivered twice by Realtime", async () => {
  open(); await screen.findByRole("textbox", { name: "Message" });
  const message = { id: "incoming", sender_id: "agent", content: "Incoming answer", created_at: "2026-10-31T12:00:00Z", seen: false };
  act(() => { state.insertCallback?.({ new: message }); state.insertCallback?.({ new: message }); });
  expect(screen.getAllByText("Incoming answer saved")).toHaveLength(1);
});
it("retains a Realtime message that arrives while the initial history query is pending", async () => {
  let finish!: (value: { data: unknown[]; error: null }) => void;
  state.messageRead.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  open(); await screen.findByRole("textbox", { name: "Message" });
  act(() => state.insertCallback?.({ new: { id: "new", sender_id: "agent", content: "Just arrived", created_at: "2026-10-31T12:01:00Z", seen: false } }));
  await act(async () => finish({ data: [{ id: "old", sender_id: "agent", content: "Older answer", created_at: "2026-10-31T12:00:00Z", seen: false }], error: null }));
  expect(screen.getByText("Just arrived saved")).toBeInTheDocument();
  expect(screen.getByText("Older answer saved")).toBeInTheDocument();
});
it("shows a history loading failure and recovers when the user retries", async () => {
  state.messageRead.mockResolvedValueOnce({ data: null, error: new Error("Read denied") });
  open(); expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load messages");
  state.messageRead.mockResolvedValue({ data: [{ id: "retried", sender_id: "agent", content: "Recovered history", created_at: "2026-10-31T12:00:00Z", seen: false }], error: null });
  fireEvent.click(screen.getByRole("button", { name: "Retry messages" }));
  expect(await screen.findByText("Recovered history saved")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("removes the subscription and ignores a late event after the page closes", async () => {
  const view = open(); await screen.findByRole("textbox", { name: "Message" });
  const callback = state.insertCallback;
  view.unmount();
  expect(state.removeChannel).toHaveBeenCalledTimes(1);
  act(() => callback?.({ new: { id: "late", sender_id: "agent", content: "Late answer", created_at: "2026-10-31T12:00:00Z", seen: false } }));
  expect(screen.queryByText("Late answer saved")).not.toBeInTheDocument();
});
