/**
 * Jupiter Price v3 / Swap v1 / Tokens v2.
 * Quotes and swap tickets are unsigned — this server never signs or submits.
 * Docs index: https://developers.jup.ag/docs/llms.txt
 */
import {
  getJupiterApiKey,
  getJupiterBase,
  getJupiterSwapV2Base,
  getJupiterTokensBase,
  jupiterHeaders,
} from "./config.ts";
import { JUPITER_DOCS_INDEX, NATIVE_MINT, UNSIGNED_NOTE } from "./constants.ts";
import { requirePubkey } from "./utils.ts";

export type JupiterFetch = typeof fetch;

export async function jupiterGet<T>(
  url: string,
  fetchImpl: JupiterFetch = fetch,
): Promise<T> {
  const res = await fetchImpl(url, {
    headers: jupiterHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Jupiter ${res.status} ${res.statusText} — ${url.split("?")[0]}${body ? ` — ${body.slice(0, 240)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export async function fetchJupiterDocsIndex(
  fetchImpl: JupiterFetch = fetch,
) {
  const res = await fetchImpl(JUPITER_DOCS_INDEX, {
    headers: { accept: "text/plain, text/markdown, */*" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Jupiter docs index HTTP ${res.status}`);
  }
  const text = await res.text();
  return {
    url: JUPITER_DOCS_INDEX,
    text,
    source: "jupiter-docs" as const,
  };
}

export async function getJupiterPrice(
  token: string,
  fetchImpl: JupiterFetch = fetch,
) {
  const mint = requirePubkey("token", token);
  const url = `${getJupiterBase()}/price/v3?ids=${encodeURIComponent(mint)}`;
  const data = await jupiterGet<
    Record<string, { usdPrice?: number; decimals?: number; priceChange24h?: number; blockId?: number }>
  >(url, fetchImpl);
  const row = data[mint];
  return {
    token: mint,
    priceUsd: row?.usdPrice ?? null,
    decimals: row?.decimals ?? null,
    priceChange24h: row?.priceChange24h ?? null,
    data,
    source: "jupiter-price-v3" as const,
  };
}

export async function getJupiterQuote(
  input: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    taker?: string;
  },
  fetchImpl: JupiterFetch = fetch,
) {
  const inputMint = requirePubkey("inputMint", input.inputMint);
  const outputMint = requirePubkey("outputMint", input.outputMint);
  const amount = String(input.amount ?? "").trim();
  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) {
    throw new Error("amount must be a positive integer in atomic units");
  }
  if (getJupiterApiKey()) {
    const url = new URL(`${getJupiterSwapV2Base()}/order`);
    url.searchParams.set("inputMint", inputMint);
    url.searchParams.set("outputMint", outputMint);
    url.searchParams.set("amount", amount);
    if (input.taker) url.searchParams.set("taker", requirePubkey("taker", input.taker));
    const data = await jupiterGet<Record<string, unknown>>(url.toString(), fetchImpl);
    return {
      inputMint,
      outputMint,
      amount,
      taker: input.taker ?? null,
      data,
      source: "jupiter-order-v2" as const,
      note: "Unsigned Meta-Aggregator order. This server never signs or submits the swap.",
    };
  }
  const slippageBps = input.slippageBps ?? 50;
  const url = new URL(`${getJupiterBase()}/swap/v1/quote`);
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount);
  url.searchParams.set("slippageBps", String(slippageBps));
  const data = await jupiterGet<unknown>(url.toString(), fetchImpl);
  return {
    inputMint,
    outputMint,
    amount,
    slippageBps,
    data,
    source: "jupiter-quote" as const,
    note: "Unsigned quote. This server never signs or submits the swap.",
  };
}

export async function searchJupiterTokens(
  query: string,
  fetchImpl: JupiterFetch = fetch,
) {
  const q = query.trim();
  if (!q) throw new Error("query is required");
  const url = `${getJupiterTokensBase()}/search?query=${encodeURIComponent(q)}`;
  const data = await jupiterGet<unknown>(url, fetchImpl);
  return { query: q, data, source: "jupiter-token-search" as const };
}

export async function jupiterPost<T>(
  url: string,
  body: unknown,
  fetchImpl: JupiterFetch = fetch,
): Promise<T> {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...jupiterHeaders({ "content-type": "application/json" }),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Jupiter ${res.status} ${res.statusText} — ${url}${text ? ` — ${text.slice(0, 240)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

/** Unsigned Swap ticket. Never signed or submitted by this server. */
export async function buildJupiterSwap(
  input: {
    inputMint: string;
    outputMint: string;
    amount: string;
    userPublicKey: string;
    slippageBps?: number;
  },
  fetchImpl: JupiterFetch = fetch,
) {
  const userPublicKey = requirePubkey("userPublicKey", input.userPublicKey);
  if (getJupiterApiKey()) {
    const order = await getJupiterQuote({ ...input, taker: userPublicKey }, fetchImpl);
    const row = order.data as {
      transaction?: string | null;
      requestId?: string;
      errorCode?: number;
      errorMessage?: string;
      router?: string;
    };
    return {
      inputMint: order.inputMint,
      outputMint: order.outputMint,
      amount: order.amount,
      userPublicKey,
      requestId: row.requestId ?? null,
      router: row.router ?? null,
      unsignedTransactionBase64: row.transaction || null,
      errorCode: row.errorCode ?? null,
      errorMessage: row.errorMessage ?? null,
      data: order.data,
      source: "jupiter-order-v2" as const,
      note: UNSIGNED_NOTE,
    };
  }
  const quote = await getJupiterQuote(input, fetchImpl);
  const data = await jupiterPost<unknown>(
    `${getJupiterBase()}/swap/v1/swap`,
    {
      quoteResponse: quote.data,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    },
    fetchImpl,
  );
  return {
    inputMint: quote.inputMint,
    outputMint: quote.outputMint,
    amount: quote.amount,
    slippageBps: quote.slippageBps,
    userPublicKey,
    quote: quote.data,
    data,
    source: "jupiter-swap-v1" as const,
    note: UNSIGNED_NOTE,
  };
}

export { NATIVE_MINT };
