# Public wallet trading — 2026-09-13

The `/trade` page opens DFlow swaps to verified Solana wallets without a CLAWD balance. It supports SOL, USDC, or another input mint and an exact output mint. Mint decimals come from the configured Helius RPC; amounts use integer arithmetic.

Wallet connection still requires proof of ownership. Phantom SIWS and Privy issue verified sessions for non-holders. SIWS challenges bind to the validated browser origin, including when Next/proxies use an internal hostname. Other protected services retain their CLAWD checks; linking a Telegram trading account remains holder-only.

Public DFlow orders return a 60-second signed proposal covering the exact transaction message and fee payer. Submission verifies the proposal, wallet identity, and every required transaction signature. The server uses its keyed Helius RPC with preflight enabled and zero automatic retries. An uncertain response includes the locally known signature for status checks. Keys remain server-side; the application never signs users' transactions.

Transaction confirmation remains distinct from DFlow asynchronous settlement. Async prediction orders poll DFlow order status; a closed order reports filled output and the presence of refunds. This does not bypass DFlow eligibility requirements or establish that prediction-market execution has been live-tested.

Validation:

- 70 focused tests pass across public trading, SIWS proof/replay, Privy sessions, and existing protected API gates.
- TypeScript validation and the production build pass.
- The public page renders in an isolated Chrome browser at desktop and 390px mobile width, with no page errors, no inert controls, and no horizontal overflow.
- An empty temporary wallet completed real SIWS authentication against the local app. Its session and RPC mint lookup returned 200, paid research returned 403 `clawd_required`, and reuse of its login challenge returned 401.
- Configured DFlow priority fees, DFlow market metadata, and Helius latest-blockhash reads returned 200.
- A live unsigned SOL/USDC DFlow order had output, block-height expiry, and the expected fee payer; proposal creation succeeded. The empty authenticated non-holder also received HTTP 200 with an unsigned order and signed proposal through the local `/api/dflow/order` route. No mainnet transaction was signed or broadcast.

The web deployment target is Vercel project `sol-gpt`, serving `solgpt.trade`. The earlier Fly check was not the web release path. Deployment `dpl_51w1MXahSdCFgm4Qt7eou1BWgsVz` is Ready and assigned to the public domain. `/trade` returns 200. A real empty wallet completed production SIWS login and an RPC mint lookup; nonce replay returned 401 and voice access returned 403.

The user explicitly approved transferring the existing DFlow key to Vercel production. The transfer and deployment succeeded. An empty authenticated public wallet now receives HTTP 200 from the production DFlow order route, with an unsigned transaction for the exact wallet and a signed proposal. No mainnet transaction was signed or broadcast. A user-approved funded-wallet swap remains necessary to establish actual mainnet execution and settlement.

Unpaid non-holders remain blocked from LiveKit, AssemblyAI, ElevenLabs and the voice token endpoint (403). A fabricated active subscription returns 402. Paid access now requires independently verified finalized USDC receipt evidence and expires from the on-chain payment timestamp. Public checkout at `/subscribe` prepares a wallet-reviewed unsigned payment; its production preparation endpoint returned 200. The animation remains public with no microphone/token requests. See [voice and payment validation](validation/vercel-public-trading-voice-2026-09-13.md).

Reference: [DFlow order status](https://pond.dflow.net/resources/trading-api/order/order-status).
