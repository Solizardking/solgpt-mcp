import { NATIVE_MINT } from "./constants.ts";
import { funBlockPost, stampUnsigned, type FetchLike } from "./fun-block.ts";
import { requirePubkey } from "./utils.ts";
import {
  assertNoSecretFields,
  requirePositiveIntegerString,
  requireString,
} from "./secrets.ts";

export type CreateTokenInput = {
  user: string;
  name: string;
  symbol: string;
  uri: string;
  solLamports: string;
  mayhemMode?: boolean;
  cashback?: boolean;
  tokenizedAgent?: boolean;
  buybackBps?: number;
  creator?: string;
  feePayer?: string;
};

/**
 * Prepare an unsigned create_v2 + initial-buy ticket via official
 * POST https://fun-block.pump.fun/agents/create-coin.
 * Same contract as src/lib/solgpt/pump-fun.ts preparePumpCreateCoin.
 */
export async function createToken(
  input: CreateTokenInput,
  fetchImpl?: FetchLike,
) {
  assertNoSecretFields(input);
  const user = requirePubkey("user", input.user);
  const name = requireString(input as unknown as Record<string, unknown>, "name");
  const symbol = requireString(
    input as unknown as Record<string, unknown>,
    "symbol",
  );
  const uri = requireString(input as unknown as Record<string, unknown>, "uri");
  if (name.length > 32) throw new Error("name maximum is 32 characters");
  if (symbol.length > 13) throw new Error("symbol maximum is 13 characters");
  if (uri.length > 200) throw new Error("uri maximum is 200 characters");
  const solLamports = requirePositiveIntegerString(
    input as unknown as Record<string, unknown>,
    "solLamports",
  );
  const body: Record<string, unknown> = {
    user,
    name,
    symbol,
    uri,
    solLamports,
    mayhemMode: input.mayhemMode ?? false,
    cashback: input.cashback ?? false,
    tokenizedAgent: input.tokenizedAgent ?? false,
    buybackBps: input.buybackBps ?? 5000,
    quoteMint: NATIVE_MINT,
  };
  if (input.feePayer) body.feePayer = requirePubkey("feePayer", input.feePayer);
  if (input.creator) body.creator = requirePubkey("creator", input.creator);
  const result = await funBlockPost("/agents/create-coin", body, fetchImpl);
  if (result.error) return result;
  return stampUnsigned(result, {
    kind: "pump-create-coin",
    mint: result.mintPublicKey ?? result.mint,
  });
}

export function formatCreateTokenResult(result: Record<string, unknown>): string {
  if (result.error) return `Error creating token: ${result.error}`;
  return [
    "Unsigned create-coin ticket (not executed)",
    `Name: ${result.name ?? ""}`,
    `Mint: ${result.mint ?? result.tokenAddress ?? ""}`,
    `Transaction: ${result.unsignedTransactionBase64 ? "present" : "missing"}`,
    String(result.note ?? ""),
  ].join("\n");
}
