import { NATIVE_MINT } from "./constants.ts";
import { funBlockPost, stampUnsigned, type FetchLike } from "./fun-block.ts";
import { requirePubkey } from "./utils.ts";
import {
  assertNoSecretFields,
  requirePositiveIntegerString,
} from "./secrets.ts";

export type BuyTokenInput = {
  user: string;
  tokenAddress: string;
  amount: string;
  slippagePct?: number;
  feePayer?: string;
};

/**
 * Prepare an unsigned buy via official POST /agents/swap (SOL → mint).
 * Amount is quote lamports (atomic). Same contract as desk preparePumpSwap.
 */
export async function buyToken(input: BuyTokenInput, fetchImpl?: FetchLike) {
  assertNoSecretFields(input);
  const user = requirePubkey("user", input.user);
  const mint = requirePubkey("tokenAddress", input.tokenAddress);
  const amount = requirePositiveIntegerString(
    input as unknown as Record<string, unknown>,
    "amount",
  );
  const body: Record<string, unknown> = {
    user,
    inputMint: NATIVE_MINT,
    outputMint: mint,
    amount,
    slippagePct: input.slippagePct ?? 2,
  };
  if (input.feePayer) body.feePayer = requirePubkey("feePayer", input.feePayer);
  const result = await funBlockPost("/agents/swap", body, fetchImpl);
  if (result.error) return result;
  return stampUnsigned(result, {
    kind: "pump-buy",
    mint,
    amount,
    inputMint: NATIVE_MINT,
    outputMint: mint,
  });
}

export function formatBuyResult(result: Record<string, unknown>): string {
  if (result.error) return `Error buying token: ${result.error}`;
  return [
    "Unsigned buy ticket (not executed)",
    `Mint: ${result.mint ?? result.outputMint ?? ""}`,
    `Amount: ${result.amount ?? ""} lamports`,
    `Transaction: ${result.unsignedTransactionBase64 ? "present" : "missing"}`,
    String(result.note ?? ""),
  ].join("\n");
}
