import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
const mocks = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  profile: vi.fn(), eq: vi.fn(), rpc: vi.fn(), signOut: vi.fn(), signUp: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: mocks.eq }) }), rpc: mocks.rpc,
  auth: {
    onAuthStateChange: (callback: typeof mocks.listener) => { mocks.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
    getSession: async () => ({ data: { session: null } }),
    signOut: mocks.signOut, signUp: mocks.signUp,
  },
} }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn() } }));
import { AuthProvider, useAuth } from "./useAuth";
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("standard Auth integration", () => {
  it("uses the Auth UUID for profile lookup and ignores a response arriving after logout", async () => {
    let resolveProfile: (value: { data: { id: string; user_id: string } }) => void;
    mocks.profile.mockImplementation(() => new Promise((resolve) => { resolveProfile = resolve; }));
    mocks.eq.mockReturnValue({ maybeSingle: mocks.profile });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { mocks.listener?.("SIGNED_IN", { user: { id: "auth-account" } } as Session); });
    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith("user_id", "auth-account"));
    await act(async () => { mocks.listener?.("SIGNED_OUT", null); });
    await act(async () => resolveProfile!({ data: { id: "different-profile-id", user_id: "auth-account" } }));
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });
  it("rejects administrator signup selection before sending a request", async () => {
    mocks.signUp.mockClear();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.signUp("test@example.invalid", "test-password", "Test", "admin", "")).rejects.toThrow("valid account type");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("does not report successful logout when the backend rejects it", async () => {
    const failure = new Error("Logout failed");
    mocks.signOut.mockResolvedValue({ error: failure });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.signOut()).rejects.toThrow("Logout failed");
  });
});
