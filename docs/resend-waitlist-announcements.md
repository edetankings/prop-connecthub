# Waitlist announcement composer and Resend connection

## Implemented locally

The admin-only Waitlist & subscriptions page includes an announcement editor with subject, inbox preview, headline, paragraphs, optional HTTPS call-to-action and forest/mint styles. Desktop/phone preview uses a sandboxed iframe. Download exports a real HTML email template; it does not send mail. Drafts are held in component memory only and are lost on reload. No keys, recipient addresses, contact lists or campaign records are stored in the browser.

Send to waitlist is disabled because the application has neither a waitlist backend nor a Resend sending endpoint. No SDK, API key or client-side sending call has been added. No existing Edge Function, schema, environment or payment integration was changed.

## Required production connection

1. Establish the waitlist backend and server-enforced administrator permissions described in `waitlist-subscription-support.md`. Keep enrollment separate from privileged list management. Define eligible subscribed/verified statuses and record consent. Do not substitute all Auth users for the waitlist.
2. Add and verify an owned sending domain in Resend. Configure an approved From address and a waitlist contact segment. Synchronize only eligible waitlist contacts; preserve unsubscribe and suppression states.
3. Configure server-only secrets using the deployment secret manager: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WAITLIST_SEGMENT_ID`, and the signing secret for delivery webhooks if used. These are proposed configuration names, not existing configured values. Never put them in VITE variables or chat.
4. Implement a server endpoint that validates the Supabase session and checks the caller's administrator role against the database. Reject non-admin callers. The server chooses the audience and sender; the client must not supply arbitrary recipients or a segment ID.
5. Persist the campaign subject, sanitized content, creator, revision, recipient eligibility snapshot, provider broadcast ID and send status. Prevent duplicate dispatch with an atomic campaign transition/unique dispatch key. Retries must reuse the same campaign, rather than create a second broadcast. Verify the latest provider behavior before enabling retries.
6. Use Resend Broadcasts to create a draft for the approved segment, then send only after an admin reviews the final content and actual eligible recipient count. The generated HTML contains `{{{RESEND_UNSUBSCRIBE_URL}}}`, which must be resolved through the Broadcast workflow; do not send this raw token through an unrelated delivery method.
7. Verify webhook signatures and deduplicate events before recording delivery, bounce, complaint and unsubscribe outcomes. Keep recipient addresses private, and do not re-add suppressed/unsubscribed contacts during synchronization.
8. Connect the UI only after server authorization, audience selection, rate/quota behavior and duplicate-send protection pass tests. Add a test-recipient flow and explicit final audience confirmation. No mail was sent during development.

## Delivery wording

A successful send request starts dispatch; it does not prove inbox delivery or that every subscriber has seen the email. The UI should distinguish queued/submitted, delivered, bounced and failed states using actual provider events. Do not show invented counts or guarantee instant delivery.

## Official references

- Verified sender domains: https://resend.com/docs/dashboard/domains/introduction
- Create Broadcast (segments and unsubscribe token): https://resend.com/docs/api-reference/broadcasts/create-broadcast
- Send Broadcast: https://resend.com/docs/api-reference/broadcasts/send-broadcast
