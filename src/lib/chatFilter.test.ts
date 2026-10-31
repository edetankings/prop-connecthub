import { expect, it } from "vitest";
import { AI_QUICK_OPTIONS, containsContactInfo } from "./chatFilter";

it.each(["Call +234 801 234 5678", "agent@example.com", "https://example.com", "WhatsApp", "call me"])("blocks repeated contact-sharing attempts: %s", text => {
  for (let attempt = 0; attempt < 5; attempt++) expect(containsContactInfo(text)).toBe(true);
});
it("allows the restricted-chat quick questions", () => {
  for (const question of AI_QUICK_OPTIONS) expect(containsContactInfo(question)).toBe(false);
});
