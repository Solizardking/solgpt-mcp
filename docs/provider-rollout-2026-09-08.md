# Provider rollout — 2026-09-08 UTC

SOL-GPT was redeployed at https://solgpt.us with image
`registry.fly.io/solgpt:deployment-01M1ZDP8XDK7K7JKCK8GYMMD3T`.
All five existing Fly machines passed rolling deployment health checks.

## Changes

- Added CLAWD Orin, NVIDIA NIM, and Bitdeer to the public provider catalog and desk model picker.
- Configured production CLAWD inference at `https://clawd-orin-8bit.fly.dev/v1`; its gateway token stays in Fly secrets.
- Updated NVIDIA, Bitdeer (`DEERPIT_API_KEY` alias), and Birdeye server credentials from the supplied local configuration.
- Added the provider variables to the deployment allowlist. Direct NVIDIA and Bitdeer chat no longer incorrectly require an OpenRouter key.

## Verification

- Full application TypeScript check passed; focused provider, model, chat, catalog, and environment tests passed.
- Production image compiled, generated all 68 static pages, and passed built CSS verification.
- `/`, `/inference`, `/healthz`, and `/api/inference` returned HTTP 200.
- Public catalog contains all three provider entries and their model IDs.
- Browser model picker visibly lists CLAWD · Orin Nano, Nemotron 3 Super (NVIDIA), and Nemotron 3 Super (Bitdeer).
- Orin inference from an updated SOL-GPT machine returned HTTP 200 with content; streaming returned valid SSE and `[DONE]`.
- Real local AI SDK calls through the public Orin endpoint passed for streaming and non-streaming.
- NVIDIA inference from production returned HTTP 200 with content after one transient 503.
- Hash comparisons on production machine `80e9e54a255928` confirmed the effective NVIDIA, Bitdeer, Birdeye, and Orin credentials exactly match the supplied local configuration; the Orin public URL also matches. No credential values were printed.
- Anonymous SOL-GPT Orin chat returned HTTP 403. Browser inference access required sign-in. A signed-in holder browser conversation was not tested.

## Outstanding external failures

- Bitdeer inference returned HTTP 402, `insufficient_quota`; its account needs credit.
- Birdeye returned HTTP 403 from production. The same supplied key returned `Access Denied` locally.

These failures prevent claiming every configured provider works. Orin and NVIDIA were verified independently; credentials are not automatically shared between providers.
