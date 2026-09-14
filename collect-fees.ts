import { funBlockPost, stampUnsigned, type FetchLike } from "./fun-block.ts";
import { requirePubkey } from "./utils.ts";
import { assertNoSecretFields } from "./secrets.ts";

export async function collectCreatorFee(
  input: { mint: string; user: string },
  fetchImpl?: FetchLike,
) {
  assertNoSecretFields(input);
  const mint = requirePubkey("mint", input.mint);
  const user = requirePubkey("user", input.user);
  const result = await funBlockPost(
    "/agents/collect-fees",
    { mint, user },
    fetchImpl,
  );
  if (result.error) return result;
  return stampUnsigned(result, { kind: "pump-collect-fees", mint, user });
}

export async function setSharingConfig(
  input: {
    mint: string;
    user: string;
    shareholders: Array<{ address: string; bps: number }>;
    mode?: "create" | "update";
  },
  fetchImpl?: FetchLike,
) {
  assertNoSecretFields(input);
  const mint = requirePubkey("mint", input.mint);
  const user = requirePubkey("user", input.user);
  if (!input.shareholders?.length) throw new Error("shareholders is required");
  if (input.shareholders.length > 10) throw new Error("maximum 10 shareholders");
  const seen = new Set<string>();
  let total = 0;
  const shareholders = input.shareholders.map((h, i) => {
    const address = requirePubkey(`shareholders[${i}].address`, h.address);
    if (seen.has(address)) throw new Error("duplicate shareholder address");
    seen.add(address);
    const bps = Number(h.bps);
    if (!Number.isInteger(bps) || bps <= 0) {
      throw new Error(`shareholders[${i}].bps must be a positive integer`);
    }
    total += bps;
    return { address, bps };
  });
  if (total !== 10_000) throw new Error("shareholder bps must total exactly 10000");
  const result = await funBlockPost(
    "/agents/sharing-config",
    { mint, user, shareholders, mode: input.mode },
    fetchImpl,
  );
  if (result.error) return result;
  return stampUnsigned(result, { kind: "pump-sharing-config", shareholders });
}
