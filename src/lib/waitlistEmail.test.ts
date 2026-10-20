import { expect, it } from "vitest";
import { blankWaitlistEmail, renderWaitlistEmail, validateWaitlistEmail } from "./waitlistEmail";
const valid={...blankWaitlistEmail,subject:"A platform update",headline:"A clearer next step",body:"First paragraph.\n\nSecond paragraph."};
it("escapes authored text while preserving paragraphs and the Resend unsubscribe token",()=>{
 const html=renderWaitlistEmail({...valid,headline:'<img src=x onerror="alert(1)">',body:"<script>alert(1)</script>\n\nNext"});
 expect(html).not.toContain("<script>");expect(html).not.toContain("<img");expect(html).toContain("&lt;script&gt;");expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");expect(html).toContain("Next</p>");
});
it("rejects incomplete drafts and unsafe button links",()=>{
 expect(validateWaitlistEmail(blankWaitlistEmail)).toBeTruthy();
 for(const url of ["javascript:alert(1)","http://example.test","https://user:password@example.test"]){const draft={...valid,buttonLabel:"Read",buttonUrl:url};expect(validateWaitlistEmail(draft)).toBeTruthy();expect(renderWaitlistEmail(draft)).not.toContain('>Read</a>');}
 expect(validateWaitlistEmail({...valid,subject:"Subject\r\nBcc: hidden"})).toBeTruthy();
});
it("produces a complete branded document with only a valid optional CTA",()=>{
 const draft={...valid,buttonLabel:"Explore",buttonUrl:"https://example.test/?a=1&b=2"};expect(validateWaitlistEmail(draft)).toBeNull();expect(renderWaitlistEmail(draft)).toContain('href="https://example.test/?a=1&amp;b=2"');expect(renderWaitlistEmail(draft)).toContain('name="viewport"');
});
