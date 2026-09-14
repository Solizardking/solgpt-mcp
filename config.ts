/**
 * Env resolution for the Pump.fun MCP server.
 *
 * Keyed Alchemy is the primary JSON-RPC, then Helius, then leftover Tracker
 * Secure/mainnet as last-resort. Tracker Data API (data.solanatracker.io) is
 * unchanged. Secrets never leave this module as raw URLs in tool output —
 * use describeRpcConfig() which redacts query keys and Alchemy path keys.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const SOLANA_TRACKER_DATA_API = "https://data.solanatracker.io";
export const SOLANA_TRACKER_RPC_HOST = "rpc-mainnet.solanatracker.io";
export const BIRDEYE_PUBLIC_API = "https://public-api.birdeye.so";
export const JUPITER_API = "https://api.jup.ag";
export const JUPITER_LITE_API = "https://lite-api.jup.ag";
export const PUBLIC_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

export function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return (value && value.trim()) || fallback;
}

/** Parse KEY=VALUE files without overriding vars already in the process. */
export function loadLocalEnv(root = here): string[] {
  const loaded: string[] = [];
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key]) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
    loaded.push(name);
  }
  return loaded;
}

/** RPC access key (`api_key` query). Distinct from the Data API key. */
export function getSolanaTrackerAccessKey(): string | null {
  return env("SOLANA_TRACKER_ACCESS_KEY") || env("ACCESS_KEY") || null;
}

/**
 * Data API key (`x-api-key` on data.solanatracker.io).
 * ACCESS_KEY is a different product and 401s on the Data API — never fall back to it.
 */
export function getSolanaTrackerDataKey(): string | null {
  return (
    env("SOLANATRACKER_API_KEY") ||
    env("SOLANA_TRACKER_API_KEY") ||
    env("SOLANA_TRACKER_DATA_API_KEY") ||
    env("TRACKER_API_KEY") ||
    null
  );
}

export function getSolanaTrackerDataUrl(): string {
  return (
    env("SOLANATRACKER_URL") ||
    env("SOLANA_TRACKER_URL") ||
    env("SOLANA_TRACKER_DATA_URL") ||
    SOLANA_TRACKER_DATA_API
  ).replace(/\/$/, "");
}

export function getBirdeyeApiKey(): string | null {
  return env("BIRDEYE_API_KEY") || null;
}

export function getBirdeyeWsUrl(): string | null {
  const explicit = env("BIRDEYE_WSS_URL");
  if (explicit) return explicit;
  const key = getBirdeyeApiKey();
  if (!key) return null;
  return `wss://public-api.birdeye.so/socket/solana?x-api-key=${key}`;
}

export function getJupiterApiKey(): string | null {
  return env("JUPITER_API_KEY") || env("JUP_SWAP_V1_API_KEY") || null;
}

export function getJupiterBase(): string {
  const apiBase = env("JUPITER_API_BASE");
  if (apiBase) return apiBase.replace(/\/$/, "");
  if (getJupiterApiKey()) return JUPITER_API;
  return JUPITER_LITE_API;
}

export function getJupiterTokensBase(): string {
  const tokens = env("JUPITER_TOKENS_BASE");
  if (tokens) return tokens.replace(/\/$/, "");
  return `${getJupiterBase()}/tokens/v2`;
}

export function jupiterHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const key = getJupiterApiKey();
  return {
    accept: "application/json",
    ...(key ? { "x-api-key": key } : {}),
    ...extra,
  };
}

/** Swap API V2 Meta-Aggregator (`GET /order`, `POST /execute`). Requires x-api-key. */
export function getJupiterSwapV2Base(): string {
  const apiBase = env("JUPITER_API_BASE");
  const host = apiBase ? apiBase.replace(/\/$/, "") : JUPITER_API;
  return `${host}/swap/v2`;
}

function constructedTrackerRpc(key: string | null): string {
  if (!key) return "";
  const u = new URL(`https://${SOLANA_TRACKER_RPC_HOST}/`);
  u.searchParams.set("api_key", key);
  return u.toString();
}

function constructedTrackerWss(key: string | null): string {
  if (!key) return "";
  const u = new URL(`wss://${SOLANA_TRACKER_RPC_HOST}/`);
  u.searchParams.set("api_key", key);
  return u.toString();
}

function heliusRpc(): string {
  const explicit = env("HELIUS_RPC_URL");
  if (explicit) return explicit;
  const key = env("HELIUS_API_KEY");
  if (!key) return "";
  const u = new URL("https://mainnet.helius-rpc.com/");
  u.searchParams.set("api-key", key);
  return u.toString();
}

