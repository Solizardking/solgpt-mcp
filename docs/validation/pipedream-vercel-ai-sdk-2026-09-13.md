# Pipedream Connect and Vercel AI SDK

Configured production project `proj_mJsz29B` in workspace `o_VRIwkLy` with webhook `https://solgpt.trade/hook/pipedream`. Pipedream's project webhook API already reported that exact URL. Saved the supplied OAuth credentials and webhook signing key as Vercel production secrets, with production environment and allowed SOL-GPT origins. Secret values are excluded from this report and source.

The new `/hook/pipedream` route uses the existing raw-body HMAC verifier. The original `/webhook/pipedream` route remains available. The `.trade` domain resolves to the production Pipedream environment.

Chat already calls Vercel AI SDK `streamText`, converts UI messages, and bounds tool steps. Pipedream now uses the compatible `@ai-sdk/mcp@0.0.33` adapter's `experimental_createMCPClient` and `client.tools()`. Chat discovers tools per app and invokes only advertised tools, scoped to the verified wallet. Each operation closes its client in `finally`; failed initialization closes its transport. Tool execution forwards cancellation and applies a 30-second timeout.

Connection tokens and signed trigger webhooks are separate Pipedream mechanisms. This receiver verifies signed trigger deliveries; account connection flows continue through the existing SDK frontend and user-scoped token endpoint.

## Verification

- Pipedream OAuth exchange: passed.
- Production Connect token and hosted Connect Link creation: HTTP 200, using a short-lived smoke token; no third-party account connected.
- Real Pipedream MCP discovery through the new Vercel adapter: 12 executable Notion tools discovered. No account actions executed.
- Focused tests: 18 passed, including wallet isolation, client cleanup, schema forwarding, advertised-tool enforcement, token identity, and HMAC checks.
- Lint of changed modules and adapter tests: passed.
- Live webhook: configuration HTTP 200; valid signature HTTP 200; missing, tampered, and expired signatures HTTP 401.
- Live integration page and `/healthz`: HTTP 200. Anonymous token creation: HTTP 401.
- Deployed page smoke: all 59 pages passed; public chat returned HTTP 200 with streamed text. The only reported failure was `/readyz`.
- Full type check after the adapter change: only the same missing iOS sync import was reported.

## Wider application limitations

Before the final SDK deployment, `/readyz` already returned HTTP 503 with Convex, Telegram, and Privy configuration absent. This Pipedream setup does not configure those services.

The broad local test run had 379 passing and 14 failing files (2033 passing, 16 failing, 10 skipped tests). Failures include missing desktop/iOS checkout files, existing documentation/voice assertions, and sandbox-denied local sockets. The initial full type check failed on the missing iOS sync module imported by `src/lib/solgpt/ios-env-sync.test.ts`. Vercel's existing build configuration skips the type-check pass; a successful build is not a claim that all repository checks pass.

References: [Pipedream webhooks](https://pipedream.com/docs/connect/webhooks), [Pipedream with Vercel AI SDK](https://pipedream.com/docs/connect/mcp/ai-frameworks/vercel-ai-sdk).

## Final deployment

Vercel production build `https://sol-ad0eu8gu8-clawd-c4b28c7e.vercel.app` completed and was aliased to `https://solgpt.trade`. Post-promotion webhook configuration, valid/invalid signature checks, integration page, anonymous token rejection, and health checks all passed. The existing readiness 503 remains.

Final post-deployment page smoke: all 59 pages passed, and public chat returned HTTP 200 with streamed text. `/readyz` was the only failure. Vercel inspection confirmed deployment `dpl_FPPkryQJfaVQXUMSUGd61n754yvp` is Ready and serves `solgpt.trade`. Temporary setup files containing the supplied signing key were removed.
