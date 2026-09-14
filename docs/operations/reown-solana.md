# Reown Solana wallet connections

The public Reown project ID is `af6296db32d2075f8aaaa31245e0280f`.
All three AppKit instances use `SolanaAdapter`, `networks: [solana]`, and
Solana mainnet as the default. No EVM adapter or testnet is configured.

- SOL-GPT: `src/components/wallet/reown-wallet.tsx` bridges the existing wallet
  context. Set `REOWN_PROJECT_ID` or `NEXT_PUBLIC_REOWN_PROJECT_ID` before the
  Next build. Connect requests use the existing challenge/signature authentication;
  holder authorization remains server-side. Signing rejects a non-mainnet network.
- go-bot: `web/frontend/src/auth/reown.ts`, available in both console entries.
  Set `REOWN_PROJECT_ID` in `go-bot/.env.local`, or `VITE_REOWN_PROJECT_ID` in
  the frontend environment. `npm run build` rebuilds and synchronizes the Go
  embedded console. Rebuild the Go binary to ship the new assets. The wallet
  menu is separate from console login and does not grant API access.
- clawd-bot: `tproxy-server-master/site/wallet.js` powers the public site's
  connection button. Run `npm ci && npm run build` in that directory and serve
  `site-dist/`. Docker builds this bundle itself, with the public project ID
  supplied by `ARG REOWN_PROJECT_ID`. Connection does not grant daemon access.

Only the public project identifier is included in browser code. Never expose
server environment files or messaging credentials to the frontend. Configure
production origins in the Reown dashboard for the hosts you actually deploy.
Local build and modal checks do not prove a real wallet signature or production
origin configuration. Wallet owners must approve their connections and signatures.
