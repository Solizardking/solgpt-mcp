# MoonPay voice payments

## Grok trading agent

The `/voice` Grok trading tab connects to `agent_mpbVKYweni5Xomq5` (override with server-side `XAI_REALTIME_AGENT_ID`). `XAI_API_KEY` mints a short-lived browser credential. Both `/api/grok/voice/ephemeral-token` and `/api/grok/voice/dispatch` require a verified wallet session and an active voice or desk subscription. Holder grants, admin flags, and client payment callbacks do not unlock Grok.

The hosted agent accepts desk instructions, function tools, and 24 kHz PCM through `session.update`; direct-model `voice`, `turn_detection`, and `replace` settings were rejected in live testing. Its initial user message triggers a response automatically, so the CLI does not also send `response.create`. Live verification returned transcript/audio and accepted the 21 desk functions using the configured agent. A browser-compatible ephemeral credential also connected successfully.

Validation for this integration: 31 access/voice regression tests and two token-route tests passed; focused lint passed. An initial TypeScript check passed, but the final recheck and browser startup were blocked by missing files/types in the workspace's Next.js installation. Local Commerce credentials and `HELIO_WEBHOOK_SECRET_VOICE` were absent; no payment or full checkout-to-voice browser session was performed.

Voice uses https://moonpay.hel.io/pay/6aa6d7f115b6bc52d57f4b3b at https://solgpt.trade/voice/.
The live public Pay Link was inspected on 2026-09-13: Clawd Voice, **0.06942 SOL per month**, fixed quantity and price, settled in Solana USDC, recipient `GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4`, redirect back to `/voice/`. Its USD checkout quote varies with SOL. Never substitute a fixed USD price for that SOL subscription.

## Routes and configuration

| Product | Pay Link | Webhook | Secret variable |
| --- | --- | --- | --- |
| Voice | `6aa6d7f115b6bc52d57f4b3b` | `https://solgpt.trade/webhook/moonpay-commerce?product=voice` | `HELIO_WEBHOOK_SECRET_VOICE` |
| Full-site access | `HELIO_PAYLINK_ID` in `helio-checkout.ts` | `https://solgpt.us/api/payments/helio/webhook` | `HELIO_WEBHOOK_SECRET` |
| Clawd Bot monthly | `HELIO_PAYLINK_CLAWD_BOT_MONTHLY` | `https://solgpt.trade/webhook/moonpay-commerce?product=clawd-bot-monthly` | `HELIO_WEBHOOK_SECRET_CLAWD_BOT_MONTHLY` |
| Clawd Bot lifetime | `HELIO_PAYLINK_CLAWD_BOT_LIFETIME` | `https://solgpt.trade/webhook/moonpay-commerce?product=clawd-bot-lifetime` | `HELIO_WEBHOOK_SECRET_CLAWD_BOT_LIFETIME` |

The two Clawd Bot links must be separately configured in the merchant dashboard: $4.20/month and $19.99 once, settled in Solana USDC. Set `HELIO_COMMERCE_RECIPIENT` to their verified payout wallet. There is no fallback to an unrelated wallet or site-access Pay Link.

Use `MOONPAY_COMMERCE_PUBLIC_KEY` and `MOONPAY_COMMERCE_SECRET_KEY` (or the existing `HELIO_API_KEY` / `HELIO_API_SECRET` aliases) from the **Commerce** dashboard. MoonPay on-ramp keys are a separate credential pair. Full-site verification currently reads the `HELIO_API_*` names; configure those aliases for that surface too. All secrets stay server-side.

```sh
# Read-only audit. Outputs IDs, endpoints, events, and missing configuration, never secret values.
node --env-file=.env.local scripts/setup-moonpay-commerce.mjs

# After production deployment approval and merchant credentials are available:
# Register missing hooks, reuse exact existing hooks, and save sharedTokens to .env.local.
node --env-file=.env.local scripts/setup-moonpay-commerce.mjs --apply
```

Subscription hooks request `STARTED`, `RENEWED`, `ENDED`. One-time hooks request `CREATED`. Pending subscription events are accepted for bookkeeping but grant no access. Each hook has its own `sharedToken`; copy the corresponding environment variable into the Next.js server environment. Do not use an on-ramp signing key. The apply command does not deploy server environment variables, delete hooks, modify product terms, or retry an uncertain registration mutation.

## Fulfillment

