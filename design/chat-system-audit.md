# Chat system audit — 31 October 2026

## Fixes

- Removed stateful regular-expression flags that let repeated contact-sharing attempts bypass the browser filter.
- Load newest messages first using a bounded query, reverse for chronological display, and fetch a larger recent window when loading earlier messages. Search covers the loaded history, not every historical database message.
- Confirm sends from the inserted database row without requiring Realtime delivery. Restore failed drafts and remove their optimistic bubbles.
- Subscribe to thread status changes so administrator activation updates composer controls.
- Remount the thread on account or conversation changes to isolate transcript and draft state. Ignore late Realtime callbacks after cleanup.
- Handle thread lookup/creation failures instead of silently leaving the page loading.
- Enforce restricted-chat quick questions in the database trigger; unrestricted text and attachments require an active thread. Existing stored conversations are not modified.

## Verification

- Frontend checks cover inbox membership filters, searching, subscription cleanup, attachment encoding, repeated contact attempts, latest-message queries, confirmed/failed sends and thread activation.
- Database rollback checks create synthetic buyer, agent and outsider accounts. Confirm restricted quick questions, reject restricted free text/attachments, reject outsider reads/sends and forged senders, and accept active-chat ordinary text. All fixture writes roll back.
- RLS permits participants and authorized administrators; administrator access is intentional. Attachments use private storage and signed URLs.

## Limits

No customer messages were inspected and no live two-browser delivery call was performed. Realtime transport, microphone permissions, real file uploads and signed-media rendering still require an authenticated browser check. Contact filtering is conservative and cannot guarantee detection of obfuscated text, images or voice recordings. Typing notifications are best-effort. The load-earlier query expands its recent window and remains subject to the server's maximum row limit; full archival pagination is a future improvement.
