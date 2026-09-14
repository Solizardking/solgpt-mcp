# Pump.fun MCP server — agent notes

This directory is the standalone Pump.fun + market-data MCP server
(`@sol-gpt/pumpfun-mcp-server`). It builds **unsigned** tickets only: it never
holds wallet secrets and never submits transactions.

## Primary Solana plane

Keyed Alchemy is the primary JSON-RPC, then Helius, then leftover Tracker
Secure/mainnet as last-resort. Tracker Data API is unchanged.

| Role | Env | Host |
|---|---|---|
| Primary RPC | `ALCHEMY_API_KEY` / `ALCHEMY_RPC_URL` | `solana-mainnet.g.alchemy.com` |
| Helius RPC | `HELIUS_RPC_URL` | `mainnet.helius-rpc.com` |
| Chain-RPC aliases | `SOLANA_RPC_URL` / `RPC_URL` | not `*.solanatracker.io` |
| Tracker last-resort | `SOLANA_TRACKER_SECURE_RPC` / `SECURE_RPC_URL` / `SOLANA_TRACKER_RPC_URL` | `*.solanatracker.io` |
| Logs WSS | `SOLANA_TRACKER_WSS_URL` / `WSS_URL` | `wss://rpc-mainnet.solanatracker.io` |
| RPC access key | `SOLANA_TRACKER_ACCESS_KEY` / `ACCESS_KEY` | `api_key` query |
| Data API | `SOLANA_TRACKER_API_KEY` | `https://data.solanatracker.io` |

`rpcUrl()` in `config.ts` encodes that order. Do not put Tracker JSON-RPC first.

## Secondary data

- **Birdeye** — `BIRDEYE_API_KEY`, `BIRDEYE_WSS_URL` (`public-api.birdeye.so`)
- **Jupiter** — `JUPITER_API_KEY` / `JUP_SWAP_V1_API_KEY`, `JUPITER_TOKENS_BASE`
  - Docs index: https://developers.jup.ag/docs/llms.txt
  - Price v3: `GET /price/v3`
  - Swap v1 quote: `GET /swap/v1/quote`
  - Unsigned swap ticket: `POST /swap/v1/swap`
  - Tokens v2: `GET /tokens/v2/search`
  - Do **not** use `tx.jup.ag` sendTransaction from this server.

## Run

```bash
npx tsx index.ts
npx tsx index.ts --http
npx tsx index.ts --tools
npm test
```

Local secrets live in `.env.local` (gitignored). Templates: `env.example`.

## Layout

| Path | What |
|---|---|
| `index.ts` / `boot.ts` / `http.ts` | stdio + Streamable HTTP + Fly boot |
| `server.ts` | MCP tools + resources |
| `config.ts` | env resolution (Alchemy, Helius, Tracker last-resort) |
| `solanatracker.ts` / `birdeye.ts` / `jupiter.ts` | market-data clients |
| `rpc.ts` | JSON-RPC helpers using `rpcUrl()` |
| `src/` | legacy pumpdotfun-sdk CLI helpers (uses `rpcUrl()`) |

Never commit `.env`, `.env.local`, or `keys/`.
