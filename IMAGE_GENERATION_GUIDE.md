# Token image + metadata URI

`create_v2` takes a metadata `uri` (max 200 characters), not a raw image file.
The MCP `create-token` tool posts that URI to fun-block and returns an
**unsigned** ticket. It never uploads images itself.

## What the URI must contain

Host a JSON document (IPFS, Arweave, or HTTPS) with at least:

```json
{
  "name": "Example",
  "symbol": "EX",
  "description": "…",
  "image": "https://…/token.png"
}
```

Recommended image: square PNG, 512–1024px. Transparent background is fine.

## Optional generation

If you generate art first (desk Studio `/studio`, OpenAI Images, or any other
model), upload the PNG, publish the JSON, then pass the JSON URL as `uri`:

```
create-token user=<pubkey> name=Example symbol=EX uri=https://…/ex.json solLamports=1000000000
```

Do not pass private keys. Do not treat image generation as on-chain creation.

## Desk connection

- Unsigned create: `src/lib/solgpt/pump-fun.ts` `preparePumpCreateCoin`
- MCP host: `src/app/api/pumpfun-mcp/route.ts`
- Skill: `.agents/skills/create-coin`
