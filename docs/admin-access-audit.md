# Access and popup audit

Scope: access overlays, automatic login/onboarding prompts, admin entitlements, and duplicate branding. Not a general code review.

## Changes
- Configured the requested admin wallet in local environment; production holder and Astra gates now honor configured admins after session verification.
- Reuse existing Privy authentication to restore the server session without opening a wallet modal.
- New admin Phantom logins use matching 30-day JWT/cookie expirations. Existing Privy session policy remains in place.
- Removed the floating/dimming access overlay shared by protected pages; denied access uses an inline notice.
- Removed globally mounted account-setup onboarding. The profile retains account setup.
- Removed the duplicate standalone crab mark; the purple sidebar mark and integrated CLAWD wordmark remain.
- Middleware only rewrites the Trickshot host. Instrumentation starts telemetry and the scheduler; neither creates access prompts.

## src/app
Scanned 360 files for access/prompt call sites.
- `src/app/research/page.tsx`: PaidPageGate
- `src/app/bots/page.tsx`: PaidPageGate, ADMIN_WALLET
- `src/app/studio/page.tsx`: PaidPageGate
- `src/app/pagent/page.tsx`: PaidPageGate
- `src/app/box/page.tsx`: PaidPageGate
- `src/app/trickshot/page.tsx`: PaidPageGate
- `src/app/clawdbot/page.tsx`: PaidPageGate
- `src/app/gallery/page.tsx`: PaidPageGate
- `src/app/chart/page.tsx`: PaidPageGate
- `src/app/z500/page.tsx`: PaidPageGate
- `src/app/charts/page.tsx`: PaidPageGate
- `src/app/agents/page.tsx`: PaidPageGate
- `src/app/explorer/page.tsx`: PaidPageGate, ADMIN_WALLET
- `src/app/agent/page.tsx`: PaidPageGate
- `src/app/fire/page.tsx`: PaidPageGate
- `src/app/profile/page.tsx`: PaidPageGate, ADMIN_WALLET
- `src/app/voice/page.tsx`: PaidPageGate
- `src/app/sandbox/page.tsx`: PaidPageGate
- `src/app/markets/page.tsx`: PaidPageGate, ADMIN_WALLET
- `src/app/forge/page.tsx`: PaidPageGate
- `src/app/pump/page.tsx`: PaidPageGate, ADMIN_WALLET
- `src/app/wallet/page.tsx`: PaidPageGate
- `src/app/portfolio/page.tsx`: PaidPageGate
- `src/app/api/page-env-handlers.test.ts`: ADMIN_WALLET
- `src/app/api/paid-spend-gate.test.ts`: ADMIN_WALLET
- `src/app/api/desk-holder-gate.test.ts`: ADMIN_WALLET
- `src/app/inference/page.tsx`: PaidPageGate, ADMIN_WALLET
- `src/app/nfts/page.tsx`: PaidPageGate
- `src/app/keys/page.tsx`: PaidPageGate
- `src/app/automations/page.tsx`: PaidPageGate
- `src/app/perps/perps-client.tsx`: PaidPageGate
- `src/app/computer/page.tsx`: PaidPageGate
- `src/app/tokens/page.tsx`: PaidPageGate, ADMIN_WALLET
- `src/app/predictions/predictions-client.tsx`: PaidPageGate
- `src/app/gateway/page.tsx`: PaidPageGate
- `src/app/astra-batch/page.tsx`: PaidPageGate
- `src/app/computer/orgo/page.tsx`: PaidPageGate
- `src/app/api/bots/holder-access.test.ts`: ADMIN_WALLET
- `src/app/api/studio/route.test.ts`: ADMIN_WALLET
- `src/app/api/token-metadata/route.test.ts`: ADMIN_WALLET
- `src/app/api/chat/supermemory.route.test.ts`: ADMIN_WALLET
- `src/app/api/chat/route.test.ts`: ADMIN_WALLET
- `src/app/api/dflow/dflow-routes.test.ts`: ADMIN_WALLET
- `src/app/api/firecrawl/route.test.ts`: ADMIN_WALLET
- `src/app/api/gallery/route.test.ts`: ADMIN_WALLET
- `src/app/api/agents/route.test.ts`: ADMIN_WALLET
- `src/app/api/orgo/route.test.ts`: ADMIN_WALLET
- `src/app/api/voice/route.test.ts`: ADMIN_WALLET
- `src/app/api/gate/route.test.ts`: ADMIN_WALLET
- `src/app/api/nfts/route.test.ts`: ADMIN_WALLET
- `src/app/api/perps/route.test.ts`: ADMIN_WALLET
- `src/app/api/browser-use/route.test.ts`: ADMIN_WALLET
- `src/app/api/e2b/route.test.ts`: ADMIN_WALLET
- `src/app/api/phantom/route.test.ts`: ADMIN_WALLET
- `src/app/api/browser-use/status/route.test.ts`: ADMIN_WALLET
- `src/app/api/privy/intents/intents-route.test.ts`: ADMIN_WALLET
- `src/app/api/helius/bundle/route.test.ts`: ADMIN_WALLET
- `src/app/api/helius/send/route.test.ts`: ADMIN_WALLET
- `src/app/api/livekit/token/route.test.ts`: ADMIN_WALLET
- `src/app/api/voice/elevenlabs/token/route.test.ts`: ADMIN_WALLET
- `src/app/api/browser-run/run/route.test.ts`: ADMIN_WALLET
- `src/app/api/jupiter/order/route.test.ts`: ADMIN_WALLET
- `src/app/api/agents/mint/route.test.ts`: ADMIN_WALLET
- `src/app/api/phoenix/prepare/route.test.ts`: ADMIN_WALLET
- `src/app/api/dflow/quote-stream/route.test.ts`: ADMIN_WALLET
- `src/app/api/auth/authenticate/route.ts`: authenticateWallet
- `src/app/api/chat/session/route.test.ts`: ADMIN_WALLET
- `src/app/auth/callback/page.tsx`: ensureVerifiedSession
- `src/app/research/portfolio/page.tsx`: PaidPageGate

