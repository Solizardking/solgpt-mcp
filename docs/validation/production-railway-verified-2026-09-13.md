# Production and Railway verification — 2026-09-13

## Released

Vercel production deployment: `dpl_CtDGbeef7hKh4krpShXMYueyHSSn`.
Immutable deployment: https://sol-czzq2y6jx-clawd-c4b28c7e.vercel.app
Production domain: https://solgpt.trade
Public origin alias: https://sol-gpt-five.vercel.app

The explicitly approved `SOLGPT_PUMP_MCP_TOKEN` was installed as a sensitive Vercel production variable and is active in this release. Credential values were not printed or included in source uploads.

## Verified live

- All 61 source pages passed on both solgpt.trade and the public Vercel alias.
- `/readyz` and `/healthz` returned 200; Convex, Postgres, Redis and configured Telegram/Privy checks passed.
- Invalid mint returned 400; unauthenticated Astra batch returned 401.
- Public chat returned streamed text on both production hosts with the configured free router, including a stale premium model selection.
- `/api/health?live=1` confirmed an authenticated connection to the Railway MCP server with all 40 tools and no error.
- `/gateway/readyz` returned 200 through the deployed web app.
- Native WebMCP discovery and safe tool execution passed on the public Vercel alias.

Evidence: `/tmp/solgpt-approved-live-pages.log`, `/tmp/solgpt-approved-custom-domain-pages.log`, `/tmp/solgpt-approved-live-webmcp.log`, `/tmp/solgpt-final-live-build.log`.

## Railway

Project: https://railway.com/project/050eccec-ae63-491b-8cd4-c80ca4f18506

| Service | Verified result |
| --- | --- |
| livekit-agent | Healthy worker registration; real-provider synthetic voice smoke passed transcription, brain circuit tool action, returned speech, and microphone cleanup |
| llm-gateway | https://llm-gateway-production-12dd.up.railway.app/readyz returns 200; missing/invalid client credentials return 401 |
| mcp-server | https://mcp-server-production-9738.up.railway.app/health returns 200; authenticated discovery and read-only tool execution pass; anonymous MCP returns 401 |
| mcp-client | On-demand job connected to the Railway server and discovered all 40 tools |

The gateway's existing local client key was rejected, so live holder-authenticated gateway inference remains unverified. No holder key was minted for testing. Old Fly MCP SQLite records were not migrated into the new Railway volume.

## Source/build verification

- Clean committed-source baseline: 394 test files / 2069 tests passed, with three optional native-checkout suites / nine tests skipped.
- Following concurrent merge changes: 397 files / 2081 tests passed with one stale root-ignore assertion failing. After correcting it, its five-test suite passed. Gateway's 16 tests and MCP client's eight tests passed.
- Repaired committed conflict markers and preserved the real Deepgram implementation and hoop export instead of the empty stub.
- Isolated production build passed compilation, lint/type checking, page generation and tracing. Mobile browser smoke passed animation rendering, zero unsolicited voice-token requests, no page errors, and no horizontal overflow.
- Corrected the native-loader release verifier to match Vercel serverless versus local/Docker standalone layouts. Both actual build layouts passed; the remote release verified 923 server JS files with no native bigint loader.

## Approved Cloudflare routing change and remaining cache blocker

After explicit approval, the `solgpt.trade/mc*` route was updated to `script: null`, allowing this application's origin to handle the main MCP surface. Authoritative Cloudflare API verification confirmed the change. The gateway, `/plugin/mcp*`, and `/pump/mcp*` routes retain their existing Workers.

The approved targeted purge of `/.webmcp/bridge.js` and `/.webmcp/origin-trial.js` is blocked by Cloudflare authentication: the existing Wrangler OAuth session can manage routes, but the purge API returned HTTP 401, code 10000, `Authentication error`. No cache purge success is claimed. The domain still serves the old cached bridge and a 404 for the origin-trial asset, while the Vercel alias serves both released assets. The custom-domain native smoke reaches tool execution but fails its origin-trial-loaded assertion. Evidence: `/tmp/solgpt-final-domain-webmcp.log`. Completion requires a Cloudflare credential with Cache Purge permission for this zone, or manually purging those two exact URLs in the Cloudflare dashboard.

Readiness/presence checks do not certify real Telegram messages, third-party login callbacks, holder-wallet login, funded trading, or every paid provider. Voice smoke used a synthetic microphone and a server-minted test token in an isolated room.
