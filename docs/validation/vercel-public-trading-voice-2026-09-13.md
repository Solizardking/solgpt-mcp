# Vercel public trading and paid voice — 2026-09-13

Web target: linked Vercel project `sol-gpt`, production domain `solgpt.trade`. Deployment `dpl_51w1MXahSdCFgm4Qt7eou1BWgsVz` is Ready. Live checks against `solgpt.trade` pass for public unsigned trading quotes, payment preparation, paid voice restrictions, and the independent animation.

## Voice behavior

`/voice` defaults to LiveKit. The independent decorative hoop appears outside the holder gate and animates without starting an agent, requesting microphone access, or requesting a voice token. A CSS animation covers renderer loading/failure. Voice controls require an authenticated holder or paid wallet matching the connected wallet. Wallet changes invalidate pending connection requests and disconnect the room.

Production LiveKit API credentials were installed as sensitive Vercel environment variables. The live `/api/livekit` endpoint returns 200 with `configured: true`. The webhook descriptor now uses `https://solgpt.trade/livekit/webhook`; this does not verify the separate LiveKit Cloud webhook subscription configuration. The SFU is `wss://solanaos-zn3w8h4f.livekit.cloud`, with the tested dispatch name `solgpt-voice-prod-v2`. Local configuration and `.env.example` now use this dispatch name too. Browsers obtain tokens from the application's entitlement-gated `/api/livekit/token` route; the server gate independently verifies paid subscription receipts on-chain. A self-reported active database row is insufficient.

## Validation

- Production Vercel build, CSS and native-loader checks, TypeScript validation, and 111 focused voice/trading/access tests passed. Committed merge markers were resolved while preserving wallet binding and holder checks on Telegram linking.
- The production `/voice` page passed an isolated mobile Chrome check: moving animation, disabled public Start voice, zero microphone requests, zero token requests, no page errors, and no horizontal overflow.
- A real Grok worker joined an isolated room, produced audible playback (87 signal samples), and transcribed synthetic microphone input.
- A real Brain/AssemblyAI conversation recognized “Please light up the escape circuit in the brain,” invoked the GF circuit highlight, returned “Escape circuit (GF) highlighted,” and produced audible playback (169 signal samples). Microphone tracks stopped on disconnect and the temporary room was deleted.
- The audio checks used synthetic speech and server-minted test tokens injected only into isolated test browsers. They establish provider/media behavior separately from holder authorization. No holder wallet was impersonated on the live site.

- A real empty wallet authenticated on `solgpt.trade`; session and RPC mint lookup returned 200, nonce replay returned 401, and voice-token requests returned 403. `/trade` returns 200.
- The initial missing DFlow key blocked production quotes. The user subsequently explicitly approved its transfer to Vercel production; the key is now configured and the new deployment returns 200 for a wallet-bound unsigned DFlow quote. No key value was printed.

Public trading validation and its funded-execution limitation are recorded in [public-trading-readiness.md](../public-trading-readiness.md).

## Paid voice hardening (approved follow-up)

The user explicitly approved the DFlow credential transfer to Vercel production; it succeeded without exposing the key. The release also closes a subscription activation bypass: an authenticated wallet previously could record an arbitrary active subscription without evidence of payment.

- Both activation and subsequent entitlement checks require a finalized successful USDC payment, with the signing wallet, recipient, exact plan/subscription memo, sufficient net payer debit and recipient credit, and an unexpired on-chain timestamp. Historical unverified rows fail closed. Pump-only subscriptions do not unlock SOLGPT voice.
- `/subscribe` prepares an unsigned $4.20 USDC payment for wallet review. Signing/submission requires an explicit user click in the user's wallet. Verification never sends or retries a payment. Access lasts 30 days from the payment's block time, without automatic renewal.
- A pending receipt is saved before entering the wallet; uncertain submissions must be reconciled using the transaction signature. No second payment is automatically proposed or submitted.
- 58 focused tests and TypeScript validation pass. Tests include forged active records, expired/wrong-wallet/wrong-plan/underpaid receipts, missing evidence, RPC failure, and existing provider gates.
- Receipt verification follows [Solana getTransaction](https://solana.com/docs/rpc/http/gettransaction) and [token balance metadata](https://solana.com/docs/rpc/json-structures).

No real subscription payment or funded swap was signed during validation.

## Final production verification

Deployment: `https://sol-pc6cq72vf-clawd-c4b28c7e.vercel.app` (`dpl_51w1MXahSdCFgm4Qt7eou1BWgsVz`). Production build, CSS validation and native-loader checks passed.

Against `https://solgpt.trade`, an empty ephemeral wallet completed real signed-message login (200), session lookup (200), replay rejection (401), and Helius-backed mint lookup (200). DFlow order preparation returned 200 with an unsigned transaction and wallet-bound proposal. Subscription payment preparation returned 200 with an unsigned $4.20 USDC proposal. An unpaid self-reported active subscription returned 402 `verified_payment_required`. LiveKit, AssemblyAI, ElevenLabs, and the voice-token endpoint each returned 403 for that unpaid wallet.

Mobile Chrome reported a moving animation, disabled public voice controls, zero microphone requests, zero token requests, no page errors and no horizontal overflow. Actual payment activation is tested with receipt fixtures; a real subscription payment and a funded mainnet swap were not executed.
