# SOL-GPT source audit and Railway deployment — 2026-09-13

Status: approved Railway runtime deployment complete; final Vercel runtime rollout and remaining web checks in progress.

## Validated web snapshot

- Root suite: 391 files passed; 2,059 tests passed; three optional native-checkout suites / nine tests skipped because `sol-gpt-ios/` and `src-tauri/` are absent.
- TypeScript, src ESLint, diff whitespace, and environment-file Git safety passed.
- Repaired the local Better Auth Zod dependency using the existing postinstall script.
- Updated stale ticker/navigation/voice tests and voice/route documentation. Increased the real archive-download test timeout to 20 seconds after its 5-second timeout was reproduced.
- Removed duplicate local environment assignments only after both Node and project parsers proved every effective value unchanged. No credential values were printed.
- The web typecheck now defers optional native imports until those checkouts exist. A present but incomplete native checkout still fails its tests.
- Preserved the pre-existing Pipedream adapter/schema work and unrelated deletions.

Vercel deployment: `dpl_8TZWXK2KGpqUqPUATUDWVHUy2yMP`.
Deployment URL: https://sol-duttsv3lv-clawd-c4b28c7e.vercel.app
Production alias: https://solgpt.trade
Public Vercel alias: https://sol-gpt-five.vercel.app

The source snapshot passed validation before upload. The shared workspace subsequently advanced through commits and received additional auth/trading edits, including a new `/trade` page. Those later changes were not part of this deployment or the reported passing suite.

## Live web checks

- The 59 pages from the deployed surface returned valid HTML. `/trade`, added locally after the upload, returned 404 in the later source-discovered page smoke.
- Five browser surfaces (`/`, `/wallet`, `/brain`, `/integrations/pipedream`, `/webmcp`) loaded without page errors.
- `/healthz` returns 200. Forty bounded read-only ingress probes passed. Invalid mint and unauthenticated Astra batch checks returned 400 and 401 respectively.
- `/readyz` still returns 503: production reports missing Convex, Telegram and Privy configuration. Postgres and Redis connectivity pass. The local Convex signed health probe passes.
- Full chat smoke timed out after 120 seconds; Vercel logged a matching runtime timeout. A bounded check on the public Vercel alias opened an SSE response but did not produce text within 45 seconds. Chat is not certified working.
- Native WebMCP passes on the public Vercel alias: eight tools including `health` and `list_pages` execute successfully. The custom domain serves a different bridge and MCP catalog (`factory_*`, `solana_*`, `stonk_*`), so the source-specific native smoke fails there. This routing mismatch is not repaired by a Vercel source redeploy.
- The immutable Vercel deployment URL itself requires Vercel authentication; public browser tests use the public aliases.

## Railway

Project: https://railway.com/project/050eccec-ae63-491b-8cd4-c80ca4f18506
Environment: production (`eaea31cb-222b-4cca-9697-0f642750f292`).

| Service | Service ID | Uploaded deployment |
| --- | --- | --- |
| LiveKit | ba7cfed1-4804-43bc-b021-a703f9e421e4 | a872d9b1-c6ad-4836-b215-aa86fcca07b5 |
| LLM gateway | 1d10fb1d-7d65-4f62-b3d2-776db41185d2 | 9aee4a43-dbbe-4caf-ac44-0fe01037e768 |
| Pump MCP | 72fb8b44-12ba-47b7-b0c0-503c2de73192 | 0ba815a9-e38a-4cd4-8510-6c5830e584f5 |
| MCP client | 3737d102-1f20-462c-9e3f-7e1bcb60ac48 | 91d3b010-5b91-4455-8aab-adb6a34923a2 |

All four Docker images built from explicit source-only contexts under `/tmp/solgpt-railway-src`. No environment files, credentials, local databases, dependency directories or virtual environments were uploaded. The final Pump context includes all 24 required documentation files.

LiveKit has 35 passing tests. Gateway has 16 passing Rust tests, clean Clippy, and a passing temporary-Postgres/mock-provider integration covering readiness, migrations, auth/revocation, catalog, JSON, SSE termination/no replay, validation, SQL quoting and rate limits. MCP client has eight passing tests including exact endpoint credential isolation; the server typecheck and its tests in the root suite pass.

LiveKit checks `/` on port 8081; gateway checks `/readyz` on port 3000; MCP checks `/health` on port 8080. A 5 GB Railway volume `mcp-access-data` is mounted at `/data`. This is new storage; old Fly SQLite access records have not been migrated.

MCP client runs as an on-demand `--tools` job with restart policy NEVER, without a public port, scheduled runs, inference or unattended tool actions. It requires its exact Pump endpoint and dedicated Pump token. The client now allows the exact configured HTTPS `/mcp` endpoint and the current solgpt.trade desk domain, with no wildcard trust for Railway hosts.

Runtime logs confirm missing LiveKit keys and MCP HTTP token; the gateway has not received DATABASE_URL/provider keys. The client logged `Fatal error: fetch failed`. Railway initially labeled that deployment SUCCESS, which is not evidence of a successful MCP job.

