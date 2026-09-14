# Deployment

The Fly app is `solgpt-pumpfun-mcp`. Docker build context **must** be the
repository root (`sol-gpt/`), because the image copies `mcp-server/*.ts` plus
`docs/`.

```bash
# from mcp-server/
./deploy.sh

# from repo root
fly deploy --config mcp-server/fly.toml --dockerfile mcp-server/Dockerfile --ha=false
```

Do not run bare `fly deploy` from this folder — the context would be
`mcp-server/` and `/mcp-server/package.json` would be missing.

## Secrets (never in git)

Set Fly secrets before the first public listener:

- `MCP_HTTP_AUTH_TOKEN` (required for non-loopback HTTP)
- `ALCHEMY_API_KEY` / `ALCHEMY_RPC_URL` (primary JSON-RPC)
- `HELIUS_RPC_URL`
- `SOLANA_RPC_URL` / `RPC_URL` (not Tracker hosts)
- `SOLANA_TRACKER_SECURE_RPC` / `SOLANA_TRACKER_RPC_URL` (last-resort JSON-RPC)
- `SOLANA_TRACKER_WSS_URL`
- `SOLANA_TRACKER_ACCESS_KEY`
- `SOLANA_TRACKER_API_KEY` (Data API; do not fall back to access key)
- `BIRDEYE_API_KEY`
- `JUPITER_API_KEY`
- `DFLOW_API_KEY` / `COMPOSIO_API_KEY` as needed

Clients: `https://solgpt-pumpfun-mcp.fly.dev/mcp` with
`Authorization: Bearer <token>`. `GET /health` is public.

`PUBLIC_ORIGIN` binds the Clawd holder portal. `API_DATA_DIR=/data` stores the
SQLite access database on the `clawd_access` volume. Keep one Machine until a
shared database exists.

## Local

Copy `env.example` to `.env.local`. `index.ts` loads `.env.local` then `.env`
without overriding already-set process env.
