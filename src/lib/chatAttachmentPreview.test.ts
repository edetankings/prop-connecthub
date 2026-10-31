import { expect, it, vi } from "vitest";

// Overview cards format chat previews without uploading or signing in.
// Importing the backend here is a regression, even when local .env files exist.
vi.mock("@/integrations/supabase/client", () => {
  throw new Error("Chat preview formatting must not initialize the Supabase client");
});

import { attachmentPreview, encodeAttachment } from "./chatAttachments";

it("formats attachment previews without loading backend configuration", () => {
  expect(attachmentPreview("A property question")).toBe("A property question");
  expect(attachmentPreview(encodeAttachment({ kind: "file", name: "survey.pdf" }))).toBe("📄 survey.pdf");
  expect(attachmentPreview(encodeAttachment({ kind: "voice" }))).toBe("🎤 Voice note");
});
