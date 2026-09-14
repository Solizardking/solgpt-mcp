/**
 * Birdeye Data API (https://public-api.birdeye.so). Secondary market data
 * after Solana Tracker.
 */
import { BIRDEYE_PUBLIC_API, getBirdeyeApiKey } from "./config.ts";
import { requirePubkey } from "./utils.ts";

export type BirdeyeFetch = typeof fetch;

function requireKey(): string {
  const key = getBirdeyeApiKey();
  if (!key) {
    throw new Error("Birdeye is not configured — set BIRDEYE_API_KEY");
  }
  return key;
}

export function birdeyeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    accept: "application/json",
    "X-API-KEY": requireKey(),
    "x-chain": "solana",
    ...extra,
  };
}

export async function birdeyeGet<T>(
  pathAndQuery: string,
  fetchImpl: BirdeyeFetch = fetch,
): Promise<T> {
  const url = pathAndQuery.startsWith("http")
    ? pathAndQuery
    : `${BIRDEYE_PUBLIC_API}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
  const res = await fetchImpl(url, {
    headers: birdeyeHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Birdeye ${res.status} ${res.statusText} — ${url.split("?")[0]}${body ? ` — ${body.slice(0, 240)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export async function getBirdeyePrice(
  token: string,
  fetchImpl: BirdeyeFetch = fetch,
) {
  const mint = requirePubkey("token", token);
  const data = await birdeyeGet<{
    success?: boolean;
    data?: { value?: number; priceChange24h?: number; liquidity?: number };
  }>(`/defi/price?address=${encodeURIComponent(mint)}&include_liquidity=true`, fetchImpl);
  return {
    token: mint,
    priceUsd: data.data?.value ?? null,
    priceChange24h: data.data?.priceChange24h ?? null,
    liquidity: data.data?.liquidity ?? null,
    data,
    source: "birdeye-price" as const,
  };
}

export async function getBirdeyeToken(
  token: string,
  fetchImpl: BirdeyeFetch = fetch,
) {
  const mint = requirePubkey("token", token);
  const data = await birdeyeGet<unknown>(
    `/defi/token_overview?address=${encodeURIComponent(mint)}`,
    fetchImpl,
  );
  return { token: mint, data, source: "birdeye-token" as const };
}
