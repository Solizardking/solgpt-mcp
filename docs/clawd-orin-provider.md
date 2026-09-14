# CLAWD Orin cloud and SOL-GPT provider

Live frontend: https://clawd-orin-8bit.fly.dev/

The Fly VM serves the CLAWD chat interface and proxies inference over a pinned, outbound SSH connection from the Orin. Generation runs on the Orin GPU with Qwen2.5-0.5B-Instruct Q4_K_M. This is a CLAWD assistant built around an existing model, not a trained Nemotron model.

## Deployment state

- Fly app: `clawd-orin-8bit`, region `iad`, one shared CPU, 256 MB RAM, always on.
- Persistent 1 GB volume `clawd_data` preserves the SSH server identity. This VM and volume incur Fly hosting charges.
- Public HTTPS API root: `https://clawd-orin-8bit.fly.dev/v1`.
- Orin: `name@192.168.55.1`, hostname `clawd`.
- Orin model, gateway, and Fly tunnel user services are enabled, with user lingering enabled for boot startup.
- SOL-GPT production was redeployed on 2026-09-08 UTC with image `registry.fly.io/solgpt:deployment-01M1ZDP8XDK7K7JKCK8GYMMD3T`. All five machines passed rollout health checks. Production uses the public HTTPS endpoint and a server-side Fly secret. See `docs/provider-rollout-2026-09-08.md` for verification and outstanding third-party access failures.

## Use the frontend

Open the live URL in a browser with a Solana wallet extension, or inside a wallet's browser. Select your wallet, click **Connect wallet**, and approve the sign-in message. Wallet Standard discovery is supported with Phantom/Solflare injected-provider fallbacks. Message-signing support is required.

Any wallet that proves ownership can receive an API key. No balance or CLAWD token holding is required on this standalone frontend. The key immediately enables chat and can be copied into an OpenAI-compatible client.

Keys expire after 30 days. Reconnecting and signing issues a replacement and invalidates that wallet's previous key. **Revoke key** disables it immediately; **Disconnect** only clears it from the page. Save the key when issued: the server stores only its SHA-256 hash and cannot recover it. The page keeps the raw key in memory only.

Wallet sign-in uses a five-minute, single-use message bound to the website origin, wallet address, and a Secure/HttpOnly/SameSite challenge cookie. The backend verifies Ed25519 signatures before issuing credentials. No transaction or transfer is requested.

The Fly authentication service uses the persistent `/data/wallet-auth.sqlite3` database. It relays authorized calls over the existing Orin tunnel using the private `ORIN_ACCESS_TOKEN` Fly secret. Wallet users never receive that operator credential. The original operator credential remains valid for existing integrations.

Each wallet may submit 12 inference requests per minute, including after key rotation. The existing shared GPU concurrency limit also applies. Wallet ownership is not proof of a unique human.

## SOL-GPT integration

Select **CLAWD · Orin Nano** in the model catalog. SOL-GPT model ID: `clawd:orin`; underlying API model: `clawd-local`.

Server environment variables:

```dotenv
CLAWD_INFERENCE_BASE_URL=https://clawd-orin-8bit.fly.dev/v1
CLAWD_INFERENCE_API_KEY=<issued wallet API key or existing operator token>
```

The Mac's `.env.local` currently uses `http://127.0.0.1:8010/v1` over its existing SSH forward to the Orin. This private development path avoids a newly created hostname's negative OS DNS cache. The public URL resolves in the browser and on the Orin and has passed real HTTPS inference checks. Production must use the public HTTPS URL, not the Mac loopback address.

To restore the private development forward when needed:

```sh
ssh -NT -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -L 127.0.0.1:8010:127.0.0.1:8010 name@192.168.55.1
```

Restart a running SOL-GPT development server to load new environment variables. The provider uses the existing SOL-GPT chat authorization and persistence flow. Existing public-tier model restrictions still apply. The small model is text-only: tools, images, and tool-call history are not supported. Start a fresh conversation when switching from a tool-enabled model.

For production rollout, add the two server secrets to the intended SOL-GPT deployment and deploy the application through its normal release process. This repository already had staged Nemotron changes before this work; those staged changes were preserved. Deploying just the separate frontend does not update the main SOL-GPT model picker.

