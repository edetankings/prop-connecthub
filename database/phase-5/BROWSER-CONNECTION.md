# Connect the browser for approved A1 testing

A1 approval and the suitability of the existing buyer test account are confirmed. No further A1 permission is needed. Browser discovery currently returns no connected browser; A1 authenticated tests have not run.

1. In the ChatGPT desktop app open **Settings → Computer Use**. Select Chrome or Edge, installing the required browser plugin if prompted.
2. Select **Install** for that browser, install/enable the ChatGPT extension, then return to Computer Use. Confirm **Manage** appears and the browser toggle is enabled. Use the same browser profile where the extension was installed.
3. Mention that browser in the chat using the browser selector, for example `@Chrome` or `@Edge`, and allow access to the local application when prompted. If the browser is missing, expand **More browsers**. These steps follow the [official browser connection documentation](https://learn.chatgpt.com/docs/chrome-extension).
4. Open `http://localhost:8080/login` in that connected browser. The local server and served independent configuration were verified during the A1 preflight. If the server later stops, run `npm run dev` from the repository root and use its displayed localhost URL; do not change environment variables.
5. Sign in privately with the approved existing buyer test account. Do not send credentials, authentication tokens, recovery links or network captures in chat. Leave the app open and say **“Browser connected; buyer signed in; continue A1 only.”**
6. Do not dismiss a welcome modal, edit the profile, mark notifications read, open conversations, upload files or enter payment flows. If a welcome modal blocks navigation, report it; its acknowledgement writes welcome_seen and A1 does not authorize that.

If the extension is installed but not connected, restart the browser, confirm the same profile and **Manage** status, and retry. Official troubleshooting recommends restarting the desktop app or reinstalling the extension through Computer Use if connection still fails. Browser availability can also depend on workspace settings or rollout.

After connection, testing remains limited to A1. Login/logout and timestamp verification will be executed and reported without reading browser session stores or exposing credentials. A2 requires separate approval and will not run automatically.
