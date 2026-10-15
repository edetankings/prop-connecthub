import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sign: vi.fn(), bucket: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: mocks.bucket } } }));
import { resolveSignedUrl } from "./storageUrl";

describe("private storage links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bucket.mockReturnValue({ createSignedUrl: mocks.sign });
    mocks.sign.mockResolvedValue({ data: { signedUrl: "https://signed.example/file" }, error: null });
  });
  it.each([null, undefined, "", "https://old.example/public/evidence.pdf", "javascript:alert(1)", "/absolute", "owner/../other/file"])("rejects unsafe private paths", async (path) => {
    expect(await resolveSignedUrl("verification-docs", path)).toBeNull();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("requests an authorized short-lived URL for a relative object path", async () => {
    expect(await resolveSignedUrl("property-documents", "owner/property/deed.pdf", 300)).toBe("https://signed.example/file");
    expect(mocks.bucket).toHaveBeenCalledWith("property-documents");
    expect(mocks.sign).toHaveBeenCalledWith("owner/property/deed.pdf", 300);
  });
  it("does not return a link when storage refuses access", async () => {
    mocks.sign.mockResolvedValue({ data: null, error: { message: "Denied" } });
    expect(await resolveSignedUrl("verification-docs", "owner/id.pdf")).toBeNull();
  });
});
