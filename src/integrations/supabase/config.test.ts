import { describe, expect, it } from "vitest";
import { validateSupabaseConfig } from "./config";

const url = "https://integration-check.supabase.co";
const key = "sb_publishable_test_only";
describe("public Supabase configuration", () => {
  it("accepts a public key and normalizes the origin", () => {
    expect(validateSupabaseConfig(url + "/", key)).toEqual({ url, key });
  });
  it("supports local development", () => {
    expect(validateSupabaseConfig("http://127.0.0.1:54321", key).url).toBe("http://127.0.0.1:54321");
  });
  it.each([undefined, "", "not-a-url", "http://remote.example", "https://user:pass@example.com", url + "/rest/v1", url + "?token=private"])("rejects unsafe or missing URLs: %s", (value) => {
    expect(() => validateSupabaseConfig(value, key)).toThrow();
  });
  it.each([undefined, "", "sb_secret_test_only", "invalid-key"])("rejects non-public keys: %s", (value) => {
    expect(() => validateSupabaseConfig(url, value)).toThrow();
  });
  it("rejects a legacy service-role JWT without exposing its value", () => {
    const secret = "header." + btoa(JSON.stringify({ role: "service_role" })) + ".signature";
    expect(() => validateSupabaseConfig(url, secret)).toThrow(/never a service-role key/);
    try { validateSupabaseConfig(url, secret); } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
  it("retains compatibility with a legacy public anon key", () => {
    const anon = "header." + btoa(JSON.stringify({ role: "anon" })) + ".signature";
    expect(validateSupabaseConfig(url, anon).key).toBe(anon);
  });
});