The gateway's namespaced key and rate-limit tables already exist in the current web Neon database, verified read-only. The proposed configuration reuses that database without a demo seed key. No schema or key mutations were performed by the audit.

## Approvals required

Automatic approval review rejected:

1. Copying existing local Convex, Telegram and Privy credentials to Vercel production because exporting those credentials to that destination required explicit approval.
2. Creating a public Railway gateway domain because public internet exposure required explicit approval.

The pending Railway approval also covers transferring only the credentials in `railway-runtime-env-2026-09-13.json` to their named services, and public HTTPS domains for the gateway and MCP server. LiveKit and the CLI remain private. No rejected action was retried through another route.

Vercel repair scope: CONVEX_SITE_URL, SOLGPT_CONVEX_SERVICE_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CLIENT_ID, TELEGRAM_CLIENT_SECRET, PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_CLIENT_ID, and a Privy session secret from the existing local SESSION_SECRET. Values remain server-side and are not part of this report.

After approval: apply the exact allowed configuration, deploy again, verify readiness and authenticated service behavior, verify the CLI job, and investigate remaining chat latency and custom-domain WebMCP routing. Wallet signing, third-party account actions, Telegram messaging and data migration were not performed.


## Approved runtime activation

The user explicitly approved credential transfers and public HTTPS endpoints. All present allowlisted Railway values were applied via stdin with values excluded from output. Vercel Convex, Telegram and Privy credentials were reapplied successfully.

| Service | Activated deployment | Verified behavior |
| --- | --- | --- |
| LiveKit | e68c98c7-a5b8-4d2c-9bc0-6686b31b72c5 | Healthy; registered worker solgpt-voice-prod-v2 with LiveKit Cloud |
| LLM gateway | 1e4f8ed8-d9b0-4618-83d7-a5021390dbc4 | Readiness 200; unauthenticated models request 401 |
| MCP server | 4a194e0a-bf87-432b-9c47-0d3d9df202b2 | Health 200; anonymous MCP 401; authenticated discovery 40 tools; get-program-ids executes |
| MCP client | 4c8c0f6f-f665-4ed6-abdb-da922f7a2b28 | Job logs confirm connection and discovery of all 40 tools |

Gateway: https://llm-gateway-production-12dd.up.railway.app
MCP: https://mcp-server-production-9738.up.railway.app/mcp

