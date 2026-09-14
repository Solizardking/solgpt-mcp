# MoonPay full-site access

Paylink: `6aa6d8461dd4b1c45cf90183`
Hosted checkout: https://moonpay.hel.io/pay/6aa6d8461dd4b1c45cf90183
Public checkout: https://solgpt.trade/checkout
Payment return: https://solgpt.trade/app
Webhook: https://solgpt.trade/api/payments/helio/webhook

The existing 30-day access duration is retained. Each confirmed payment grants 30 days from the provider's payment creation timestamp, not from callback delivery or record updates. This implementation does not stack overlapping payments or automatically initiate renewals. The merchant's fixed paylink sets the checkout price and supported currencies; verify those settings before opening checkout.

## Required production configuration

Configure these in the Next.js deployment, never in NEXT_PUBLIC variables:

- `HELIO_API_KEY`: MoonPay Commerce merchant public API key.
- `HELIO_API_SECRET`: matching MoonPay Commerce merchant secret API key. Alternatively, configure the complete pair `MOONPAY_COMMERCE_PUBLIC_KEY` / `MOONPAY_COMMERCE_SECRET_KEY` with neither `HELIO_API_*` variable set. The setup script and access verifier use the same precedence and reject incomplete pairs. MoonPay on-ramp keys are a separate product and must not be substituted without verifying their provenance.
- `HELIO_WEBHOOK_SECRET`: webhook sharedToken, at least 32 characters.
- `HELIO_ACCESS_SECRET`: at least 32 characters for signed checkout beneficiaries; defaults to `SOLGPT_CONVEX_SERVICE_SECRET`. Retain this key for at least the access lifetime of receipts created with it; rotating it invalidates cross-chain beneficiary verification for those receipts.
- Existing `CONVEX_SITE_URL` (or another supported Convex URL), `SOLGPT_DATA_STORE=convex`, and `SOLGPT_CONVEX_SERVICE_SECRET` matching the Convex signed-service endpoint.

The existing Convex subscriptions service is reused; these changes require no new database tables. A browser cannot create a valid Helio entitlement through the generic subscription-record API: Helio pointers are independently verified against the merchant API every time they are used, with a 15-second bounded cache. Provider verification outages fail closed. Revocations/refunds can take up to that cache interval to affect protected requests.

In MoonPay Commerce, edit this exact paylink:

1. Confirm the advertised price, receiving currencies, merchant payout wallet, mainnet, and that dynamic pricing / buyer-editable price are disabled. API verification explicitly rejects dynamic or buyer-editable paylinks.
2. Enable successful-payment redirect (`features.shouldRedirectOnSuccess`) and set `redirectUrl` to `https://solgpt.trade/app`. This dashboard setting is required for the hosted paylink; the embedded widget also routes its success callback to this URL.
3. Register a Pay Link transaction webhook for this paylink to the webhook URL above, select the payment-created event, and install its sharedToken as `HELIO_WEBHOOK_SECRET`.
4. Confirm MoonPay/Phantom domain allowlisting for `solgpt.trade` if the checkout displays transaction safety warnings.

Do not enable paid acquisition before these checks and a real successful receipt have passed. The embedded checkout stays unavailable when required server configuration is absent.

## Access and recovery

- A verified Phantom/Privy Solana-wallet session can open checkout without CLAWD.
- The embed sends a signed beneficiary in `additionalJSON.solgptBeneficiary`, binding supported card/cross-chain payments to that authenticated wallet. Editable email or wallet fields never establish identity.
- Direct hosted-link purchases must pay from the same Solana wallet used to sign in. The static hosted URL does not carry the embed's beneficiary token; cross-chain purchases made there cannot automatically be mapped to an unrelated Solana account. Use the embedded checkout for that flow.
- The signed webhook is independently checked against MoonPay's transaction API, then recorded in Convex. The return screen polls for recorded access or recovers payments by authenticated sender address. A receipt signature can also be entered to recover an embedded cross-chain purchase when the webhook was delayed or lost.
- Success callbacks, redirect query parameters, and client-supplied wallet addresses alone never unlock anything.
- An active recorded MoonPay receipt admits the wallet through the common page/API gate, chat, Astra batch, API key authentication, Hauhau key issuance, and holder-free catalog tools. Existing resource ownership, wallet signing, admin roles, provider limits, and separate product licenses still apply.
- `/terms` and `/privacy` bypass wallet/Privy providers and remain public static documents.

## Release acceptance

1. Deploy the reviewed application changes and configure the merchant webhook/redirect and server environment.
2. Verify unauthenticated HTTP 200 and usable content at `/terms`, `/privacy`, `/checkout`, and `/app`.
3. With a non-holder, sign in, pay once through the embed, reach `/app`, and reach `/desk` after server confirmation. Confirm `/api/gate` returns `ok:true`, `paid:true`, `authenticated:true` for that wallet.
4. Sign out/in, reload, and open another tab. Test chat, voice-token creation, research, sandbox, studio, gateway key issuance and use, and Astra batch with the same wallet. Confirm provider execution, not just an HTTP health response.
5. Check a different wallet cannot claim the receipt. Test pending/failed payments, forged callbacks, refunds, expired receipts, and webhook replay. Duplicate delivery must not extend the original payment lifetime.
6. Test embedded card/cross-chain checkout, direct hosted Solana checkout, a delayed webhook, and manual receipt recovery.
7. Confirm actual merchant price and customer-facing duration are consistent. Have the business owner review paid-service terms and refund/support language.

## Evidence in this implementation run

- Final focused suite: 118 passing tests across 15 files.
- TypeScript, targeted ESLint, and a full isolated `next build` passed. The build reported one existing `no-img-element` warning in `src/components/brand/solgpt-complete-banner.tsx`.
- Local HTTP checks returned 200 for `/terms`, `/privacy`, `/checkout`, and `/app`; unauthenticated `/api/payments/helio` returned 401. These are server-rendering checks, not an authenticated browser purchase.
- Production probes on `solgpt.trade` returned 200 for checkout, return, and legal pages. A real payment remains unverified.
- Local configuration contains MoonPay on-ramp/commerce-named settings but lacks explicitly configured `HELIO_API_KEY`, `HELIO_API_SECRET`, and `HELIO_WEBHOOK_SECRET`. Their values were not exposed or repurposed.
- No real purchase, wallet signature, merchant setting change, webhook registration, or production deployment was performed in this run.

## Official provider contracts

- https://docs.hel.io/docs/checkout-widget
- https://docs.hel.io/reference/transactions/retrieve-by-signature
- https://docs.hel.io/reference/transactions/list
- https://docs.hel.io/reference/webhook/paylink-transaction/payloads

## Follow-up configuration audit

The setup script and runtime verifier now share complete-pair credential selection. A focused follow-up suite passed 19 tests, including the zero-CLAWD entitlement integration and rejection of mixed merchant/on-ramp keys. The read-only merchant audit still reports `commerce_api_credentials_required` for site access. A fresh live `/checkout` probe still failed with a TLS connection reset.

## Canonical domain correction

The user confirmed `solgpt.trade` is the production domain. The payment return URL is `https://solgpt.trade/app`; the site-access webhook is `https://solgpt.trade/api/payments/helio/webhook`. The earlier `solgpt.us` probe failure is not a launch requirement. Merchant credentials and actual payment verification remain outstanding.
