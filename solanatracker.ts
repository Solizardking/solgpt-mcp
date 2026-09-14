/**
 * Solana Tracker Data API (https://data.solanatracker.io).
 * Primary market-data source. RPC lives in config.ts / rpc.ts.
 */
import {
  getSolanaTrackerDataKey,
  getSolanaTrackerDataUrl,
} from "./config.ts";
import { requirePubkey } from "./utils.ts";

export type TrackerFetch = typeof fetch;

const TIMEFRAMES = ["5m", "15m", "30m", "1h", "6h", "12h", "24h"] as const;
export type TrackerTimeframe = (typeof TIMEFRAMES)[number];

function requireDataKey(): string {
  const key = getSolanaTrackerDataKey();
  if (!key) {
    throw new Error(
      "Solana Tracker data API is not configured — set SOLANATRACKER_API_KEY or SOLANA_TRACKER_API_KEY",
    );
  }
  return key;
}

export function trackerHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    accept: "application/json",
    "x-api-key": requireDataKey(),
    ...extra,
  };
}

export async function trackerGet<T>(
  pathAndQuery: string,
  fetchImpl: TrackerFetch = fetch,
): Promise<T> {
  const base = getSolanaTrackerDataUrl();
  const url = pathAndQuery.startsWith("http")
    ? pathAndQuery
    : `${base}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
  const res = await fetchImpl(url, {
    headers: trackerHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Solana Tracker ${res.status} ${res.statusText} — ${url.split("?")[0]}${body ? ` — ${body.slice(0, 240)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export async function getTrackerPrice(
  token: string,
  fetchImpl: TrackerFetch = fetch,
) {
  const mint = requirePubkey("token", token);
  const data = await trackerGet<unknown>(`/price?token=${encodeURIComponent(mint)}`, fetchImpl);
  return { token: mint, data, source: "solanatracker-price" as const };
}

export async function getTrackerToken(
  token: string,
  fetchImpl: TrackerFetch = fetch,
) {
  const mint = requirePubkey("token", token);
  const data = await trackerGet<unknown>(`/tokens/${encodeURIComponent(mint)}`, fetchImpl);
  return { token: mint, data, source: "solanatracker-token" as const };
}

export async function getTrackerTrending(
  timeframe: string = "1h",
  fetchImpl: TrackerFetch = fetch,
) {
  const tf = (TIMEFRAMES as readonly string[]).includes(timeframe)
    ? timeframe
    : "1h";
  const data = await trackerGet<unknown>(
    `/tokens/trending?timeframe=${encodeURIComponent(tf)}`,
    fetchImpl,
  );
  return { timeframe: tf, data, source: "solanatracker-trending" as const };
}
