import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ enabled: true, fail: false, active: false }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "agent-auth" }, profile: { profile_type: "agent" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: async () => ({ data: state.fail ? null : state.enabled, error: state.fail ? { message: "Denied" } : null }),
  from: (table: string) => {
    const q = { select: () => q, eq: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => ({ data: table === "subscriptions" && state.active ? { id: "subscription", status: "active", end_date: "2099-01-01" } : null, error: null }) };
    return q;
  },
} }));
import { useSubscription } from "./useSubscription";
beforeEach(() => { state.enabled = true; state.fail = false; state.active = false; });
afterEach(cleanup);
it("allows listing without inventing an active subscription while OFF", async () => {
  state.enabled = false;
  const { result } = renderHook(useSubscription);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.canList).toBe(true);
  expect(result.current.isActive).toBe(false);
  expect(result.current.subscription).toBeNull();
});
it("requires an active subscription while ON", async () => {
  const { result } = renderHook(useSubscription);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.canList).toBe(false);
});
it("preserves active subscriber access while ON", async () => {
  state.active = true;
  const { result } = renderHook(useSubscription);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.canList).toBe(true);
  expect(result.current.isActive).toBe(true);
});
it("does not grant free listing access when settings cannot be read", async () => {
  state.fail = true;
  const { result } = renderHook(useSubscription);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.settingsError).toBe(true);
  expect(result.current.canList).toBe(false);
});
