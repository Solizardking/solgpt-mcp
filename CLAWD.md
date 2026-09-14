# Clawd notes — Pump.fun MCP

Use this package as the Pump/Solana MCP sidecar for SOL-GPT.

- Configure MCP in Claude Desktop from `claude_desktop_config.example.json`.
- Primary RPC: `SOLANA_TRACKER_SECURE_RPC` then Tracker mainnet, then Helius.
- Market data: Solana Tracker first, Birdeye second, Jupiter Swap v1 / Price v3 / Tokens v2.
- Jupiter documentation index: https://developers.jup.ag/docs/llms.txt
- Holder keys expose public-data and unsigned-ticket tools. Operator bearer includes OWS + Composio session tools.
- Paper-gated trading elsewhere; this process only returns unsigned tickets.

See [`AGENTS.md`](./AGENTS.md) for env tables and [`DEPLOYMENT.md`](./DEPLOYMENT.md) for Fly.
