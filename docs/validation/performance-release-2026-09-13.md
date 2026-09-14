Performance update deployed to https://solgpt.trade on September 13, 2026.
Final deployment: `dpl_7yJQXCeuXNQBgm6V8RZAxDxStqgw` (`sol-j0pbtzet0-clawd-c4b28c7e.vercel.app`).

Changes:

- Load market research only when its disclosure is open; close its stream and cancel outstanding requests when it unmounts.
- Load the token rail only at desktop widths, and unmount the trending ticker on mobile.
- Prevent overlapping token polls and abort requests when their panels unmount.
- Skip the full telemetry SDK when no OTLP endpoint is configured. `OTEL_ENABLED=true` retains explicit no-collector instrumentation; configured telemetry and automation scheduling remain enabled.
- Stream a lightweight loading state during route navigation.
- Anchor the root `integrations`, `clawd-bot`, and `hauhau` upload exclusions so matching application routes ship to Vercel. All 1,114 source files passed the upload-rule check.

Verification:

- Vercel production build and CSS verification passed; final deployment promoted successfully.
- All 56 page routes returned successful HTML responses after promotion, including `/fly`, `/fly/exhibit`, and `/integrations/pipedream`.
- `/healthz` returned 200, Trickshot tokens returned 200, invalid history input returned 400, and anonymous Astra batch access returned 401.
- Browser checks on the final promoted release passed at 04:43 UTC. Sampled initial API requests fell from 13 to 9. Collapsed research made zero quote/stream requests. Opening research started both; closing it stopped polling. The disclosure retained its visible state across full-screen mode. Tablet and mobile panels unmounted correctly, with no uncaught JavaScript errors. These are request-work measurements, not a reliable general page-latency benchmark; the local machine was heavily loaded.
- ESLint passed for the changed TypeScript files.
- Focused tests: 30 passed, one stale sidebar-route expectation failed after `/fly` was added concurrently.
- Initial full suite: 1,956 passed, 50 failed, 10 skipped, three worker errors. Failures included timeouts, sandbox listener restrictions, missing desktop/mobile files, local environment duplication, and source assertions. The research-component source assertion was subsequently corrected. This was not a clean full-suite result.
- Broad local lint/type-check/build jobs stalled and were stopped. The remote build passed, but comprehensive type checking remains unverified because the existing Vercel configuration skips it.

Production blockers remain:

- Both the previous and updated deployments report absent Convex/Postgres, Redis, Telegram, and Privy runtime configuration, despite the expected variable names appearing in project and deployment metadata. `/readyz` returns 503.
- The three anonymous chat checks return 503 instead of the expected access-denial response. Authenticated chat and trading were not proven.
- The token API returns HTTP 500; function logs identify `rate_limit_redis_not_configured`. The browser displays this data-fetch failure without an uncaught exception.
- Automatic approval review rejected downloading production secret values into a local file. Only metadata and public readiness were compared; credentials were not repaired or replaced. Explicit authorization is needed before accessing existing production secret values for the next diagnostic step.

The performance deployment is complete. The broader production-readiness goal remains open.
