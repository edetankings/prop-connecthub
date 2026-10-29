# Prop Connect AI activation

## Current state — 29 October 2026

The authenticated `prop-ai` Edge Function is deployed to the independent Supabase
project `prtrpywkwmnpowrthppg`. The approved production browser origin is
`https://propconnect-vine.vercel.app`; local development origins are supported by
the shared CORS helper. Provider calls remain disabled pending provider selection
and a private provider API key. No AI provider key is stored in browser code.

The app exposes Prop Connect AI in the buyer, agent, builder, and administrator
navigation. Admin prompts follow assigned administrator privileges; builders use
professional prompts. The function independently verifies authentication and roles.

## Required server configuration

In the verified project's Supabase dashboard, open Edge Functions → Secrets:

| Secret | Purpose |
| --- | --- |
| `AI_API_KEY` | Private API key for the selected provider |
| `AI_CHAT_COMPLETIONS_URL` | Provider's exact HTTPS chat-completions endpoint |
| `AI_MODEL` | Model identifier supported by that provider and key |
| `AI_ENABLED` | Set to `true` after the other values are configured |
| `ALLOWED_ORIGINS` | Comma-separated approved HTTPS frontend origins |

The provider must support streamed, OpenAI-compatible chat-completion responses.
Provider/model selection has not yet been supplied. Keep the API key private; do
not paste it into chat, add it to a `VITE_` variable, or commit it to Git.

The Supabase URL and public anon key are supplied automatically to the function
runtime. They are separate from the external AI provider key.

## Validation after activation

1. Sign in and open `/ai-assistant`.
2. Ask a short platform question and verify that an answer streams to completion.
3. Search for a property and confirm only real approved listing links are returned.
4. Check administrator and professional prompt choices for the corresponding account.
5. Confirm unauthorized requests are rejected and provider errors are clearly shown.

Navigation, administrator/builder prompt selection, session failures, and streamed
responses are covered by focused frontend tests with mocked services. These tests
do not prove live provider billing, quota, or response behavior.
