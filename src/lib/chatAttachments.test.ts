import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), bucket: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: mocks.bucket } } }));
import { uploadChatFile } from "./chatAttachments";
beforeEach(() => { vi.clearAllMocks(); mocks.bucket.mockReturnValue({ upload: mocks.upload }); });
describe("private chat uploads", () => {
  it("rejects denied uploads and retries without producing a public fallback", async () => {
    const file = new File(["synthetic"], "fixture.pdf", { type: "application/pdf" });
    mocks.upload.mockResolvedValueOnce({ error: { message: "Denied" } }).mockResolvedValueOnce({ error: null });
    await expect(uploadChatFile("auth-owner", file, file.name)).rejects.toEqual({ message: "Denied" });
    const path = await uploadChatFile("auth-owner", file, file.name);
    expect(path).toMatch(/^auth-owner\//); expect(path).not.toContain("https:");
    expect(mocks.bucket).toHaveBeenCalledWith("chat-attachments");
    expect(mocks.upload).toHaveBeenCalledTimes(2);
  });
  it("propagates transport errors so the calling UI can reset and report failure", async () => {
    mocks.upload.mockRejectedValue(new Error("Offline"));
    await expect(uploadChatFile("auth-owner", new Blob(["fixture"]), "fixture.bin")).rejects.toThrow("Offline");
  });
});