Vercel production LLM_GATEWAY_URL and SOLGPT_PUMP_MCP_URL now target these services. The configured Nemotron free model stalled in a direct 45-second probe. The OpenRouter free router produced a complete reply in 900 ms, so production OPENROUTER_FREEMODEL was set to openrouter/free. Final runtime rollout: dpl_2wMeE6WSsnCRyxHfX5JBYkzaZQyv (https://sol-597ka8gnb-clawd-c4b28c7e.vercel.app), pending completion at this update.

The existing local gateway client key is rejected by production (401); no demonstration seed key was installed or holder key minted. Live gateway inference with an authorized holder key remains unverified. LiveKit registration does not certify a full voice conversation.

Latest source validation: 392 files passed, 2 failed, 3 skipped; 2067 tests passed, 2 failed, 9 skipped. The failures were stale assertions for the newly added /trade sidebar route and async DFlow confirmation timeout. Both corrected suites then passed all 24 tests. TypeScript and src lint passed. Further concurrent voice changes after this run are outside this evidence and outside the immutable runtime redeployment.


### Live credential repair result

Deployment dpl_9pcCKSkpUuTwUF14Ge9eQ3TqpFeE reached READY. Public Vercel alias /readyz now returns 200: Convex selected/configured/reachable, Postgres reachable, Redis reachable, and all Telegram/Privy presence checks pass. These presence checks do not send Telegram messages or exercise a user login.

The final runtime rollout is queued behind a different project building in the same Vercel team. The intermediate superseded deployment dpl_AqbrFo8YYAPxfM1qkxKaEiKNEfHW was canceled; no other project's deployment was modified.

Automatic approval review separately rejected exporting SOLGPT_PUMP_MCP_TOKEN to Vercel because the explicit prior Vercel transfer list excluded that token. An additional approval was requested; no token transfer was attempted by another route. Web-to-Railway MCP remains unauthenticated until this is approved and deployed. Custom-domain WebMCP route ownership was also asked because another app currently owns those paths.


### Railway voice end-to-end smoke

Passed with real providers and a verified synthetic microphone fixture: AssemblyAI transcribed "Please light the escape circuit in the fly brain", the brain tool stimulated the gf escape circuit, spoken confirmation was detected (158 audio samples), and microphone tracks were released. The temporary LiveKit room was removed. This test injects a server-minted token into the browser and does not certify the wallet/holder token route. Earlier runs used an accidentally empty sandbox-generated WAV and are invalid input evidence, not worker failures. Log: /tmp/solgpt-railway-voice-verified-smoke.log.


### Latest concurrent voice source review

The new LiveKit default voice tab and animated state passed TypeScript and lint. Corrected five unrelated provider setup hints that had accidentally been changed to request LiveKit keys (Firecrawl, E2B, Browser Use, ZAI, OpenAI). Relevant voice/configuration run: 14 files / 160 tests passed, with one stale default-tab assertion failing. Updated that assertion to expect LiveKit by default while retaining Deepgram; its nine-test suite passed. These source changes have not yet been included in the immutable runtime deployment.


### Committed source suite

Commit 4f6d91ac: full root suite passes, 394 files / 2069 tests, with 3 optional-checkout suites / 9 tests skipped. Evidence: /tmp/solgpt-committed-source-tests.log. The newer source deployment dpl_3RvjGtftjDiSsCkGmsw9vA5PEhye (https://sol-44yz0mqfd-clawd-c4b28c7e.vercel.app) supersedes the runtime-only rollout. Canceled only this task's older build dpl_2wMeE6WSsnCRyxHfX5JBYkzaZQyv to release its build slot; the latest source deployment remains the verification target.


## Explicit MCP-token approval and final repair rollout

The user approved SOLGPT_PUMP_MCP_TOKEN transfer to Vercel; it was installed successfully as a sensitive production variable. A separate attempt to change Cloudflare route solgpt.trade/mc* and purge cached WebMCP assets was rejected by automatic approval review because selecting this repository as the main MCP surface was not explicit. The exact routing approval was requested; no route or cache change occurred.

Resolved merge markers in .vercelignore, packages/browser-agent/package.json, packages/browser-agent/src/index.ts, gateway tests, and MCP-client tests. Preserved the real browser agent and hoop export, root-scoped ignore patterns, and the merged provider-attribution implementation. Removed a Vercel-only empty Deepgram alias so production retains the real voice implementation.

Added SOLGPT_BUILD_DIR support and ignored .next-validation-* outputs to isolate simultaneous local builds. The CSS verifier follows the same override. A diagnostic stack-property hook caused later split errors; it was removed. Disabling experimental memory optimization did not help and was reverted. With repaired source, a fresh isolated build using ordinary Error semantics completed: compilation, lint/type validation, 77 generated pages, tracing, and compiled Tailwind CSS verification passed. Log: /tmp/solgpt-inspector-build.log. Only failed diagnostic artifacts created by this task were removed to recover disk space.

Post-merge tests: 397 files / 2081 tests passed, one stale ignore-rule assertion failed, 3 suites / 9 tests skipped. Corrected the root-slash assertion; its five tests passed. Gateway: 16 tests passed. MCP client: eight tests passed. Build/configuration and instrumentation: nine tests passed.

Fresh production source deployment submitted with --force to bypass stale build cache: dpl_42BhhrxP3PLugfcvvEJfHeJm1Q4w, https://sol-ocatjf75b-clawd-c4b28c7e.vercel.app. Live verification remains pending deployment completion.


### Validated artifact browser and page smoke

The isolated production artifact passed a mobile Chrome check: voice animation present, zero LiveKit token requests before user action, no page errors, no horizontal overflow; /trade rendered normally. With OPENROUTER_FREEMODEL=openrouter/free, all 61 source pages returned valid HTML, /healthz and /readyz passed, invalid mint returned 400, protected Astra batch returned 401, and the public chat smoke returned text even with a stale premium model selection. No failures. Evidence: /tmp/solgpt-approved-local-pages.log.

Canceled two older unfinished production deployments for this same project (dpl_8HzfVw2CZNbdomheCqvk685kPJ5L and dpl_FUhLDtucfFgQDdgfFX4CcrMG4m2S) because the validated dpl_42BhhrxP3PLugfcvvEJfHeJm1Q4w supersedes them. Existing ready deployments and other projects were retained.


### Release-check repair

The first fresh rollout compiled, generated pages, and passed CSS verification, then failed in the newly introduced verify-no-bigint-native.mjs because it unconditionally scanned .next/standalone. Vercel intentionally emits serverless output without that directory. Updated the verifier to follow SOLGPT_BUILD_DIR and scan standalone only for non-Vercel builds; server output remains mandatory. Verified 925 server JS files in Vercel mode and 6393 JS files in standalone mode, with no native bigint loader. New deployment: dpl_CtDGbeef7hKh4krpShXMYueyHSSn, https://sol-czzq2y6jx-clawd-c4b28c7e.vercel.app. Temporary local smoke servers on 3472/3473 were stopped after passing checks.


## Final live release verification

Deployment dpl_CtDGbeef7hKh4krpShXMYueyHSSn is READY. All 61 pages, readiness/access checks and streamed public chat pass on solgpt.trade and sol-gpt-five.vercel.app. The web app authenticates to Railway MCP (40 tools, no error); its gateway readiness route returns 200. Native WebMCP passes on the Vercel origin. The remaining Cloudflare main-route decision is still pending exact approval. See production-railway-verified-2026-09-13.md for the current concise evidence and limits.
