import { useState } from "react";
import { Eye, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { blankWaitlistEmail, renderWaitlistEmail, validateWaitlistEmail, type WaitlistEmail } from "@/lib/waitlistEmail";
export default function WaitlistAnnouncementComposer() {
 const {isAdmin}=useAuth();
 const [draft,setDraft]=useState<WaitlistEmail>({...blankWaitlistEmail});
 const [notice,setNotice]=useState("");
 const [size,setSize]=useState("desktop");
 if(!isAdmin)return null;
 const change=(key:keyof WaitlistEmail,value:string)=>{setDraft(previous=>({...previous,[key]:value}));setNotice("");};
 const exportHtml=()=>{
  const error=validateWaitlistEmail(draft);if(error){setNotice(error);return;}
  const url=URL.createObjectURL(new Blob([renderWaitlistEmail(draft)],{type:"text/html;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="prop-connect-waitlist-announcement.html";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice("Email HTML downloaded. No email was sent.");
 };
 return <section id="waitlist-announcement" className="feature-management-panel announcement-composer" aria-labelledby="announcement-title">
  <header><span className="feature-section-icon"><Mail aria-hidden="true"/></span><div><h2 id="announcement-title">Design an announcement</h2><p>Write an email for your waitlist and preview the finished design.</p></div></header>
  <div className="announcement-layout"><div className="announcement-editor">
   <p className="announcement-audience">Audience: waitlist subscribers · recipient list not connected</p>
   <label>Email subject<input value={draft.subject} maxLength={150} onChange={event=>change("subject",event.target.value)} placeholder="What is your announcement about?"/></label>
   <label>Inbox preview text<input value={draft.preheader} maxLength={200} onChange={event=>change("preheader",event.target.value)} placeholder="A short introduction for the inbox"/></label>
   <label>Email headline<input value={draft.headline} maxLength={160} onChange={event=>change("headline",event.target.value)} placeholder="Your next chapter starts here"/></label>
   <label>Message<textarea rows={8} value={draft.body} maxLength={10000} onChange={event=>change("body",event.target.value)} placeholder="Write your announcement. Use a blank line to start a new paragraph."/></label>
   <div className="announcement-button-fields"><label>Button text (optional)<input value={draft.buttonLabel} maxLength={60} onChange={event=>change("buttonLabel",event.target.value)} placeholder="Explore PROP-CONNECT"/></label><label>Button link (optional)<input type="url" value={draft.buttonUrl} maxLength={2000} onChange={event=>change("buttonUrl",event.target.value)} placeholder="https://…"/></label></div>
   <label>Header style<select value={draft.tone} onChange={event=>change("tone",event.target.value)}><option value="forest">Forest green</option><option value="mint">Soft mint</option></select></label>
   <p className="announcement-draft-note">Draft is kept in this tab only. Download the HTML before leaving or refreshing.</p>
   <div className="announcement-actions"><button type="button" onClick={exportHtml}>Download email HTML</button><button type="button" disabled aria-describedby="announcement-send-help">Send to waitlist</button></div>
   {notice&&<p role="status">{notice}</p>}
  </div><div className="announcement-preview"><div className="announcement-preview-heading"><span><Eye aria-hidden="true"/>Email preview</span><label><span className="sr-only">Preview size</span><select value={size} onChange={event=>setSize(event.target.value)}><option value="desktop">Desktop</option><option value="mobile">Phone</option></select></label></div><div className="announcement-preview-canvas" data-size={size}><iframe title="Waitlist email preview" sandbox="" srcDoc={renderWaitlistEmail(draft)}/></div><p>Preview only. Email clients may render spacing and fonts differently.</p></div></div>
  <div id="announcement-send-help" className="feature-backend-notice"><h3>Connect Resend to send</h3><p>Sending requires a verified sender domain, a connected waitlist, and an admin-authorized server endpoint. The Resend API key belongs in server secrets, never in the browser. No email is sent by this composer yet.</p></div>
 </section>;
}