`X-Signature` must be the HMAC-SHA256 hex digest of the exact raw request body using the product's `sharedToken`. Missing configuration returns 503; invalid signatures return 401. The server validates product, paylink, recipient, currency, successful settlement, transaction signature, and provider payment date. Voice's USDC amount floats because the configured price is in SOL; authenticated SUCCESS from this fixed Pay Link is required.

Convex atomically records the event and updates product-scoped access in `deskCommercePayments` and `deskCommerceEntitlements`. Replays cannot extend access; conflicting duplicates fail. Monthly expiry is computed from payment time with UTC month-end clamping. Pending does not renew. ENDED closes the matching subscription; older events cannot overwrite a newer payment. Database outages return 503 so MoonPay retries delivery.

The embedded checkout carries a server-signed product/beneficiary identifier, supporting association with the signed-in Solana wallet even when settlement comes through another payment rail. The identifier grants nothing without a verified payment. Direct hosted checkout without this metadata requires paying from the same Solana wallet; unmatched cross-chain payments require reconciliation. Never accept a wallet, amount, or transaction ID from a browser success callback as proof.

`GET /api/commerce/status?product=voice` derives the wallet from a signed session, polls the durable entitlement, and supplies checkout metadata. The embed remains unavailable while the server webhook secret or Convex service is unavailable. Voice API handlers opt into voice access explicitly; this does not grant sandbox, trading, or Clawd Bot licenses. Existing holder and full-desk access still work independently.

Clawd Bot's license endpoint now requires session proof and an active verified entitlement. It no longer grants a license from a client-supplied transaction ID. The client waits for webhook confirmation before opening the app.

## Validation and release status

- Focused application suite: 55 tests passed. Tests cover webhook authentication, wrong product/recipient/currency, unsuccessful payments, signed beneficiary tampering, session ownership, product scope, atomic duplicate delivery, expiry, pending/renewal/end ordering, and storage failures.
- Convex tests: 31 passed, one existing test skipped. TypeScript and focused ESLint checks passed.
- Local `/voice` returned HTTP 200; isolated Chrome showed the monthly price and sign-in control with no page errors. Screenshot: `/tmp/solgpt-voice-checkout.png`.
- Commerce API secret and both Clawd Bot Pay Link IDs were absent at audit time. No merchant webhook has been registered by this task and no payment was made.
- The user approved production deployment on 2026-09-13. The Convex payment backend was deployed to `veracious-snake-356`; its signed commerce access endpoint returned `{active:false, expiresAt:null}` for the system address. The pre-existing shared `pipedreamEvents.by_body_hash` index was restored after the initial deploy reported removing it; the corrective deploy reported no index deletions. Next.js production deployment `dpl_9fQWLYhzDWSdkTudPRGfC7HZGeKo` is READY and aliased to `https://solgpt.trade`.
- A follow-up browser test used the actual VoiceCheckout component with simulated status responses: pending payment kept a single widget mount; verified activation removed checkout and opened access; no page errors. This validates UI lifecycle, not provider settlement.
- Live Pay Link recheck during deployment: voice remains 0.06942 SOL/month, full-site remains 0.06942 SOL once, and legacy `6aa0b19145f335716fc021ec` is 0.16942 SOL/month. The legacy link is not a Clawd Bot lifetime purchase. Production stores the Clawd Bot settings as sensitive entries, so their values cannot be read back through the environment API; the old public catalog showed the legacy fallback for both products.
- Live checks after deployment: `/voice/` returned 200 and rendered the monthly price/sign-in control with no browser errors; `/api/commerce/status?product=voice` and the license endpoint returned 401 without a session; the voice webhook returned 503 `commerce_webhook_unconfigured`; the production Clawd Bot catalog returned empty paylink IDs for both SKUs. Screenshot: `/tmp/solgpt-voice-production.png`.
- Production acceptance remains: configure Commerce credentials, product links, and server webhook secrets; register hooks; make one wallet-reviewed test payment; verify actual provider delivery, persistent access after reload, signed-out/different-wallet denial, renewal/end handling, and a successful voice provider session. Card/cross-chain completion has not been tested with a real payment.

Provider contracts: [webhook headers](https://docs.hel.io/reference/webhook/overview), [subscription payloads](https://docs.hel.io/reference/webhook/paylink-subscription/payloads), [checkout widget](https://docs.hel.io/docs/checkout-widget).
