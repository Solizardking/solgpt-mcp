# SOLGPT release and domain migration — 2026-09-05

Status: **approved rollout in progress; provider validation partly blocked**. DNS/TLS and production Convex are ready. The Fly web image is building. Provider callback registrations remain unchanged.

## Current public desk (2026-09-12)

The linked Vercel project is `clawd-c4b28c7e/sol-gpt` (`prj_00lwKwajpUDfoodnfPejwKjwBAfs`). Live aliases:

| Host | Provider | Status |
| --- | --- | --- |
| `solgpt.trade` | Vercel (`ce36ee1b610ab3e7.vercel-dns-017.com`) | Production desk |
| `www.solgpt.trade` | Vercel | Same deployment |
| `solgpt.us` | Mixed Fly `66.241.125.205` + Vercel anycast | Not this project. Fly TCP-resets; Vercel IPs return `DEPLOYMENT_NOT_FOUND` |

Do not attach the `.us` apex to this Vercel project unless a DNS cutover is explicitly approved. Cutover steps if that is wanted later:

1. Remove Fly A `66.241.125.205` from the `.us` zone.
2. In Vercel project `sol-gpt`, add the `.us` apex and optional `www`.
3. Point apex/www at the Vercel DNS targets Vercel shows for those domains (or the existing `*.vercel-dns-017.com` CNAME pattern used by `.trade`).
4. Keep `tricks` and webhook hosts on their current targets until those apps are moved.
5. Rebuild/redeploy so public-origin / Better Auth / Privy allowlists include the new origin.

## Verified infrastructure

- Fly app: `solgpt`. Cloudflare zone: `solgpt.trade` (active).
- Added the apex hostname to Fly and created A, AAAA, ACME CNAME, and ownership TXT records. Existing `gateway.solgpt.trade`, mail, and verification records were preserved.
- Fly now reports the certificate **Ready**, with active RSA and ECDSA certificates expiring 2026-12-04.
- `https://solgpt.trade/docs`, `/openapi.json`, `/healthz`, and `/readyz` all return HTTP 200 with certificate verification. The check pinned the hostname to its published Fly A record because the machine's resolver still cached the previously missing apex. Google public DNS independently returned the correct A and ACME records.
- Existing `.us` docs/spec/health/readiness endpoints return 200. Readiness confirms Postgres and Redis connectivity; configured-provider flags are not credential authentication tests.

| Type | Name | Content |
| --- | --- | --- |
| A | `solgpt.trade` | `66.241.125.205` |
| AAAA | `solgpt.trade` | `2a09:8280:1::17a:7f3a:0` |
| CNAME | `_acme-challenge.solgpt.trade` | `solgpt.trade.1p28qj2.flydns.net` |
| TXT | `_fly-ownership.solgpt.trade` | `app-1p28qj2` |

TTL 300, proxying disabled. Created record IDs are saved in `docs/validation/release-dns-2026-09-05.json` for review and rollback. Certificate and direct HTTPS evidence are in `release-certificate-2026-09-05.json` and `release-trade-origin-2026-09-05.json` in the same directory. Initial normal-resolver failures were preserved in the earlier report. The latest check now passes all eight endpoints on both domains with normal DNS.

## Application preparation

- The deployed `/docs` was blank despite HTTP 200: Scalar loaded but its API reference never mounted. The fix explicitly initializes Scalar, destroys it on navigation, and avoids duplicate automatic mounting. Browser verification of the local app showed one populated API reference, the `.us/docs` canonical URL, and no wallet onboarding.
- Docs now include API-key guidance, a bundled OpenAPI download, dedicated metadata, and a sitemap entry. The OpenAPI server list includes `.trade` alongside `.us` and same-origin.
- Better Auth's local allowlist includes `.trade` and `www.solgpt.trade`; Privy's local origin list includes `.trade`. Provider dashboard allowlists still require configuration.
- Telegram's default callback now follows the configured app origin, matching LiveKit and ElevenLabs. Explicit overrides remain authoritative so callbacks can migrate one provider at a time.
- API-key storage now calls the existing signed Convex HTTP service contract instead of trying to call private database functions through a public client. The transport signs the method, path, exact body hash, timestamp, and fresh nonce; redirects are rejected. It supports the existing `CONVEX_ACTIONS_URL` setting and `CONVEX_SITE_URL`.

