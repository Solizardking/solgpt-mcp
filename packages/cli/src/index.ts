#!/usr/bin/env node
/**
 * @solgpt/cli — public entrypoint.
 * Scaffold: login / mcp / trade subcommands. Auth via env SOLGPT_API_KEY or SIWS flow.
 */
const MCP_DEFAULT = process.env.SOLGPT_MCP_URL || "https://solgpt.trade/mcp";

function help() {
  console.log(`solgpt — SOL-GPT trading CLI

Usage:
  solgpt login [--origin https://solgpt.trade]
  solgpt mcp [--url ${MCP_DEFAULT}] [--tools]
  solgpt trade quote --mint <MINT> --side buy|sell [--sol <n>]
  solgpt feed [--health]
  solgpt whoami

Env:
  SOLGPT_API_KEY   bearer from holder portal (clawd_…)
  SOLGPT_MCP_URL   override MCP endpoint
  CLAWD_WS_URL     override live feed (default https://clawd-ws.fly.dev)
`);
}

async function mcpToolsList(url: string, token?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MCP ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "-h" || cmd === "--help") return help();


  if (cmd === "feed") {
    const origin = (process.env.CLAWD_WS_URL || process.env.COMPOSIO_CLAWD_WS_URL || "https://clawd-ws.fly.dev").replace(/\/$/, "");
    const healthUrl = origin + "/health";
    const res = await fetch(healthUrl, { headers: { accept: "application/json" } });
    const body = await res.text();
    let json = null;
    try { json = body ? JSON.parse(body) : null; } catch { json = { raw: body.slice(0, 400) }; }
    console.log(JSON.stringify({
      origin,
      healthUrl,
      ws: origin.replace(/^http/, "ws") + "/ws",
      ok: res.ok,
      status: res.status,
      body: json,
    }, null, 2));
    if (!res.ok) process.exit(1);
    return;
  }

  if (cmd === "whoami") {
    const key = process.env.SOLGPT_API_KEY;
    console.log(JSON.stringify({
      mcp: MCP_DEFAULT,
      apiKeyConfigured: Boolean(key && key.length > 0),
      apiKeyPrefix: key ? `${key.slice(0, 10)}…` : null,
    }, null, 2));
    return;
  }

  if (cmd === "login") {
    console.log(JSON.stringify({
      ok: false,
      message: "Open the holder portal, connect wallet, mint a key, then export SOLGPT_API_KEY.",
      portal: process.env.SOLGPT_PORTAL_URL || "https://mcp-server-production-9738.up.railway.app/",
      mcp: MCP_DEFAULT,
      next: "solgpt mcp --tools",
    }, null, 2));
    return;
  }

  if (cmd === "mcp") {
    const urlIdx = rest.indexOf("--url");
    const url = urlIdx >= 0 ? rest[urlIdx + 1] : MCP_DEFAULT;
    if (rest.includes("--tools")) {
      const out = await mcpToolsList(url || MCP_DEFAULT, process.env.SOLGPT_API_KEY);
      console.log(out);
      return;
    }
    console.log(JSON.stringify({ mcp: url || MCP_DEFAULT }, null, 2));
    return;
  }

  if (cmd === "trade") {
    const sub = rest[0];
    if (sub !== "quote") {
      console.error("Only scaffolded: solgpt trade quote …");
      process.exit(2);
    }
    console.log(JSON.stringify({
      ok: false,
      message: "Quote scaffolding — wire to MCP quote-buy / jupiter-quote next.",
      mcp: MCP_DEFAULT,
      args: rest.slice(1),
    }, null, 2));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  help();
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
