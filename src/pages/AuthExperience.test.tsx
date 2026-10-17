import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const auth = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn(), resend: vi.fn(), getUser: vi.fn(), unsubscribe: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ signIn: auth.signIn, signUp: auth.signUp }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  resend: auth.resend, getUser: auth.getUser,
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: auth.unsubscribe } } }),
} } }));
import Login from "./Login";
import Register from "./Register";
import EmailConfirmationResult from "@/components/auth/EmailConfirmationResult";
function open(component: React.ReactNode, path = "/login") {
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/dashboard" element={<h1>Synthetic dashboard destination</h1>} /><Route path="*" element={component} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); });
  vi.clearAllMocks(); auth.signIn.mockResolvedValue(undefined); auth.signUp.mockResolvedValue(undefined); auth.resend.mockResolvedValue({ error: null }); window.history.replaceState({}, "", "/");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });
function loginFields() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "synthetic@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Synthetic!123" } });
  fireEvent.click(screen.getByRole("checkbox"));
}
describe("authentication presentation with mocked services", () => {
  it("supports password visibility, existing consent and the dashboard redirect", async () => {
    open(<Login />); loginFields();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));
    await screen.findByRole("heading", { name: "Synthetic dashboard destination" });
    expect(auth.signIn).toHaveBeenCalledWith("synthetic@example.test", "Synthetic!123");
  });
  it("shows unconfirmed-email errors without claiming success, and supports resend", async () => {
    auth.signIn.mockRejectedValue(new Error("Email not confirmed"));
    open(<Login />); loginFields();
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("Synthetic dashboard destination")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));
    await screen.findByText(/a new link has been requested/);
    expect(auth.resend).toHaveBeenCalledWith({ type: "signup", email: "synthetic@example.test", options: { emailRedirectTo: window.location.origin } });
    expect(screen.getByRole("button", { name: /Resend available in/ })).toBeDisabled();
  });
  it("preserves builder registration fields and referrals, then shows waiting rather than verification", async () => {
    open(<Register />, "/register?ref=SYNTHETIC-REF");
    fireEvent.click(screen.getByRole("radio", { name: "Builder / Developer" }));
    expect(screen.getByText(/registration does not approve developments/i)).toBeInTheDocument();
    for (const [label, value] of [["Full Name", "Synthetic owner"], ["Email", "synthetic@example.test"], ["Phone Number", "+2348000000000"], ["Password", "Synthetic!123"], ["Confirm Password", "Synthetic!123"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    await screen.findByRole("heading", { name: "Check Your Email" });
    expect(auth.signUp).toHaveBeenCalledExactlyOnceWith("synthetic@example.test", "Synthetic!123", "Synthetic owner", "builder", "+2348000000000", "SYNTHETIC-REF");
    expect(screen.queryByText("Signed-in email verified")).not.toBeInTheDocument();
  });
  it("retains mismatch validation and disables invalid registration", () => {
    open(<Register />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Synthetic!123" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Other!123" } });
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Account" })).toBeDisabled();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("does not accept a signup URL as evidence of email confirmation", async () => {
    window.history.replaceState({}, "", "/#type=signup");
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    open(<EmailConfirmationResult />);
    await screen.findByText("Confirmation could not be verified");
    expect(screen.queryByText("Signed-in email verified")).not.toBeInTheDocument();
  });
  it("shows confirmation only for an Auth-verified email", async () => {
    window.history.replaceState({}, "", "/#type=signup");
    auth.getUser.mockResolvedValue({ data: { user: { id: "synthetic", email_confirmed_at: "2026-01-01" } }, error: null });
    open(<EmailConfirmationResult />);
    await screen.findByText("Signed-in email verified");
    expect(screen.getByRole("link", { name: "Continue to your account" })).toHaveAttribute("href", "/dashboard");
  });
  it("does not verify an expired confirmation link even with an existing session", () => {
    window.history.replaceState({}, "", "/#error=access_denied&error_code=otp_expired");
    open(<EmailConfirmationResult />);
    expect(screen.getByRole("alert")).toHaveTextContent("Confirmation link unavailable");
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});
