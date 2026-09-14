import { requirePubkey } from "./utils.ts";
import {
  createRpcCaller,
  getBalanceLamports,
  getSplBalanceBaseUnits,
  type RpcCaller,
} from "./rpc.ts";
import { listAccounts } from "./list-accounts.ts";

export type BalanceInput = {
  address?: string;
  accountName?: string;
  tokenAddress?: string;
};

export async function getAccountBalance(
  input: BalanceInput,
  rpc: RpcCaller = createRpcCaller(),
) {
  let address = input.address?.trim();
  if (!address && input.accountName) {
    const listed = listAccounts();
    const match = listed.accounts.find((a) => a.name === input.accountName);
    if (!match || match.publicKey === "unreadable") {
      throw new Error(
        `No public address for account ${input.accountName}. Pass address instead of a keypair name.`,
      );
    }
    address = match.publicKey;
  }
  const owner = requirePubkey("address", address);
  const lamports = await getBalanceLamports(owner, rpc);
  const out: Record<string, unknown> = {
    address: owner,
    lamports: lamports.toString(),
    sol: Number(lamports) / 1_000_000_000,
  };
  if (input.tokenAddress) {
    const mint = requirePubkey("tokenAddress", input.tokenAddress);
    const token = await getSplBalanceBaseUnits(owner, mint, rpc);
    out.tokenAddress = mint;
    out.token = token
      ? {
          amount: token.amount.toString(),
          uiAmount: token.uiAmount,
          decimals: token.decimals,
        }
      : null;
  }
  return out;
}

export function formatAccountBalance(result: Record<string, unknown>): string {
  const lines = [
    `Account: ${result.address}`,
    `SOL: ${result.sol} (${result.lamports} lamports)`,
  ];
  if (result.tokenAddress) {
    const token = result.token as
      | { amount?: string; uiAmount?: string | null }
      | null;
    lines.push(
      `Token ${result.tokenAddress}: ${token?.uiAmount ?? token?.amount ?? "no token account"}`,
    );
  }
  return lines.join("\n");
}