## Convex production rollout

Target: **production `veracious-snake-356`**, shared backend. The user explicitly approved deployment and secret configuration.

- Created distinct `SOLGPT_CONVEX_SERVICE_SECRET` and `CLAWD_GATEWAY_CONVEX_SERVICE_SECRET` values in local configuration and production Convex. The SOLGPT secret is staged on Fly for the web deployment. No gateway consumer uses this service secret in the current Rust source; its value remains available for that consumer's future integration.
- Deployment dry run and all nine backend service tests passed. Production deployment completed without deleting indexes.
- Live isolated test passed create/list/verify/touch/revoke, replay rejection, invalid-signature rejection, and revoked-key denial. The temporary key was revoked. Evidence: `docs/validation/release-convex-live-smoke.json`.
- Convex 1.45.0 and Vitest 4.1.10 match the lockfile following `npm ci --legacy-peer-deps`.
- The current gateway-key service additions were subsequently typechecked, tested, and deployed to match the web release. Its isolated live create/list/verify/touch/revoke and revoked-key-denial checks pass; evidence: `release-convex-gateway-live-smoke.json`.

## Release checks

- The final production app build passed after locked dependency restoration and the actions-URL alias addition: compilation, lint, TypeScript, static page generation, build traces, and compiled Tailwind verification.
- Full application/MCP suite after repairing stale contract checks: **1,761 passed, 1 failed** across 335 files. The sole failure is the real `.env.local` duplicate-assignment gate; it was not skipped.
- Updated tests retain the committed admin-only page policy, verify APIs in their actual panel components, exercise each dynamic FAL setting through its resolver, and verify OpenRouter preference plus direct OpenAI fallback for non-batch Astra. Current OpenRouter attribution is `https://solgpt.us`.
- Locked dependency restoration completed with `npm ci --legacy-peer-deps`; installed Convex 1.45.0 and Vitest 4.1.10 match the lockfile. Backend TypeScript and all nine service tests pass. Environment-file Git safety passes.
- The Docker packaging script now requires `go-bot/go.mod` before rebuilding the bot archive. A reproduction with only `go-bot/.env.example` correctly retains the full 848-file prebuilt archive.
- Current TypeScript checks pass. The remote image build encountered memory exhaustion; deployment awaits a successful image build.
- Local browser docs pass. A pre-existing development hydration warning from Telegram setting root viewport styles before hydration remains separate from the docs mounting fix.

## Environment cleanup and provider results

Eight duplicate assignments were removed after validation, with a mode-0600 backup outside the repository. `release-env-verified-cleanup.json` records the backup and original line numbers. Nine repeated names remain; see the current value-free inventory in `release-env-audit-2026-09-05.json`.