/** Keyed Alchemy Solana HTTPS RPC. Path is `/v2/$ALCHEMY_API_KEY`. */
export function alchemyRpc(): string {
  const explicit = env("ALCHEMY_RPC_URL");
  if (explicit) return explicit;
  const key = env("ALCHEMY_API_KEY");
  if (!key) return "";
  const network = env("ALCHEMY_SOLANA_NETWORK", "solana-mainnet");
  return `https://${network}.g.alchemy.com/v2/${key}`;
}

function uniqueUrls(raw: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of raw) {
    const trimmed = (url || "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Primary Solana JSON-RPC candidates. Keyed Alchemy first, then Helius,
 * leftover Tracker Secure/mainnet last-resort, then public mainnet.
 */
export function getRpcUrlCandidates(): string[] {
  const access = getSolanaTrackerAccessKey();
  return uniqueUrls([
    alchemyRpc(),
    heliusRpc(),
    env("SOLANA_TRACKER_SECURE_RPC"),
    env("SECURE_RPC_URL"),
    env("SOLANA_TRACKER_RPC_URL"),
    env("SOLANA_RPC_URL"),
    env("RPC_URL"),
    constructedTrackerRpc(access),
    env("SOLANA_BACKUP_RPC_URL"),
    env("SOLANA_PUBLIC_RPC_URL"),
    PUBLIC_SOLANA_RPC,
  ]);
}

export function rpcUrl(): string {
  return getRpcUrlCandidates()[0] ?? PUBLIC_SOLANA_RPC;
}

export function getWsUrlCandidates(): string[] {
  const access = getSolanaTrackerAccessKey();
  const fromRpc = httpToWs(rpcUrl());
  return uniqueUrls([
    env("SOLANA_TRACKER_WSS_URL"),
    env("WSS_URL"),
    constructedTrackerWss(access),
    fromRpc,
  ]);
}

export function getWsUrl(): string {
  return getWsUrlCandidates()[0] ?? httpToWs(PUBLIC_SOLANA_RPC);
}

export function httpToWs(url: string): string {
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
  return url;
}

export function rpcHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of ["api_key", "api-key", "x-api-key"]) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "REDACTED");
    }
    if (parsed.hostname.toLowerCase().includes("alchemy.com")) {
      const parts = parsed.pathname.split("/");
      const i = parts.indexOf("v2");
      if (i >= 0 && parts[i + 1]) parts[i + 1] = "REDACTED";
      parsed.pathname = parts.join("/");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function primaryRpcProvider(
  url = rpcUrl(),
): "alchemy" | "helius" | "solana-tracker" | "solana-public" | "other" {
  const host = rpcHost(url).toLowerCase();
  if (host.includes("alchemy.com")) return "alchemy";
  if (host.includes("helius")) return "helius";
  if (host.includes("solanatracker.io")) return "solana-tracker";
  if (host === "api.mainnet-beta.solana.com") return "solana-public";
  return "other";
}

export type RpcConfig = {
  provider: ReturnType<typeof primaryRpcProvider>;
  rpcHost: string;
  rpcUrl: string;
  rpcCandidates: string[];
  wssHost: string;
  wssUrl: string;
  dataApi: string;
  tracker: { accessKey: boolean; dataKey: boolean };
  birdeye: { configured: boolean; host: string; wssConfigured: boolean };
  jupiter: { configured: boolean; base: string; tokensBase: string };
};

/** Public config snapshot — query keys are always redacted. */
export function describeRpcConfig(): RpcConfig {
  const rpc = rpcUrl();
  const wss = getWsUrl();
  return {
    provider: primaryRpcProvider(rpc),
    rpcHost: rpcHost(rpc),
    rpcUrl: redactUrl(rpc),
    rpcCandidates: getRpcUrlCandidates().map((u) => rpcHost(u)),
    wssHost: rpcHost(wss),
    wssUrl: redactUrl(wss),
    dataApi: getSolanaTrackerDataUrl(),
    tracker: {
      accessKey: Boolean(getSolanaTrackerAccessKey()),
      dataKey: Boolean(getSolanaTrackerDataKey()),
    },
    birdeye: {
      configured: Boolean(getBirdeyeApiKey()),
      host: "public-api.birdeye.so",
      wssConfigured: Boolean(getBirdeyeWsUrl()),
    },
    jupiter: {
      configured: Boolean(getJupiterApiKey()),
      base: getJupiterBase(),
      tokensBase: getJupiterTokensBase(),
    },
  };
}
