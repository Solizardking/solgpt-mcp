# Production audit — 2026-09-08

Status: not production-ready. The running Fly release serves all 53 public pages, but its selected Convex service returns 404 on the signed health route and `/readyz` returns 503. Do not remove this readiness failure or fall back to another database to make the check green.

## Verified

- Five Fly machines are started and passing liveness checks.
- 53/53 public pages return successful HTML on both the live deployment and the final local production build; public endpoint and anonymous Astra denial checks pass. Local `/readyz` correctly fails because database/Redis/Convex configuration is incomplete.
- App suite: 1,926 tests across 364 files pass. Convex suite: 26 tests across seven files pass. Inference diagnostic: three real-SDK local-server regressions pass, covering successful streaming/completion, a stalled provider, and credential reflection in errors.
- ESLint, application TypeScript and environment-file Git safety pass.
- The final production build after hardening passed, including 68 generated static pages and compiled Tailwind CSS verification. The separate inference script TypeScript check also passed.
- CLAWD public HTTPS inference passed through the real app provider: first token 673 ms, full stream 2,432 ms, correct non-streaming arithmetic response 440 ms. These are single-request observations, not load-test percentiles.
- CLAWD's configured local loopback endpoint failed; the public endpoint succeeded with the existing credential. Use `CLAWD_INFERENCE_BASE_URL=https://clawd-orin-8bit.fly.dev/v1 npm run check:clawd` when the local SSH forward is unavailable.

## Local changes in this audit

- Corrected the stale Hauhau endpoint expectation in the health test.
- Rejected malformed CLAWD messages, null text parts and blank questions explicitly.
- Inference diagnostics have bounded timeouts, first-token timing, content validation, credential-safe failures, and cleanup of the optional DNS dispatcher.
- RPC throttle configuration cannot deadlock on zero/invalid settings; capacity waiters no longer spin timers. Throttled/error bodies are cancelled and excessive Retry-After delays are capped.
- Live quote polling pauses in hidden tabs, aborts on cleanup, times out and prevents overlapping requests. A Chromium check against the final build observed zero quote requests during an 11-second hidden interval, an immediate request on visibility restoration, and no uncaught page errors.
- Added npm commands for Convex tests, inference diagnostic tests and live CLAWD verification.

The checkout already contained the CLAWD/NVIDIA/Bitdeer integration. Existing work was preserved. These audit changes have not been deployed.

## Convex deployment and data gap

The production deployment dry run for `mawd/solgpt`, `veracious-snake-356`, passes schema validation and typechecking. It proposes nineteen additive indexes with no index deletion. Signed health currently returns HTTP 404 in approximately 97 ms, so increasing the readiness timeout would not fix it.

Read-only source inventory:

| PostgreSQL table | Records |
| --- | ---: |
| phantom_users | 5 |
| automations | 0 |
| mpp_subscriptions | 0 |
| gallery_objects | 0 |
| wallet_usage_events | 67 |
| wallet_usage_totals | 8 |
| api_keys | 0 |
| llm_gateway_api_keys | 2 |

The target desk tables are empty. Convex contains two API keys and one gateway key. The two legacy gateway hashes do not match the target key; neither legacy row has a wallet, and one is active. Preserve their subject IDs and revocation state; do not invent wallet ownership.

The eight usage groups reconcile exactly between events and legacy totals; all five profiles satisfy the new identity format. Before enabling the missing endpoints: take recoverable backups, preserve the five stable wallet identities, migrate usage events/counters without changing timestamps, and preserve gateway subject IDs and revocation state. Recheck the source counts and coordinate writes for the final copy. The [cutover checklist](CONVEX-CUTOVER.md) records preservation invariants. No database records, keys or historical ownership were changed during this audit.

## Verification still required

- Complete the Convex data reconciliation/deployment and verify signed health, real identity lookup, usage totals and key behavior.
- Verify a signed-in holder journey and a non-holder denial in a real wallet session; no wallet signature or transaction was requested in this audit.
- Run representative authenticated staging load to establish concurrency/latency limits. Passing page fetches and one inference request do not establish capacity.
- Live rechecks from production confirm Bitdeer HTTP 402 and Birdeye HTTP 403. Resolve quota/account access with those providers; configuration presence does not prove valid credentials or available quota.

## Supplied configuration

The supplied attachment has 260 settings. Values were compared in memory and never included in this report. It was not copied wholesale into `.env.local` or production.

Useful local additions include database/Redis configuration and the optional providers the local app needs: Composio, Firecrawl, ElevenLabs, FAL, Orgo, Pipedream and CoinGecko. These key names are already configured in production; that is presence evidence only.

The attachment supplies consistent production Convex URLs, but does not supply `SOLGPT_CONVEX_SERVICE_SECRET`. That signing secret is also absent locally and is present on Fly. Adding only the Convex URL would select a backend that local authenticated operations cannot access. Complete backend deployment and matched signing configuration together.

Preserve the current CLAWD URL/key, session secret, Telegram webhook secret and Telegram bot username: the attachment does not supply them. Multiple supplied authentication/provider values differ from the local configuration, including Better Auth, Telegram, Phantom, OpenAI, OpenRouter, Helius and xAI. Do not overwrite them merely because a value is present. The supplied Hauhau endpoint also differs from the current app default.

`CONVEX_DEPLOY_KEY` is a deployment credential, not an application runtime secret. Generic variables such as `USER` and `URL`, and unrelated Vite/provider settings, should not be imported indiscriminately. See the companion environment report for key-name-only details.

## Dependency hardening follow-up

The [dependency review](DEPENDENCY-SECURITY-2026-09-08.md) records scoped `fast-uri`, `qs` and TOML updates and a pinned JS-only bigint runtime mitigation. The advisory inventory fell from 62 to 59 affected package entries (high: 7 to 4); the remaining bigint advisory is retained explicitly. Full app tests still pass after the updates. Production deployment approval remains pending.

Final hardening artifact validation passed: all 53 pages and anonymous access checks passed from a standalone copy outside the repository; its unconfigured readiness check correctly returned 503. The built-output gate verified no bigint native loader in 5,933 server JS files. See the dependency review for retained advisories and scope.
