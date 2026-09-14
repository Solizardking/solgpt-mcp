import {
  DFLOW_DOCS_INDEX,
  DFLOW_TRADE_API,
  DFLOW_TRADE_API_DEV,
  UNSIGNED_NOTE,
} from "./constants.ts";
import { requirePubkey } from "./utils.ts";
import { assertNoSecretFields, requirePositiveIntegerString } from "./secrets.ts";
import { parseDflowPriorityFees } from "./stream.ts";

export type DflowOrderParams = {
  inputMint: string;
  outputMint: string;
  amount: string;
  userPublicKey?: string;
  slippageBps?: number | "auto";
  prioritizationFeeLamports?: string | number;
  computeUnitPriceMicroLamports?: number;
  onlyDirectRoutes?: boolean;
  dexes?: string;
  excludeDexes?: string;
  priceImpactTolerancePct?: number;
  sponsor?: string;
  sponsorExec?: boolean;
  destinationWallet?: string;
  destinationTokenAccount?: string;
  wrapAndUnwrapSol?: boolean;
  platformFeeBps?: number;
  platformFeeMode?: "inputMint" | "outputMint";
  feeAccount?: string;
};

export function dflowApiBase(): string {
  return process.env.DFLOW_API_KEY?.trim()
    ? process.env.DFLOW_TRADE_API?.trim() || DFLOW_TRADE_API
    : process.env.DFLOW_TRADE_API_DEV?.trim() || DFLOW_TRADE_API_DEV;
}

export function dflowHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  const key = process.env.DFLOW_API_KEY?.trim();
  if (key) headers["x-api-key"] = key;
  return headers;
}

function setQuery(qs: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null || value === "") return;
  qs.set(key, String(value));
}

export function buildDflowOrderQuery(params: DflowOrderParams): URLSearchParams {
  assertNoSecretFields(params);
  const inputMint = requirePubkey("inputMint", params.inputMint);
  const outputMint = requirePubkey("outputMint", params.outputMint);
  const amount = requirePositiveIntegerString(
    params as unknown as Record<string, unknown>,
    "amount",
  );
  const qs = new URLSearchParams({ inputMint, outputMint, amount });
  if (params.userPublicKey) {
    setQuery(qs, "userPublicKey", requirePubkey("userPublicKey", params.userPublicKey));
  }
  setQuery(qs, "slippageBps", params.slippageBps ?? "auto");
  if (params.computeUnitPriceMicroLamports != null) {
    setQuery(qs, "computeUnitPriceMicroLamports", params.computeUnitPriceMicroLamports);
  } else {
    setQuery(qs, "prioritizationFeeLamports", params.prioritizationFeeLamports ?? "auto");
  }
  setQuery(qs, "onlyDirectRoutes", params.onlyDirectRoutes);
  setQuery(qs, "dexes", params.dexes);
  setQuery(qs, "excludeDexes", params.excludeDexes);
  setQuery(qs, "priceImpactTolerancePct", params.priceImpactTolerancePct);
  setQuery(qs, "sponsor", params.sponsor);
  setQuery(qs, "sponsorExec", params.sponsorExec);
  setQuery(qs, "destinationWallet", params.destinationWallet);
  setQuery(qs, "destinationTokenAccount", params.destinationTokenAccount);
  setQuery(qs, "wrapAndUnwrapSol", params.wrapAndUnwrapSol);
  setQuery(qs, "platformFeeBps", params.platformFeeBps);
  setQuery(qs, "platformFeeMode", params.platformFeeMode);
  setQuery(qs, "feeAccount", params.feeAccount);
  return qs;
}

export function buildDflowOrderUrl(params: DflowOrderParams, base = dflowApiBase()): string {
  const qs = buildDflowOrderQuery(params);
  return `${base.replace(/\/$/, "")}/order?${qs.toString()}`;
}

export async function getDflowPriorityFees(
  fetchImpl: typeof fetch = fetch,
): Promise<ReturnType<typeof parseDflowPriorityFees> & { source: string; unit: string }> {
  const url = `${dflowApiBase().replace(/\/$/, "")}/priority-fees`;
  const res = await fetchImpl(url, {
    headers: dflowHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof (json as { error?: string }).error === "string"
        ? (json as { error: string }).error
        : `GET /priority-fees ${res.status}`,
    );
  }
  return {
    ...parseDflowPriorityFees(json),
    source: "dflow-priority-fees",
    unit: "microLamportsPerComputeUnit",
  };
}

export async function getDflowOrder(
  params: DflowOrderParams,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const url = buildDflowOrderUrl(params);
  const res = await fetchImpl(url, {
    headers: dflowHeaders(),
    signal: AbortSignal.timeout(25_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      error:
        typeof json.error === "string"
          ? json.error
          : `GET /order ${res.status}`,
      status: res.status,
      source: url,
    };
  }
  const tx =
    typeof json.transaction === "string" ? json.transaction.trim() : undefined;
  const quoteOnly = !params.userPublicKey;
  return {
    ...json,
    unsigned: Boolean(tx),
    executed: false,
    quoteOnly,
    unsignedTransactionBase64: tx,
    note: tx
      ? UNSIGNED_NOTE
      : "Research GET /order quote (no userPublicKey). Pass userPublicKey for an unsigned transaction.",
    source: "dflow-order",
    venue: "dflow",
  };
}

export async function fetchDflowDocsIndex(
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string; text: string }> {
  const res = await fetchImpl(DFLOW_DOCS_INDEX, {
    headers: { accept: "text/plain, text/markdown" },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${DFLOW_DOCS_INDEX} ${res.status}`);
  return { url: DFLOW_DOCS_INDEX, text };
}
