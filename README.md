# SOL-GPT MCP (`@solgpt/mcp`)

Official public MCP for [SOL-GPT](https://solgpt.trade).

**Connect:** `https://solgpt.trade/mcp` (Grok, ChatGPT, Cursor, Claude Desktop, etc.)

- Pump.fun + Jupiter / DFlow / Birdeye tools (unsigned tickets only)
- Live pump/backend reference: `https://clawd-ws.fly.dev`
- First-class OWS wallet tools — public addresses + signatures only; never mnemonics/private keys
- OpenRouter model catalog/chat + RedPill TEE routing when `REDPILL_API_KEY` is set

---

# Pump.fun MCP server

Model Context Protocol server for Pump.fun, PumpSwap, DFlow, and Composio
sessions. It exposes the `docs/` IDLs and instruction manuals as resources,
builds **unsigned** tickets (never signs or broadcasts), and includes live
stream helpers for Pump program logs and DFlow priority fees.

This package is wired into the SOL-GPT desk at `POST /api/pumpfun-mcp`
(`src/app/api/pumpfun-mcp/route.ts`) using the same bearer as `/api/mcp`.

SOL-GPT is a **client** of MoonPay PayBox (`https://api.paybox.sh/mcp`) — this
Pump.fun server does not rehost PayBox tools. Desk chat loads `mcp_paybox_*`
via `PAYBOX_ACCESS_TOKEN`; the CLI is `mcp-client --paybox`. Skills live in
`.agents/skills/paybox-*` and `mcp-server/skills/paybox-*`.

## Run

```bash
# From the repo root (sol-gpt/)
npx tsx mcp-server/index.ts
npx tsx mcp-server/index.ts --http   # http://127.0.0.1:8788/mcp
npx tsx mcp-server/index.ts --tools
npm run pumpfun:mcp
npm run pumpfun:mcp:http

# From this directory (mcp-server/)
npx tsx index.ts
npx tsx index.ts --http
npx tsx index.ts --tools
npm start
npm run start:http
# The root command still works here via mcp-server/mcp-server/index.ts
npx tsx mcp-server/index.ts --tools
```

Env:

| Variable | Use |
|---|---|
| `ALCHEMY_API_KEY` / `ALCHEMY_RPC_URL` | **primary** Solana JSON-RPC (`https://solana-mainnet.g.alchemy.com/v2/<key>`) |
| `HELIUS_RPC_URL` | Helius JSON-RPC (after keyed Alchemy) |
| `SOLANA_RPC_URL` / `RPC_URL` | chain-RPC aliases (do not point at `solanatracker.io`) |
| `SOLANA_TRACKER_SECURE_RPC` / `SECURE_RPC_URL` | Tracker Secure JSON-RPC last-resort |
| `SOLANA_TRACKER_RPC_URL` | Tracker mainnet RPC last-resort |
| `SOLANA_TRACKER_WSS_URL` / `WSS_URL` | Tracker logsSubscribe WebSocket |
| `SOLANA_TRACKER_ACCESS_KEY` / `ACCESS_KEY` | Tracker RPC `api_key` (not Data API) |
| `SOLANA_TRACKER_API_KEY` | Tracker Data API `x-api-key` on `https://data.solanatracker.io` |
| `BIRDEYE_API_KEY` / `BIRDEYE_WSS_URL` | secondary market data |
| `JUPITER_API_KEY` / `JUP_SWAP_V1_API_KEY` / `JUPITER_TOKENS_BASE` | price, unsigned quotes, token search |
| `DFLOW_API_KEY` | prod `https://quote-api.dflow.net` (`x-api-key`) |
| `COMPOSIO_API_KEY` | live `composio.create(userId, { mcp: true })` |
| `COMPOSIO_SIGNING_SECRET` / `COMPOSIO_WEBHOOK_SECRET` | verify trigger deliveries at `COMPOSIO_URL` |
| `COMPOSIO_SUB_ID` | webhook subscription id |
| `COMPOSIO_PROJECT_ID` | Platform project id |
| `COMPOSIO_URL` | `https://solgpt.us/api/composio/triggers` |
| `COMPOSIO_CLAWD_WS_URL` | attached origin `https://clawd-ws.fly.dev` |
| `OWS_BIN` | Open Wallet Standard CLI (`~/.ows/bin/ows` by default) |
| `KEYS_FOLDER` | optional public-wallet listing (secrets never returned) |

## Tools

Pump.fun: `get-token-info`, `get-account-balance`, `list-accounts`,
`create-token`, `buy-token`, `sell-token`, `quote-buy`, `quote-sell`,
`inspect-fees`, `collect-creator-fee`, `set-sharing-config`,
`get-fee-recipients`, `get-fee-tiers`, `get-program-ids`, `search-docs`,
`get-instruction`, `get-idl`, `parse-program-logs`, `stream-status`.

Solana Tracker (primary RPC + data): `get-rpc-config`, `tracker-price`,
`tracker-token`, `tracker-trending`.

Birdeye: `birdeye-price`, `birdeye-token`.

Jupiter (unsigned Swap v1 / Price v3 / Tokens v2): `jupiter-docs-index`,
`jupiter-price`, `jupiter-quote`, `jupiter-swap`, `jupiter-token`.
Docs index: https://developers.jup.ag/docs/llms.txt

DFlow: `dflow-docs-index` (https://pond.dflow.net/llms.txt),
`dflow-priority-fees` (`GET /priority-fees`), `dflow-order` (`GET /order`),
`dflow-priority-fees-stream-url`.

Composio: `composio-session-mcp` (`mcp: true` sessions, REST v3.1),
`composio-docs`.

OWS (`~/.ows` vault, keys never returned): `ows-wallet-list`,
`ows-wallet-create`, `ows-sign-message`, `ows-sign-tx` (hex or Solana base64).
Existing `agent-treasury` wallet is reused; create is a no-op if the name exists.

Amounts are integer strings in atomic units. Private keys are rejected.

## Composio custom MCP

Register this server (or the desk `/api/mcp`) with Composio Platform:

```bash
node --env-file-if-exists=.env.local --experimental-strip-types \
  scripts/composio-custom-mcp.ts upsert
```

Then create a session with `mcp: true` and `sessionPreset: "direct_tools"` so
clients see a single hosted MCP URL. See `composio://sessions-via-mcp`.

## Docs catalog

Resources under `pump://docs/...` map to `/Users/8bit/sol-gpt/docs`
(program READMEs, IDLs, buy/sell/create/fee instructions).

## Fly.io deployment

This package deploys separately as `solgpt-pumpfun-mcp`. The Docker build
context **must** be the repository root: the Dockerfile copies
`mcp-server/package.json`, runtime TypeScript, `mcp-server/public/`, and
repo-root `docs/`. `fly.toml` points at `Dockerfile.dockerignore`, which keeps
`node_modules/`, `.env*` files, and `keys/` out of the upload.

From `sol-gpt/` (repository root):

```bash
fly deploy --config mcp-server/fly.toml --dockerfile mcp-server/Dockerfile --ha=false
```

From `mcp-server/`, do **not** run bare `fly deploy` — that uses this folder as
the build context and fails with `/mcp-server/package.json: not found`. Use:

```bash
./deploy.sh
```

`deploy.sh` changes to the repository root, then runs the same `fly deploy`
invocation. Extra flags (`--remote-only`, `--build-only`, …) pass through.

Set `MCP_HTTP_AUTH_TOKEN` as a Fly secret before the first deployment. Clients
connect to `https://solgpt-pumpfun-mcp.fly.dev/mcp` with
`Authorization: Bearer <token>`. `GET /health` is public. A non-loopback HTTP
listener refuses to start without the token. Local stdio is unchanged.

Runtime integrations use Fly secrets: `ALCHEMY_API_KEY` / `ALCHEMY_RPC_URL`
(primary), `HELIUS_RPC_URL`, `SOLANA_RPC_URL` / `RPC_URL` (not Tracker),
`SOLANA_TRACKER_ACCESS_KEY` / `SOLANA_TRACKER_API_KEY` (Data API),
`BIRDEYE_API_KEY`, `JUPITER_API_KEY`, Tracker JSON-RPC last-resort,
`DFLOW_API_KEY`, and `COMPOSIO_API_KEY` as needed. OWS tools require a separately
installed CLI and provisioned persistent vault; this image does not include a
wallet or signing keys. Unsigned transaction builders remain available.

## Integration smoke checks

From the repository root, `npm run smoke:mcp` exercises the standalone stdio
server, private computer tunnel entry, and both app MCP route handlers. It lists
tools, reads Pump documentation, and verifies the app's authentication gate.
`npm --prefix mcp-client test` builds the CLI and checks credential routing.

For an authenticated deployed web smoke, run `scripts/mcp-integration-smoke.ts`
with `MCP_SMOKE_BASE_URL=https://solgpt.us` and `SOLGPT_MCP_TOKEN` in the process
environment. To include the separately deployed Pump server, set
`MCP_SMOKE_PUMP_URL=https://solgpt-pumpfun-mcp.fly.dev/mcp` and
`SOLGPT_PUMP_MCP_TOKEN`. The latter must match that app's `MCP_HTTP_AUTH_TOKEN`.
Do not substitute the desk token for the dedicated Pump credential.

The web image ships `docs/` at `/app/docs` and sets `PUMP_DOCS_ROOT` so the
bundled Next route can locate the catalog independently of webpack paths.
`packages/browser-agent` is consumed by the desk's browser voice component;
the other package directories are standalone utilities, not background MCP
services that need a Fly listener.

## Clawd holder developer portal

The homepage at `https://solgpt-pumpfun-mcp.fly.dev/` supports Phantom, Solflare,
and Backpack in browsers with an injected Solana wallet (on mobile, use the
wallet app's browser). Sign-in uses a five-minute, one-use Ed25519 challenge,
then a one-hour HttpOnly session cookie. Signing does not transfer tokens.

Any positive balance of mint `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
is eligible. The application asks for a project name and use case; eligible
holders are approved automatically. The server checks holdings through Solana
RPC when issuing a key and at most 60 seconds apart during authenticated use.
RPC failures fail closed. There are no wallet allowlist bypasses.

Each wallet can maintain three active `clawd_` keys, with a combined limit of
60 MCP requests per minute. Raw keys are shown once; only SHA-256 hashes are
stored. Owners can list masked keys and revoke them immediately from the page.
Holder keys expose public-data and unsigned-transaction tools (every tool except
the six operator-only wallet/Composio tools). Operator-only wallet listing/signing
and private Composio session creation remain excluded. The operator bearer
continues to expose the full tool list from `listPumpFunMcpToolNames()`.

`PUBLIC_ORIGIN` binds sign-in to this site. `API_DATA_DIR=/data` stores the SQLite
database on the `clawd_access` Fly volume. Keep one application Machine for this
volume-backed design; use a shared database before scaling across Machines.
Fly snapshots are enabled for the volume. `boot.ts` assigns the mount to the
Node user and drops root privileges before starting the HTTP server.

Local development requires Node 24. `npm run typecheck` checks the standalone
runtime; `npm test` includes wallet verification, issuance, revocation,
persistence, and holder tool-scope tests. Mock balances are injected only by
tests; the production runtime has no mock-balance environment switch.
