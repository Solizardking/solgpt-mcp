import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTrackerPrice,
  getTrackerToken,
  getTrackerTrending,
  trackerHeaders,
} from "./solanatracker.ts";

const MINT = "So11111111111111111111111111111111111111112";
const KEY = "test-tracker-data-key";
const ENV_KEYS = [
  "SOLANATRACKER_API_KEY",
  "SOLANA_TRACKER_API_KEY",
  "SOLANA_TRACKER_DATA_API_KEY",
  "TRACKER_API_KEY",
  "SOLANA_TRACKER_ACCESS_KEY",
  "ACCESS_KEY",
  "SOLANATRACKER_URL",
  "SOLANA_TRACKER_URL",
  "SOLANA_TRACKER_DATA_URL",
] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Solana Tracker Data API (shipped)", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    for (const key of ENV_KEYS) delete process.env[key];
    process.env.SOLANA_TRACKER_API_KEY = KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("getTrackerPrice hits /price with x-api-key", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ price: 150.25, priceChange24h: 1.2 }),
    );
    const result = await getTrackerPrice(MINT);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(
      `https://data.solanatracker.io/price?token=${MINT}`,
    );
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(KEY);
    expect(result.source).toBe("solanatracker-price");
    expect(result.token).toBe(MINT);
  });

  it("getTrackerToken hits /tokens/{mint}", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ token: { mint: MINT } }));
    const result = await getTrackerToken(MINT);
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(String(url)).toBe(`https://data.solanatracker.io/tokens/${MINT}`);
    expect(result.source).toBe("solanatracker-token");
  });

  it("getTrackerTrending hits /tokens/trending", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse([]));
    const result = await getTrackerTrending("1h");
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(String(url)).toBe(
      "https://data.solanatracker.io/tokens/trending?timeframe=1h",
    );
    expect(result.source).toBe("solanatracker-trending");
  });

  it("does not send ACCESS_KEY as Data API x-api-key", () => {
    delete process.env.SOLANA_TRACKER_API_KEY;
    process.env.SOLANA_TRACKER_ACCESS_KEY = "access-only";
    process.env.ACCESS_KEY = "access-only";
    expect(() => trackerHeaders()).toThrow(/SOLANA_TRACKER_API_KEY/);
  });
});
