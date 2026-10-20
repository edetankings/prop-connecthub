export type WaitlistEmail = { subject:string; preheader:string; headline:string; body:string; buttonLabel:string; buttonUrl:string; tone:"forest"|"mint" };
export const blankWaitlistEmail:WaitlistEmail={subject:"",preheader:"",headline:"",body:"",buttonLabel:"",buttonUrl:"",tone:"forest"};
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
export function validateWaitlistEmail(draft:WaitlistEmail):string|null {
 if(!draft.subject.trim()||!draft.headline.trim()||!draft.body.trim())return "Add a subject, headline and message before exporting.";
 if(/[\r\n]/.test(draft.subject))return "Keep the subject on one line.";
 if(draft.subject.length>150||draft.headline.length>160||draft.body.length>10000)return "Shorten the subject, headline or message to fit the field limits.";
 if(draft.buttonLabel.trim()||draft.buttonUrl.trim()) {
  if(!draft.buttonLabel.trim()||!draft.buttonUrl.trim())return "Add both button text and a secure website link, or leave both empty.";
  try{const url=new URL(draft.buttonUrl.trim());if(url.protocol!=="https:"||url.username||url.password)throw new Error();}catch{return "Use an HTTPS link without embedded login details.";}
 }
 return null;
}
export function renderWaitlistEmail(draft:WaitlistEmail):string {
 const e=escapeHtml;
 let safeLink="";try{const url=new URL(draft.buttonUrl.trim());if(url.protocol==="https:"&&!url.username&&!url.password)safeLink=url.href;}catch{/* Optional link omitted until valid. */}
 const background=draft.tone==="mint"?"#ddefe6":"#0b4938";
 const foreground=draft.tone==="mint"?"#0b4938":"#ffffff";
 const paragraphs=draft.body.split(/\n\s*\n/).map(part=>`<p style="margin:0 0 20px;font-size:16px;line-height:1.8;color:#465a50;overflow-wrap:anywhere">${e(part).replace(/\n/g,"<br>")}</p>`).join("");
 const button=safeLink&&draft.buttonLabel.trim()?`<p style="margin:28px 0"><a href="${e(safeLink)}" style="display:inline-block;background:#0b4938;color:#ffffff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600">${e(draft.buttonLabel)}</a></p>`:"";
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(draft.subject)}</title></head><body style="margin:0;background:#f3f6f3;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${e(draft.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border:1px solid #dfe7e0;border-radius:16px;overflow:hidden"><tr><td style="background:${background};color:${foreground};padding:32px 28px"><p style="font-size:13px;letter-spacing:2px;font-weight:bold;margin:0 0 28px">PROP-CONNECT</p><h1 style="font-size:30px;line-height:1.25;margin:0;overflow-wrap:anywhere">${e(draft.headline||"Your headline")}</h1></td></tr><tr><td style="padding:32px 28px">${paragraphs||'<p style="color:#687c70;line-height:1.8">Your message will appear here.</p>'}${button}</td></tr><tr><td style="padding:24px 28px;border-top:1px solid #e4ebe5;font-size:12px;line-height:1.8;color:#687c70">PROP-CONNECT · Find. View. Connect.<br>You are receiving waitlist updates.<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#0b4938">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`;
}
