# Text CLAWD

Public line: **+1 (740) 877-3994**. Entry page: `https://solgpt.trade/blue`.

The existing receive URL `/hook/blue` is retained as an alias to `/blue/receive`. Duplicate callbacks share the same durable message-handle claim.

The page opens Messages with a selected starter and falls back to a copyable number. The desk/support CTA uses the same number. `/blue/contact` downloads a contact card.

## Message flow

Sendblue POSTs to `/blue/receive`; the Next.js endpoint verifies `sb-signing-secret`, bounds the body, validates the assigned line and ignores outbound/group events. It forwards through the existing signed Convex service transport. Convex atomically deduplicates by message handle and schedules the reply before acknowledging receipt. Phone-specific Agent threads persist conversations. Replies are limited to 30 inbound messages per phone per hour; STOP/START state is durable and checked immediately before dispatch.

The server sends typing start/stop for iMessage. CLAWD has read-only tools for `clawd-ws.fly.dev` Pump launches and DEX Screener Solana token pairs. Exact mints, observation times and unavailable fields are preserved. Texting grants no wallet or trading permissions. Metadata is untrusted model input.

Every outbound send includes `https://solgpt.trade/blue/delivery`. Delivery updates are persisted without downgrading confirmed delivery. Unknown send outcomes are recorded as `uncertain`, never automatically resent. Review the Sendblue dashboard before manually recovering one. Jobs interrupted while `processing` or `sending` require operator review; there is no automatic replay of these states. A conversation lock expires after five minutes so later messages can progress.

## Voice

Text `VOICE` in an iMessage conversation to receive the bundled synthetic CLAWD greeting. `public/blue/ClawdVoice.caf` is an 11-second, 48 kHz Opus CAF generated with macOS Samantha; regenerate with `sh scripts/make-clawd-voice.sh`. `SENDBLUE_VOICE_NOTE_URL` may override it with a public HTTPS `.caf` URL. `uploadVoiceNote` in `src/lib/sendblue/client.ts` uploads genuine CAF bytes to Sendblue's CDN. This is a prepared greeting, not per-answer speech generation; inbound audio is not transcribed.

## Configure

Next.js/Vercel needs `SENDBLUE_SIGNING_SECRET` and the existing Convex URL and `SOLGPT_CONVEX_SERVICE_SECRET`.

The Convex deployment `veracious-snake-356` needs:

- `SENDBLUE_API_KEY` and `SENDBLUE_API_SECRET` from the account that owns +17408773994.
- `OPENROUTER_API_KEY` for AI replies; optional `SENDBLUE_MODEL` (default `openai/gpt-4.1-mini`).
- Optional `SENDBLUE_VOICE_NOTE_URL`.

Keep all secrets server-side. The signing secret is the literal shared header value, not an HMAC signature.

After verifying the deployment, run `node --env-file=.env.local scripts/setup-sendblue.mjs` to review line ownership and webhook configuration, then add `--apply` to append the receive/outbound subscriptions without replacing others. Per-message status callbacks must carry the signing header too; if Sendblue does not attach it on that callback, the authenticated outbound subscription still records delivery. Check existing subscriptions before setting an account-wide secret.

A dedicated/eligible plan is required for arbitrary inbound users. Free shared-line plans require each contact to be verified. Confirm plan and line assignment in Sendblue before advertising unrestricted availability.

## Validation

`npx vitest run src/lib/sendblue/protocol.test.ts src/lib/solgpt/text-us.test.ts src/lib/solgpt/convex-service.test.ts`

`npx vitest run --config convex/vitest.config.ts convex/sendblue.test.ts`

`npx tsc --noEmit -p convex/tsconfig.json`

For a real end-to-end check, text HELP, a Pump question, VOICE, STOP, then START from a consenting phone. Confirm a single reply and delivery event, the CAF player, and no replies after STOP. Never use fabricated inbound payloads to trigger real SMS sends during testing.

## FaceTime and additional account capabilities

`/blue/call` is an admin-only microphone/Agora console. The public page explains availability; `/api/sendblue/facetime` requires a proven admin identity, same-origin request, recipient consent, and a durable request ID. Repeated call requests are refused; uncertain results are never automatically retried. The console releases microphone tracks on disconnect. “Leave audio” disconnects the browser; the provided API has no documented call termination endpoint.

Enable only after Sendblue confirms a purchased FaceTime line: set `SENDBLUE_FACETIME_ENABLED=true` and `SENDBLUE_FACETIME_FROM_NUMBER` in Vercel, together with the server-side Sendblue API credentials. This connects an operator microphone, not an autonomous voice model. No live call has been placed during setup.

The local MCP adapter uses the installed MCP SDK (the upstream package had a blocked remote dependency). It exposes five read-only tools for lines, limits, redacted webhooks, profile state and sandbox usage. The VS Code MCP configuration starts `scripts/sendblue-mcp.mjs`, reads the ignored environment file and exposes read operations. Do not expose account-management MCP, TOTP secrets/codes, sandbox exec, or line purchases to public text conversations.

The account's read-only sandbox usage probe reports `free_api`, $100 available and no existing sandboxes. No additional account, sandbox, authenticator secret or paid line was created. TOTP registration requires the target service's real enrollment URI/secret; creating an unrelated random secret would not configure that service's 2FA.

On 2026-09-13, the line-list endpoint returned +17408773994, but Name & Photo state returned HTTP 403 (“not authorized for this account”). Line provisioning preview also returned HTTP 403 (“only available for inbound_only accounts”). Upgrade/line permissions must be resolved in Sendblue; no purchase was made.
