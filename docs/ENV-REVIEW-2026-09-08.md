# Supplied environment review — 2026-09-08

Key names and status only. No supplied secret values are stored here. No environment settings were overwritten.

## Supplied values missing or empty locally

These are candidates for the local features you run. They are not all mandatory for basic page serving. Production already has the principal provider and database/Redis keys configured.

| Key | Supplied | Local | Deployment allowlist |
| --- | --- | --- | --- |
| COINGECKO_API_KEY | present | missing/empty | no; handle separately |
| COMPOSIO_API_KEY | present | missing/empty | yes |
| COMPOSIO_AUTH_CONFIG_ID | present | missing/empty | yes |
| COMPOSIO_PROJECT_ID | present | missing/empty | yes |
| COMPOSIO_SIGNING_SECRET | present | missing/empty | yes |
| COMPOSIO_SUB_ID | present | missing/empty | yes |
| COMPOSIO_URL | present | missing/empty | yes |
| CONVEX_ACTIONS_URL | present | missing/empty | yes |
| CONVEX_CLOUD_URL | present | missing/empty | yes |
| CONVEX_URL | present | missing/empty | yes |
| DATABASE_URL | present | missing/empty | no; handle separately |
| ELEVEN_LABS_API_KEY | present | missing/empty | yes |
| ELEVEN_LABS_WEBHOOK_SECRET | present | missing/empty | yes |
| FAL_API_KEY | present | missing/empty | yes |
| FIRECRAWL_API_KEY | present | missing/empty | yes |
| FIRECRAWL_WEBHOOK_SIGNING_KEY | present | missing/empty | yes |
| ORGO_API_KEY | present | missing/empty | no; handle separately |
| PIPEDREAM_CLIENT_ID | present | missing/empty | yes |
| PIPEDREAM_CLIENT_SECRET | present | missing/empty | yes |
| PIPEDREAM_ENVIRONMENT | present | missing/empty | yes |
| PIPEDREAM_PROJECT_ID | present | missing/empty | yes |
| PIPEDREAM_WORKSPACE_ID | present | missing/empty | yes |
| UPSTASH_REDIS_REST_TOKEN | present | missing/empty | yes |
| UPSTASH_REDIS_REST_URL | present | missing/empty | yes |

## Do not overwrite automatically

The following supplied values differ from nonempty local settings. A difference does not establish which value is correct. Confirm intended provider/account, URLs and authentication continuity before replacement.

- `ALCHEMY_API_KEY`
- `BETTER_AUTH_API_KEY`
- `BETTER_AUTH_IDENTIFY_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BIRDEYE_WSS_URL`
- `BROWSERUSE_API_KEY`
- `DEEPGRAM_API_KEY`
- `ELEVEN_LABS_WEBHOOK_URL`
- `HAUHAU_BASE_URL`
- `HELIUS_API_KEY`
- `HELIUS_RPC_URL`
- `HONCHO_AGENT_PEER_ID`
- `HONCHO_API_KEY`
- `HONCHO_WEBHOOK`
- `HONCHO_WEBHOOK_SECRET`
- `HONCHO_WORKSPACE_ID`
- `JWKS_URL`
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `PHANTOM_APP_ID`
- `SOLANA_RPC_URL`
- `SOLANA_TRACKER_DATASTREAM_KEY`
- `SOLGPT_HTTP_REFERER`
- `SOLGPT_MODEL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CLIENT_ID`
- `TELEGRAM_CLIENT_SECRET`
- `XAI_API_KEY`

## Missing from the attachment

- `SOLGPT_CONVEX_SERVICE_SECRET`: missing locally too; use the existing matched production service secret with the completed Convex deployment.
- `CLAWD_INFERENCE_BASE_URL` and `CLAWD_INFERENCE_API_KEY`: already configured locally and in production; preserve them.
- `SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`: existing local values must be preserved.

## Not application runtime configuration

Keep `CONVEX_DEPLOY_KEY` in the deployment workflow only. Do not import generic `USER`/`URL` variables, account session tokens, unrelated Vite configuration or unreferenced provider aliases automatically. The secret sync allowlist deliberately excludes some deployment and database settings; a missing allowlist entry is not proof it should be added.

The live production failures are described in [the production audit](PRODUCTION-AUDIT-2026-09-08.md).
