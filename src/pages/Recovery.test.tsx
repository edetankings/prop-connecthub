import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
const auth = vi.hoisted(() => ({
  getSession: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), resetPasswordForEmail: vi.fn(), unsubscribe: vi.fn(),
  listener: null as null | ((event: AuthChangeEvent, session: Session | null) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getSession: auth.getSession, getUser: auth.getUser, updateUser: auth.updateUser, resetPasswordForEmail: auth.resetPasswordForEmail,
  onAuthStateChange: (listener: typeof auth.listener) => { auth.listener = listener; return { data: { subscription: { unsubscribe: auth.unsubscribe } } }; },
} } }));
import ResetPassword from "./ResetPassword";
import ForgotPassword from "./ForgotPassword";
function open(component: React.ReactNode) {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{component}</MemoryRouter>);
}
const session = { user: { id: "test-owner" } } as Session;
beforeEach(() => {
  vi.clearAllMocks(); auth.listener = null;
  window.history.replaceState({}, "", "/reset-password");
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
});
afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });
async function recovery() {
  auth.getSession.mockImplementation(async () => {
    auth.listener?.("PASSWORD_RECOVERY", session);
    return { data: { session }, error: null };
  });
  open(<ResetPassword />);
  await screen.findByText("Create New Password");
}
function passwords() {
  fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "test-password-123" } });
  fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "test-password-123" } });
}
describe("password recovery transitions (mocked SDK)", () => {
  it("rejects a forged recovery fragment with no SDK-confirmed session", async () => {
    window.history.replaceState({}, "", "/reset-password#type=recovery");
    open(<ResetPassword />);
    await screen.findByText("Invalid or Expired Link");
    expect(screen.queryByText("Create New Password")).not.toBeInTheDocument();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("does not trust a persisted session when Auth cannot validate its identity", async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    open(<ResetPassword />);
    await screen.findByText("Invalid or Expired Link");
  });
  it("supports a validated session when URL processing completed before the page mounted", async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    open(<ResetPassword />);
    await screen.findByText("Create New Password");
  });
  it("rejects an explicit expired-link error even with an existing valid session", async () => {
    window.history.replaceState({}, "", "/reset-password#error=access_denied&error_code=otp_expired");
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    open(<ResetPassword />);
    await screen.findByText("Invalid or Expired Link");
  });
  it("handles session-check rejection as an invalid link", async () => {
    auth.getSession.mockRejectedValue(new Error("Unavailable"));
    open(<ResetPassword />);
    await screen.findByText("Invalid or Expired Link");
  });
  it("shows an update error, resets loading and allows retry without false success", async () => {
    auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "Session expired" } })
      .mockResolvedValueOnce({ data: { user: session.user }, error: null });
    await recovery(); passwords();
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    await screen.findByText("Session expired");
    expect(screen.queryByText("Password Updated!")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update Password" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
    await screen.findByText("Password Updated!");
    expect(auth.updateUser).toHaveBeenCalledTimes(2);
  });
  it("blocks duplicate updates while pending and invalidates the form on logout", async () => {
    let finish!: (value: unknown) => void;
    auth.updateUser.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await recovery(); passwords();
    const form = screen.getByRole("button", { name: "Update Password" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ data: { user: null }, error: { message: "Expired" } }); });
    act(() => auth.listener?.("SIGNED_OUT", null));
    await screen.findByText("Invalid or Expired Link");
  });
  it("does not confirm reset-email delivery on failure and permits retry", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: "Rate limited" } }).mockResolvedValueOnce({ error: null });
    open(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "synthetic@example.invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));
    await screen.findByText("Rate limited");
    expect(screen.queryByText("Check Your Email")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));
    await screen.findByText("Check Your Email");
    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(2));
  });
});
