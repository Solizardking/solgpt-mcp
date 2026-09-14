import { rpcUrl } from "./utils.ts";

export type RpcCaller = (
  method: string,
  params: unknown[],
) => Promise<unknown>;

export function createRpcCaller(url = rpcUrl()): RpcCaller {
  return async (method, params) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as {
      result?: unknown;
      error?: { message?: string };
    };
    if (json.error) {
      throw new Error(json.error.message || `${method} RPC error`);
    }
    return json.result;
  };
}

export async function getAccountBase64(
  address: string,
  rpc: RpcCaller = createRpcCaller(),
): Promise<{ data: Buffer; owner: string; lamports: number } | null> {
  const result = (await rpc("getAccountInfo", [
    address,
    { encoding: "base64", commitment: "confirmed" },
  ])) as {
    value?: {
      data?: [string, string];
      owner?: string;
      lamports?: number;
    } | null;
  };
  if (!result?.value?.data?.[0]) return null;
  return {
    data: Buffer.from(result.value.data[0], "base64"),
    owner: result.value.owner ?? "",
    lamports: result.value.lamports ?? 0,
  };
}

export async function getBalanceLamports(
  address: string,
  rpc: RpcCaller = createRpcCaller(),
): Promise<bigint> {
  const result = (await rpc("getBalance", [address])) as {
    value?: number;
  };
  return BigInt(result?.value ?? 0);
}

export async function getSplBalanceBaseUnits(
  owner: string,
  mint: string,
  rpc: RpcCaller = createRpcCaller(),
): Promise<{ amount: bigint; uiAmount: string | null; decimals: number } | null> {
  const result = (await rpc("getParsedTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed" },
  ])) as {
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              tokenAmount?: {
                amount?: string;
                uiAmountString?: string;
                decimals?: number;
              };
            };
          };
        };
      };
    }>;
  };
  const first = result?.value?.[0]?.account?.data?.parsed?.info?.tokenAmount;
  if (!first?.amount) return null;
  return {
    amount: BigInt(first.amount),
    uiAmount: first.uiAmountString ?? null,
    decimals: first.decimals ?? 0,
  };
}
