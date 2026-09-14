import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NATIVE_MINT } from "./constants.ts";
import { JUPITER_DOCS_INDEX } from "./constants.ts";
import {
  buildJupiterSwap,
  fetchJupiterDocsIndex,
  getJupiterPrice,
  getJupiterQuote,
  searchJupiterTokens,
} from "./jupiter.ts";

const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const KEY = "jup_test_key";
const ENV_KEYS = [
  "JUPITER_API_KEY",
  "JUP_SWAP_V1_API_KEY",
  "JUPITER_API_BASE",
  "JUPITER_TOKENS_BASE",
] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Jupiter API (shipped)", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    for (const key of ENV_KEYS) delete process.env[key];
    process.env.JUPITER_API_KEY = KEY;
    process.env.JUPITER_TOKENS_BASE = "https://api.jup.ag/tokens/v2";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("getJupiterPrice hits /price/v3 with x-api-key", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ [MINT]: { usdPrice: 1.00, decimals: 6, priceChange24h: 0.5 } }),
    );
    const result = await getJupiterPrice(MINT);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(`https://api.jup.ag/price/v3?ids=${MINT}`);
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(KEY);
    expect(result.source).toBe("jupiter-price-v3");
    expect(result.priceUsd).toBe(1);
  });

  it("getJupiterQuote hits /swap/v2/order with x-api-key and stays unsigned", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ outAmount: "100", transaction: null }));
    const result = await getJupiterQuote({
      inputMint: NATIVE_MINT,
      outputMint: MINT,
      amount: "1000000000",
    });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("https://api.jup.ag/swap/v2/order?");
    expect(String(url)).toContain(`inputMint=${NATIVE_MINT}`);
    expect(String(url)).toContain(`outputMint=${MINT}`);
    expect(String(url)).toContain("amount=1000000000");
    expect(String(url)).not.toContain("slippageBps=");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(KEY);
    expect(result.source).toBe("jupiter-order-v2");
    expect(result.note).toMatch(/never signs/i);
  });

  it("searchJupiterTokens hits JUPITER_TOKENS_BASE/search", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse([{ symbol: "USDC" }]));
    const result = await searchJupiterTokens("USDC");
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(String(url)).toBe("https://api.jup.ag/tokens/v2/search?query=USDC");
    expect(result.source).toBe("jupiter-token-search");
  });

  it("fetchJupiterDocsIndex hits the official developers.jup.ag llms.txt", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("# Jupiter\n", { status: 200 }));
    const result = await fetchJupiterDocsIndex();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(String(url)).toBe(JUPITER_DOCS_INDEX);
    expect(JUPITER_DOCS_INDEX).toBe("https://developers.jup.ag/docs/llms.txt");
    expect(result.source).toBe("jupiter-docs");
    expect(result.text).toContain("Jupiter");
  });

  it("buildJupiterSwap gets unsigned /swap/v2/order with taker and never /execute", async () => {
    const user = "BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        outAmount: "100",
        transaction: "AQID",
        requestId: "req-1",
        router: "metis",
      }),
    );
    const result = await buildJupiterSwap({
      inputMint: NATIVE_MINT,
      outputMint: MINT,
      amount: "1000000000",
      userPublicKey: user,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("https://api.jup.ag/swap/v2/order?");
    expect(String(url)).toContain(`taker=${user}`);
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(KEY);
    expect(result.source).toBe("jupiter-order-v2");
    expect(result.note).toMatch(/never holds keys/i);
    expect(result.unsignedTransactionBase64).toBe("AQID");
    expect(result.requestId).toBe("req-1");
    expect(fetchSpy.mock.calls.some((c) => String(c[0]).includes("/execute"))).toBe(
      false,
    );
  });
});
