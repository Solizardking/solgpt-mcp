import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBirdeyePrice, getBirdeyeToken } from "./birdeye.ts";

const MINT = "So11111111111111111111111111111111111111112";
const KEY = "test-birdeye-key";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Birdeye Data API (shipped)", () => {
  const saved = process.env.BIRDEYE_API_KEY;

  beforeEach(() => {
    process.env.BIRDEYE_API_KEY = KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (saved === undefined) delete process.env.BIRDEYE_API_KEY;
    else process.env.BIRDEYE_API_KEY = saved;
  });

  it("getBirdeyePrice hits /defi/price with X-API-KEY", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        data: { value: 150.5, priceChange24h: 2.5, liquidity: 1_000_000 },
      }),
    );
    const result = await getBirdeyePrice(MINT);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("https://public-api.birdeye.so/defi/price?");
    expect(String(url)).toContain(`address=${MINT}`);
    expect(String(url)).toContain("include_liquidity=true");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-KEY"]).toBe(KEY);
    expect(headers["x-chain"]).toBe("solana");
    expect(result.source).toBe("birdeye-price");
    expect(result.priceUsd).toBe(150.5);
  });

  it("getBirdeyeToken hits /defi/token_overview", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ success: true, data: { symbol: "SOL" } }));
    const result = await getBirdeyeToken(MINT);
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(String(url)).toContain(
      "https://public-api.birdeye.so/defi/token_overview?",
    );
    expect(String(url)).toContain(`address=${MINT}`);
    expect(result.source).toBe("birdeye-token");
  });
});
