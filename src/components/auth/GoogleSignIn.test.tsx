import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const oauth = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithOAuth: oauth } } }));
import GoogleSignIn from "./GoogleSignIn";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("Google sign-in", () => {
  it("requires consent before starting OAuth", () => {
    render(<GoogleSignIn consent={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toBeDisabled();
    expect(oauth).not.toHaveBeenCalled();
  });
  it("uses the current application origin and reports provider errors", async () => {
    oauth.mockResolvedValue({ error: new Error("Provider disabled") });
    render(<GoogleSignIn consent />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    expect(oauth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
  });
});
