/**
 * Canonical live pump feed: https://clawd-ws.fly.dev
 * Used by MCP tools, desk, and @solgpt/cli — not docs-only.
 */
import { CLAWD_WS_ORIGIN } from "./constants.ts";

export function clawdWsOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw =
    (env.COMPOSIO_CLAWD_WS_URL ||
      env.CLAWD_WS_URL ||
      env.NEXT_PUBLIC_CLAWD_WS_HTTP_URL ||
      env.PUMP_WS_HTTP_URL ||
      CLAWD_WS_ORIGIN)
      .trim()
      .replace(/\/$/, "");
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return u.origin;
  } catch {
    return CLAWD_WS_ORIGIN;
  }
}

export function clawdWsHealthUrl(env?: NodeJS.ProcessEnv): string {
  return `${clawdWsOrigin(env)}/health`;
}

export function clawdWsWebSocketUrl(env?: NodeJS.ProcessEnv): string {
  const origin = clawdWsOrigin(env);
  return origin.replace(/^http/, "ws") + "/ws";
}

export async function fetchClawdWsHealth(
  env?: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const url = clawdWsHealthUrl(env);
  const res = await fetchImpl(url, { headers: { accept: "application/json" } });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new Error(`clawd-ws health ${res.status} at ${url}`);
  }
  return {
    origin: clawdWsOrigin(env),
    url,
    ws: clawdWsWebSocketUrl(env),
    status: res.status,
    body: json,
  };
}

/** Best-effort recent launches snapshot if the HTTP surface exposes one. */
export async function fetchClawdWsLaunches(
  opts: { limit?: number } = {},
  env?: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const origin = clawdWsOrigin(env);
  const limit = Math.max(1, Math.min(50, opts.limit ?? 20));
  const candidates = [
    `${origin}/launches?limit=${limit}`,
    `${origin}/api/launches?limit=${limit}`,
    `${origin}/tape?limit=${limit}`,
  ];
  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const res = await fetchImpl(url, { headers: { accept: "application/json" } });
      const text = await res.text();
      if (!res.ok) {
        errors.push(`${url} → ${res.status}`);
        continue;
      }
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        continue;
      }
      return { origin, url, limit, data: json };
    } catch (e) {
      errors.push(`${url} → ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  // Fall back to health so callers still get live proof of the upstream.
  const health = await fetchClawdWsHealth(env, fetchImpl);
  return {
    origin,
    limit,
    data: null,
    note: "No HTTP launches path; use wss://clawd-ws.fly.dev/ws for the live tape. Health attached.",
    tried: candidates,
    errors,
    health,
  };
}
