# Reown Solana and Text Us validation — 2026-09-13

Configured the public project ID `af6296db32d2075f8aaaa31245e0280f` for
SOL-GPT, the go-bot console, and the clawd-bot public site.

## Local checks

- SOL-GPT production build passed compilation, lint, type checking, and generation
  of all 88 static pages.

- CLAWD public-site Vite production build passed.
- go-bot frontend Vite production build passed; rebuilt files synchronized into
  `web/uiembed/console`. The Go embedded UI package compiled successfully.
- 36 go-bot frontend tests passed.
- 38 focused SOL-GPT tests passed (wallet session/disconnect, profile, public
  gates, marketing, environment wiring, and rendered Text Us link). SOL-GPT TypeScript check passed.
- All three modals opened in Chromium with no modal page errors. Their wallet-list
  requests included the supplied project ID and
  `chains=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (Solana mainnet).
- A local mock Solana wallet requested no signature at page load. Explicit wallet
  connection produced one message signature and one authentication request through
  SOL-GPT's existing challenge flow. This was a mocked session, not a real wallet
  transaction or proof of a live authenticated session.
- `/support` and `/blue` rendered
  `sms:+17408773994?body=ever%20wanted%20to%20text%20clawd%3F`, with computed
  background `rgb(10, 147, 246)` and padding `12px 24px`.
- Scanned 112 CLAWD build files, 278 go-bot build files, and 1,021 SOL-GPT browser
  build files: no supplied Sendblue credentials were present.

## Scope

No deployment, messages, or real wallet transactions were sent. Production
Reown origin settings and real-device wallet approval are not established by
these local checks. The console and public-site wallet menus do not grant
backend access. SOL-GPT retains its existing server-side authentication and
authorization checks.

An unrelated SuperMemory suite still has two expectations for an older container
naming scheme; that behavior was not changed by this wallet work. Development
also reported a pre-existing duplicate `/favicon.ico` route/public asset.