## src/components
Scanned 182 files for access/prompt call sites.
- `src/components/desk/profile.test.ts`: PaidPageGate
- `src/components/desk/holder-onboarding.tsx`: HolderOnboarding, Dialog open=
- `src/components/desk/use-public-desk-session.test.ts`: ensureVerifiedSession
- `src/components/desk/page-api-wiring.test.ts`: PaidPageGate
- `src/components/desk/paid-page-gate.test.ts`: PaidPageGate
- `src/components/desk/webmcp-register.test.ts`: PaidPageGate
- `src/components/desk/nfts.tsx`: window.confirm
- `src/components/desk/desk-shell.test.ts`: PaidPageGate
- `src/components/desk/paid-page-gate.tsx`: PaidPageGate
- `src/components/desk/groksearch.tsx`: setOpen(true)
- `src/components/desk/desk-fit.test.ts`: PaidPageGate
- `src/components/wallet/wallet.tsx`: ensureVerifiedSession
- `src/components/wallet/verified-session-client.test.ts`: ensureVerifiedSession, ADMIN_WALLET
- `src/components/wallet/wallet-privy.tsx`: ensureVerifiedSession
- `src/components/wallet/verified-session-client.ts`: ensureVerifiedSession
- `src/components/wallet/phantom-connect.test.ts`: authenticateWallet, ensureVerifiedSession
- `src/components/privy/desk-providers.tsx`: HolderOnboarding

## src/hooks
Scanned 2 files for access/prompt call sites.

## src/lib
Scanned 507 files for access/prompt call sites.
- `src/lib/solgpt/astra-holder.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/trading-guard.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/phantom-auth.test.ts`: authenticateWallet
- `src/lib/solgpt/holder-onboarding.ts`: HolderOnboarding
- `src/lib/solgpt/clawd-gate.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/clawdbot-install.test.ts`: PaidPageGate
- `src/lib/solgpt/download-mobile-artifacts.test.ts`: PaidPageGate
- `src/lib/solgpt/z500-buy.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/orgo-server.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/holder-onboarding.test.ts`: HolderOnboarding
- `src/lib/solgpt/phantom-auth.ts`: authenticateWallet
- `src/lib/solgpt/clawd-bot-package.test.ts`: PaidPageGate
- `src/lib/solgpt/hauhau-keys.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/predictions.test.ts`: PaidPageGate
- `src/lib/solgpt/metaplex-nfts.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/config.ts`: ADMIN_WALLET
- `src/lib/solgpt/paid-gate.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/metaplex-agents.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/paid-page-access.ts`: PaidPageGate, ADMIN_WALLET
- `src/lib/solgpt/clawd-gate.ts`: ADMIN_WALLET
- `src/lib/solgpt/executors.jupiter-v2.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/tigris.test.ts`: ADMIN_WALLET
- `src/lib/solgpt/metaplex-token-metadata.test.ts`: ADMIN_WALLET
- `src/lib/privy/device-auth-agent.ts`: authenticateWallet
- `src/lib/privy/device-auth-agent.test.ts`: authenticateWallet

## src/server
Scanned 16 files for access/prompt call sites.

## src/test
Scanned 1 files for access/prompt call sites.
- `src/test/proven-admin.ts`: ADMIN_WALLET

## src/types
Scanned 4 files for access/prompt call sites.

## src/middleware.ts
Read: True

## src/instrumentation.ts
Read: True

## src/instrumentation.test.ts
Read: True
