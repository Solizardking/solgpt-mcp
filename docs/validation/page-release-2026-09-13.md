# Page release — 2026-09-13

The home-page promotional banner and its containing strip were removed. The existing flex layout gives the freed height to the chat transcript and token rail. Desktop and 390px mobile checks confirm no banner and no horizontal overflow.

## Local validation

- Production build: compilation, 87 generated outputs, and tracing completed.
- Compiled Tailwind verification passed; 5,178 built JavaScript files passed the native-bigint loader check.
- All 68 source pages returned valid HTML. Health/readiness passed; invalid mint returned 400 and anonymous Astra batch returned 401. Public chat produced streamed text. Log: `/tmp/solgpt-page-release-production-local.log`.
- Browser checks passed for all 68 routes; iframe pages were inspected through their frames. This verifies page rendering, not purchases, wallet signatures, holder login, or third-party live-video playback. Evidence: `page-release-2026-09-13/local-browser.json`.
- Initial full suite: 2,223 tests passed. After further shared-workspace updates, 2,226 tests passed with one real-archive timeout. The archive test passed all three checks after its timeout was raised to 60 seconds for the 400+ MB fixture. A local environment-file uniqueness check was excluded from that later run because another session was editing `.env.local`; optional native-checkout tests remain skipped.
- TypeScript passed; lint passed with two existing image-element warnings. Auth/build-configuration tests passed (11 tests).
- Better Auth's bundled Zod imports are pinned to the existing Zod 4 package alias, and prebuild runs the existing peer-dependency repair. This fixes the reproduced auth-route build error after concurrent dependency reinstalls.
- Page smoke discovery now includes routes hidden by ignore rules. Temporary Next build directories are excluded from Vercel uploads.

## Deployment

Source uploaded from an isolated, environment-file-free snapshot at `/tmp/solgpt-page-release-source` (initial source commit `fe67ac1c482ab39adafe2a99c3ed603172ba0857`, plus the validated build configuration repair).

- Deployment: `dpl_A7ie9dNZSp5sobZNetdsoGEw72kF`
- URL: https://sol-kraqv0mwy-clawd-c4b28c7e.vercel.app
- Target: production, `sol-gpt` project, `solgpt.trade` alias.
- Status: queued for the team's concurrent-build slot. Live verification pending.