## Limits and behavior

- All 25 model layers offloaded to GPU; CUDA toolkit 11.4, compute capability SM 8.7.
- 2,048-token context; adapter trims older text history using a character budget and caps output at 512 tokens. Unusually token-dense input can still exceed the model context and should be shortened.
- One inference at a time; concurrent calls can return 429. Frontend proxy additionally limits requests to 30/minute per client IP with a burst of five.
- Missing configuration fails visibly; there is no automatic paid cloud fallback.
- The API requires Bearer authentication. The public page and readiness endpoint are readable without the token. Wallet API keys work through the public cloud URL; the private Orin gateway still accepts only the operator token.
- If the Orin or tunnel goes offline, API readiness returns 503. The frontend itself remains online. This is one edge inference node, not a high-availability or high-throughput GPU fleet.
- The Orin requires power and internet access; if its internet connection relies on the Mac, keep that connection active.

## Operations

```sh
ssh name@192.168.55.1 'systemctl --user status clawd-model clawd-gateway clawd-fly-tunnel --no-pager'
ssh name@192.168.55.1 'systemctl --user restart clawd-fly-tunnel'
curl --fail https://clawd-orin-8bit.fly.dev/health
fly status --app clawd-orin-8bit
```

Orin files are under `/home/name/clawd-inference/`. Logs are `model.log` and `fly-tunnel.log`. The gateway secret is in protected `config.json`; the outbound private SSH identity is `/home/name/.ssh/clawd_fly_tunnel` and is never included in the repository. The pinned server identity is in `/home/name/.ssh/clawd_fly_known_hosts`.

Frontend deployment source is `deploy/clawd-orin/`. Redeploy from that directory:

```sh
fly deploy --remote-only --depot=false --ha=false --yes
```

The saved tunnel script and unit use the current Orin username and hostname. Provisioning another device requires its own private/public SSH identity, an updated authorized public key, and trusted server host-key pinning. Keep `/data` persistent on the Fly machine; replacing the SSH server identity requires explicitly updating the pin on the Orin. Do not disable host-key verification.

## Verification completed

- 73 focused SOL-GPT tests passed; full application TypeScript check passed.
- Real AI SDK streaming through the public HTTPS provider produced a CLAWD response in about 2.4 seconds; a separate non-streaming completion returned `4` for `2 + 2`.
- Unauthenticated model requests returned 401.
- Stopping the outbound tunnel returned 503; restarting it restored readiness.
- Browser rendering and readiness were checked on the live frontend.

Live adapter diagnostic (set the server environment first):

```sh
node_modules/.bin/tsx scripts/check-clawd-inference.ts
```

The diagnostic supports optional `CLAWD_TEST_IP` solely for DNS-cache diagnosis; TLS hostname verification stays enabled. It prints first-token/completion timings and success checks, never generated text, upstream errors, or the API key. Each request has a 60-second timeout; `CLAWD_TEST_TIMEOUT_MS` accepts 100–120000 milliseconds. A non-streaming response must correctly answer the arithmetic probe. The temporary DNS dispatcher is restored and destroyed after the check.

## Wallet authentication maintenance

Frontend source: `deploy/clawd-orin/wallet-src.js`; build with `npm ci && npm run build` in that directory. The deployed bundle is local, with no third-party runtime CDN dependency. Backend: `auth.py`; tests: `python3 -m unittest test_auth.py -v` (requires cryptography). Live diagnostic: `python3 smoke_wallet.py`; it creates an ephemeral wallet/key, checks ownership/replay enforcement and both inference modes, then revokes its key without saving credentials.

Back up the encrypted Fly data volume using your normal volume backup process; it contains wallet addresses, key hashes, and short-lived challenges as well as the pinned SSH host key. Losing the wallet database invalidates wallet API keys. Scaling beyond one VM requires a shared authentication store and distributed inference capacity.

Wallet rollout verification (2026-09-08): six authentication tests passed. A live ephemeral Ed25519 wallet received a key and completed normal and streaming GPU inference. Origin mismatch, missing browser binding, replayed proof, unauthenticated inference, and reuse after revocation were rejected. The live UI was checked for wallet discovery and missing-wallet guidance; an interactive third-party wallet approval was not performed in the in-app browser, which has no wallet installed.
