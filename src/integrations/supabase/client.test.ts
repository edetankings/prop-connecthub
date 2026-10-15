import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(() => ({ auth: {} })) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.create }));

describe("Supabase client initialization", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });
  it("uses public configuration and standard browser auth storage", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://integration-check.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_only");
    await import("./client");
    expect(mocks.create).toHaveBeenCalledWith("https://integration-check.supabase.co", "sb_publishable_test_only", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  });
  it("fails before initialization when a secret key is supplied", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://integration-check.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_secret_test_only");
    await expect(import("./client")).rejects.toThrow(/server secret/);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