- Both Firecrawl credentials passed the credit-usage endpoint; retained the effective later value.
- Both identical RPC URL pairs passed `getHealth`; retained their effective values.
- The RPC WebSocket passed `slotSubscribe`; its identical duplicate was removed.
- All six Astra model assignments passed the shipped resolver; retained one of each model setting.
- The earlier Telegram bot token passed `getMe`; the later overriding token returned 401. Removed the invalid later assignment, restoring the authenticated token locally. Production bot-token configuration has not been changed.
- Solana Tracker data credentials returned 403, `Insufficient credits for this request`. ACCESS_KEY aliases returned invalid-key errors. Stream keys completed handshakes but closed before delivering a public SOL price subscription. These settings remain intact pending restored service or replacement credentials.
- Both Telegram OAuth client pairs returned `invalid_grant` for an intentionally invalid authorization code. This does not establish client validity or a successful login, so both pairs remain pending a real login check. Telegram requires registered origins and redirect URLs in BotFather; see [official login documentation](https://core.telegram.org/bots/telegram-login).

The original automatic approval rejection was resolved by the user's explicit approval. Read-only tests send credentials only to their fixed provider destinations and log status metadata. No provider subscriptions were created, callbacks migrated, or messages sent. All effective environment values except the repaired Telegram bot token were preserved during cleanup.

```sh
node scripts/release-env-audit.mjs .env.local docs/validation/release-env-audit-2026-09-05.json
node scripts/release-domain-smoke.mjs
node scripts/release-webhook-smoke.mjs
# Live credentials were explicitly approved for this release:
node scripts/release-credential-smoke.mjs --live
```

## Webhook destinations

All 15 routes and aliases passed unsigned-request rejection on `.trade`, with no redirects or missing configuration. This proves routing and the authentication boundary, not provider-generated delivery or downstream processing. Evidence: `release-webhooks-live-smoke.json`. All paths below have handlers in `src/app`. Prefix target paths with `https://solgpt.trade` after DNS/TLS is ready. Hosting preparation does not update provider registrations automatically.

| Provider | Target path | Configuration / migration action |
| --- | --- | --- |
| Telegram | `/api/telegram` | `SOLGPT_TELEGRAM_WEBHOOK_URL`; use authenticated operator setup / Bot API setWebhook, retain webhook secret, verify getWebhookInfo without dropping pending updates |
| LiveKit | `/livekit/webhook` | `LIVEKIT_WEBHOOK_URL`; update LiveKit dashboard; `/api/livekit/webhook` remains an alias |
| ElevenLabs | `/api/voice/elevenlabs/webhook` | `ELEVEN_LABS_WEBHOOK_URL` or `ELEVENLABS_WEBHOOK_URL`; update provider subscription, retain signing secret |
| OpenAI realtime | `/api/openai/realtime/webhook` | Update OpenAI dashboard subscription; retain `OPENAI_WEBHOOK_SECRET` / signing-key alias; `/webhook` remains an alias |
| Firecrawl Z500 | `/api/z500/webhook` | `FIRECRAWL_WEBHOOK` / `FIRECRAWL_WEBHOOK_URL`; update existing monitor registration; `/firecrawl` and `/api/firecrawl/webhook` remain aliases |
| Firecrawl leaderboard | `/firecrawl2` | `FIRECRAWL_WEBHOOK2`, `FIRECRAWL_URL2`; update monitor registration; `/api/leaderboard/webhook` remains an alias |
| Composio | `/api/composio/triggers` | `COMPOSIO_URL`; update existing subscription, retain signing secret and subscription ID; avoid creating a second active subscription |
| Pipedream | `/webhook/pipedream` | `PIPEDREAM_URL`; update existing webhook registration and retain signing secret |
| Honcho | `/honcho/webhook` or `/honcho/webhook/[agent]` | Update each registered provider URL, retain `HONCHO_WEBHOOK_SECRET` and the agent path |

Firecrawl, Composio, and Pipedream have explicit/hardcoded defaults separate from the shared public-origin resolver; change their listed variables explicitly. Check `fly.toml`, `.env.local`, and provider dashboards for old URLs before each migration.

## Production rollout after approval

1. Coordinate required service secrets on production Convex and the corresponding Fly consumers; deploy the reviewed shared Convex bundle with existing data preserved. Verify signed service operations and invalid-signature/replay rejection.
2. Deploy the reviewed web application using its current production origin first. Check the interactive `/docs` page and API-key creation, authentication, and revocation, not only HTTP status.
3. Register `.trade`, `/auth/callback`, `/redirect`, and `/authorize` in the relevant Phantom/Privy/Better Auth/OAuth dashboards; verify a fresh login. Host-scoped sessions will not transfer automatically.
4. Change the intended origin group together: `SOLGPT_PUBLIC_URL`, `PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, and callback variables. Rebuild for `NEXT_PUBLIC_*` changes. Keep `fly.toml` and deployed secrets consistent.
5. Update one existing provider registration at a time using the table above. Preserve signing secrets and subscription IDs; avoid duplicate active subscriptions. Confirm provider-generated test delivery, signature rejection, and downstream idempotency where supported.
6. Keep `.us`, `hooks.solgpt.us`, and `tricks.solgpt.us` serving direct webhook POSTs during migration. Do not rely on redirects. Retire old callbacks only after retries and pending deliveries are drained.
7. Roll back by restoring each provider's old callback and the previous app origin/image. Retain both domains and signing secrets throughout the rollback window.

References: [Scalar initialization](https://scalar.com/products/api-references/integrations/html-js), [Cloudflare DNS API](https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/create/), [Fly custom domains](https://fly.io/docs/networking/custom-domain/), [Convex environment configuration](https://docs.convex.dev/production/environment-variables).
