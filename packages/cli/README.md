# `@solgpt/cli`

One-shot install for SOL-GPT:

```bash
npx @solgpt/cli login --origin https://solgpt.trade
npx @solgpt/cli mcp --tools
npx @solgpt/cli trade quote --mint <MINT> --side buy --sol 0.1
```

Talks to **`https://solgpt.trade/mcp`** (Streamable HTTP). Auth is SIWS / holder API key — never paste private keys into chat. Prefer OWS or a local keypair file with mode `0600`.

## Install

```bash
npm i -g @solgpt/cli
# or
curl -fsSL https://solgpt.trade/cli/install.sh | bash
```

## Safety

- Unsigned Solana tickets by default; your wallet signs.
- No mnemonics printed.
- Holder keys require `$CLAWD` balance.
