# SOL-GPT complete stack redeploy — 2026-09-09

Status: complete. All four hosted services are redeployed and healthy. The final completion smoke passes all 54 pages with zero failures, including `/readyz` HTTP 200.

## Scope

The root Next.js deployment includes all requested `src/` directories, instrumentation, and middleware. `mcp-client` is a locally built CLI, not a hosted service. The nested bot gateway is an optional Compose service with no separate Fly target in this checkout; its typecheck, rebuild, and all synthetic runtime regression checks passed.

## Deployments

| Service | Release | Image | Verification |
| --- | --- | --- | --- |
| Rust gateway | 15 | deployment-01M2382BV83CXPS2X3QZS7NK6D | Both machines started, readiness checks pass; authenticated catalog, JSON completion, and SSE text plus DONE pass |
| Pump MCP | 11 | deployment-01M238BTYFEZX9DXZAT0J1EXKM | Existing volume retained; health passes; rebuilt CLI lists 40 tools; authenticated tool calls and documentation reads pass |
| Telemetry | 3 | deployment-01M238BYTSBJ5ECZFFABEMNDX3 | Health passes; deployed collector configuration validates; fresh MCP and gateway spans visible in Jaeger |
| Main web | 179 | deployment-01M23847XWN17GS5TS866XV1Z1 | All five machines use the new image, are started, and pass health checks; release complete. Final 54-page completion smoke passes with zero failures, including readiness. Authenticated MCP discovery returns 186 desk tools and 40 Pump tools |

## Validation

- Gateway: 16 Rust tests pass; Clippy with warnings denied passes; temporary Postgres/mock-provider integration passes migrations, auth/revocation, catalog, JSON, SSE termination/no replay, validation, SQL quoting, and rate limits.
- Standalone MCP: 83 tests pass; typecheck passes.
- MCP client: rebuilt; all seven tests pass; live production CLI connection passes.
- Root suite: 1,987 of 1,989 tests pass in the final full run. The two failures were five-second timeouts under concurrent build load; both files subsequently pass with one worker (nine tests). Earlier stale attribution and Jupiter policy assertions were corrected to match the already-shipped production policy; no runtime policy was loosened.
- Root lint and TypeScript checks pass. The local production build ended with SIGTERM; the Fly production build passed, including all 69 static pages and the compiled CSS verification. Browser automation timed out twice, so visual browser verification is unavailable.
- Local MCP integration: 40 standalone tools, 48 private-tunnel tools, 186 desk tools, documentation execution, and unauthenticated rejection pass.
- The public `/gateway` rewrite passes health, readiness, and unauthenticated catalog rejection. Live gateway SSE passes with both the free router and the explicit NVIDIA free model. A separate Venice probe returned HTTP 402 and xAI returned HTTP 403; those provider access issues are not repaired by redeploying.

## Readiness resolution

The initial production readiness failure was a missing signed Convex service route on `veracious-snake-356` (HTTP 404). This agent prepared a successful additive deployment dry run, but automatic approval review rejected the mutation because `convex/` was outside the explicitly enumerated scope. This agent did not perform that Convex deployment.

On the completion audit at 2026-09-09 14:33 UTC, production readiness had changed externally: Convex was selected, configured, and reachable, and every readiness check passed. A fresh complete page smoke then exited successfully with 54 pages and zero failures. No additional Convex approval is needed to complete this redeploy. Historical data migration was not assessed or claimed.

The completion audit also confirmed web release 179 on all five machines, gateway release 15 on both machines, MCP release 11, and telemetry release 3, with all machines started and every configured health check passing.

## Build transport

Legacy Fly builder uploads stalled; HTTPS fallback failed with an h2c upgrade error. Automatic approval review rejected Depot because it would send source to a third-party builder without explicit permission. Deployments succeeded using Fly BuildKit with `--remote-only --buildkit --depot=false`. The existing unrelated builds were not stopped or modified.

Raw validation logs are local under `/tmp/solgpt-redeploy/`; they are not committed.
