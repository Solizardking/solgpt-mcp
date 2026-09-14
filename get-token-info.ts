import { PUMP_COINS_V2, PUMP_PROGRAM_ID } from "./constants.ts";
import {
  bondingCurveMarketCap,
  graduationProgress,
  quoteBuyTokensOut,
  quoteSellQuoteOut,
} from "./bonding-curve.ts";
import { decodeBondingCurve } from "./decode.ts";
import { bondingCurveFeeTier, totalFeeBps } from "./fees.ts";
import { bondingCurvePda } from "./pda.ts";
import {
  createRpcCaller,
  getAccountBase64,
  type RpcCaller,
} from "./rpc.ts";
import { requirePubkey } from "./utils.ts";

export type TokenInfoDeps = {
  rpc?: RpcCaller;
  fetchImpl?: typeof fetch;
};

export async function getTokenInfo(
  tokenAddress: string,
  deps: TokenInfoDeps = {},
) {
  const mint = requirePubkey("tokenAddress", tokenAddress);
  const curvePda = bondingCurvePda(mint);
  const rpc = deps.rpc ?? createRpcCaller();
  const account = await getAccountBase64(curvePda.address, rpc);

  let bondingCurve = null;
  if (account) {
    bondingCurve = decodeBondingCurve(account.data);
  }

  let metadata: Record<string, unknown> | null = null;
  try {
    const fetchImpl = deps.fetchImpl ?? fetch;
    const res = await fetchImpl(`${PUMP_COINS_V2}/${mint}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      metadata = (await res.json()) as Record<string, unknown>;
    }
  } catch {
    metadata = null;
  }

  const complete = bondingCurve?.complete ?? Boolean(metadata?.complete);
  const pool =
    typeof metadata?.pump_swap_pool === "string"
      ? metadata.pump_swap_pool
      : null;
  const coinState = !complete ? "bonding" : pool ? "amm" : "migrating";
  const tier = bondingCurveFeeTier();
  const feeBps = totalFeeBps(tier);

  let marketCapLamports: string | null = null;
  let quote1SolTokens: string | null = null;
  let sell1mTokensQuote: string | null = null;
  if (bondingCurve && !bondingCurve.complete) {
    marketCapLamports = bondingCurveMarketCap({
      mintSupply: bondingCurve.tokenTotalSupply,
      virtualSolReserves: bondingCurve.virtualQuoteReserves,
      virtualTokenReserves: bondingCurve.virtualTokenReserves,
    }).toString();
    quote1SolTokens = quoteBuyTokensOut({
      quoteIn: 1_000_000_000n,
      virtualQuoteReserves: bondingCurve.virtualQuoteReserves,
      virtualTokenReserves: bondingCurve.virtualTokenReserves,
      realTokenReserves: bondingCurve.realTokenReserves,
      totalFeeBps: feeBps,
      complete: bondingCurve.complete,
    }).toString();
    sell1mTokensQuote = quoteSellQuoteOut({
      tokensIn: 1_000_000_000_000n,
      virtualQuoteReserves: bondingCurve.virtualQuoteReserves,
      virtualTokenReserves: bondingCurve.virtualTokenReserves,
      realQuoteReserves: bondingCurve.realQuoteReserves,
      totalFeeBps: feeBps,
      complete: bondingCurve.complete,
    }).toString();
  }

  return {
    tokenAddress: mint,
    bondingCurvePda: curvePda.address,
    programId: PUMP_PROGRAM_ID,
    coinState,
    complete,
    pumpSwapPool: pool,
    pumpfunUrl: `https://pump.fun/${mint}`,
    metadata: metadata
      ? {
          name: metadata.name,
          symbol: metadata.symbol,
          creator: metadata.creator,
          description: metadata.description,
          imageUri: metadata.image_uri ?? metadata.imageUri,
        }
      : null,
    bondingCurve: bondingCurve
      ? {
          virtualTokenReserves: bondingCurve.virtualTokenReserves.toString(),
          virtualQuoteReserves: bondingCurve.virtualQuoteReserves.toString(),
          realTokenReserves: bondingCurve.realTokenReserves.toString(),
          realQuoteReserves: bondingCurve.realQuoteReserves.toString(),
          tokenTotalSupply: bondingCurve.tokenTotalSupply.toString(),
          complete: bondingCurve.complete,
          creator: bondingCurve.creator,
          isMayhemMode: bondingCurve.isMayhemMode,
          isCashbackCoin: bondingCurve.isCashbackCoin,
          quoteMint: bondingCurve.quoteMint,
          dataLength: bondingCurve.dataLength,
          graduation: graduationProgress(bondingCurve),
        }
      : null,
    marketCapLamports,
    indicativeQuotes: bondingCurve
      ? {
          tokensOutFor1Sol: quote1SolTokens,
          quoteOutFor1MTokens: sell1mTokensQuote,
          feeBps: Number(feeBps),
        }
      : null,
  };
}

export function formatTokenInfo(
  info: Awaited<ReturnType<typeof getTokenInfo>>,
): string {
  const lines = [
    `Token: ${info.tokenAddress}`,
    `State: ${info.coinState}`,
    `Bonding curve PDA: ${info.bondingCurvePda}`,
    `Pump.fun: ${info.pumpfunUrl}`,
  ];
  if (info.metadata?.name) {
    lines.push(`Name: ${info.metadata.name} (${info.metadata.symbol ?? "?"})`);
  }
  if (info.bondingCurve) {
    lines.push(
      `Complete: ${info.bondingCurve.complete}`,
      `Virtual quote reserves: ${info.bondingCurve.virtualQuoteReserves}`,
      `Real token reserves: ${info.bondingCurve.realTokenReserves}`,
      `Creator: ${info.bondingCurve.creator ?? "unknown"}`,
      `Mayhem: ${info.bondingCurve.isMayhemMode}  Cashback: ${info.bondingCurve.isCashbackCoin}`,
    );
  }
  if (info.marketCapLamports) {
    lines.push(`Market cap (lamports): ${info.marketCapLamports}`);
  }
  return lines.join("\n");
}
