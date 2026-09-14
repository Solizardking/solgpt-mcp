import { FUN_BLOCK_BASE, UNSIGNED_NOTE } from "./constants.ts";
import { assertNoSecretFields } from "./secrets.ts";

export type FetchLike = typeof fetch;

export type FunBlockRecord = Record<string, unknown>;

function pickTransaction(json: FunBlockRecord): string | undefined {
  for (const key of [
    "transaction",
    "unsignedTransaction",
    "unsignedTransactionBase64",
    "tx",
  ]) {
    const value = json[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function stampUnsigned(
  json: FunBlockRecord,
  extra: FunBlockRecord = {},
): FunBlockRecord {
  const transaction = pickTransaction({ ...json, ...extra });
  const out: FunBlockRecord = {
    ...json,
    ...extra,
    unsigned: true,
    executed: false,
    note: UNSIGNED_NOTE,
  };
  if (transaction) {
    out.transaction = transaction;
    out.unsignedTransactionBase64 = transaction;
  }
  return out;
}

export async function funBlockPost(
  path: string,
  body: FunBlockRecord,
  fetchImpl: FetchLike = fetch,
): Promise<FunBlockRecord> {
  assertNoSecretFields(body);
  const url = `${FUN_BLOCK_BASE}${path}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ ...body, encoding: "base64" }),
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text().catch(() => "");
  let json: FunBlockRecord = {};
  if (text) {
    try {
      json = JSON.parse(text) as FunBlockRecord;
    } catch {
      json = { raw: text.slice(0, 400) };
    }
  }
  if (!res.ok) {
    const msg =
      (typeof json.error === "string" && json.error) ||
      (typeof json.message === "string" && json.message) ||
      `${res.status} ${res.statusText}`.trim();
    return { error: msg, status: res.status, source: url, executed: false };
  }
  return stampUnsigned(json, { source: url });
}
