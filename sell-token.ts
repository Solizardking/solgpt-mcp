import { NATIVE_MINT } from "./constants.ts";
import { funBlockPost, stampUnsigned, type FetchLike } from "./fun-block.ts";
import { requirePubkey } from "./utils.ts";
import {
  assertNoSecretFields,
  requirePositiveIntegerString,
} from "./secrets.ts";

export type SellTokenInput = {
  user: string;
  tokenAddress: string;
  amount: string;
  slippagePct?: number;
  feePayer?: string;
};

/** Prepare an unsigned sell via POST /agents/swap (mint → SOL). Amount is base units. */
export async function sellToken(input: SellTokenInput, fetchImpl?: FetchLike) {
  assertNoSecretFields(input);
  const user = requirePubkey("user", input.user);
  const mint = requirePubkey("tokenAddress", input.tokenAddress);
  const amount = requirePositiveIntegerString(
    input as unknown as Record<string, unknown>,
    "amount",
  );
  const body: Record<string, unknown> = {
    user,
    inputMint: mint,
    outputMint: NATIVE_MINT,
    amount,
    slippagePct: input.slippagePct ?? 2,
  };
  if (input.feePayer) body.feePayer = requirePubkey("feePayer", input.feePayer);
  const result = await funBlockPost("/agents/swap", body, fetchImpl);
  if (result.error) return result;
  return stampUnsigned(result, {
    kind: "pump-sell",
    mint,
    amount,
    inputMint: mint,
    outputMint: NATIVE_MINT,
  });
}

export function formatSellResult(result: Record<string, unknown>): string {
  if (result.error) return `Error selling token: ${result.error}`;
  return [
    "Unsigned sell ticket (not executed)",
    `Mint: ${result.mint ?? result.inputMint ?? ""}`,
    `Amount: ${result.amount ?? ""} base units`,
    `Transaction: ${result.unsignedTransactionBase64 ? "present" : "missing"}`,
    String(result.note ?? ""),
  ].join("\n");
}
