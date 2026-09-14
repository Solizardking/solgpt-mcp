import type { BondingCurve } from "./decode.ts";

const BPS_DENOM = 10_000n;

export function ceilDiv(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new Error("division by zero");
  if (a === 0n) return 0n;
  return (a + b - 1n) / b;
}

export function bondingCurveMarketCap(params: {
  mintSupply: bigint;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
}): bigint {
  if (params.virtualTokenReserves === 0n) {
    throw new Error("Division by zero: virtual token reserves cannot be zero");
  }
  return (
    (params.virtualSolReserves * params.mintSupply) /
    params.virtualTokenReserves
  );
}

export function poolMarketCap(params: {
  baseMintSupply: bigint;
  baseReserve: bigint;
  quoteReserve: bigint;
}): bigint {
  if (params.baseReserve === 0n) {
    throw new Error("Division by zero: pool base token reserves cannot be zero");
  }
  return (params.quoteReserve * params.baseMintSupply) / params.baseReserve;
}

/** Fees are stripped from quote-in before the constant-product step. */
export function stripFees(amount: bigint, totalFeeBps: bigint): bigint {
  if (amount <= 1n) return 0n;
  return ((amount - 1n) * BPS_DENOM) / (totalFeeBps + BPS_DENOM);
}

export function applyFeeBps(amount: bigint, feeBps: bigint): bigint {
  return ceilDiv(amount * feeBps, BPS_DENOM);
}

/**
 * tokensOut = dx * Y / (X + dx) where dx is quote-in after fees.
 * Capped at real token reserves.
 */
export function quoteBuyTokensOut(params: {
  quoteIn: bigint;
  virtualQuoteReserves: bigint;
  virtualTokenReserves: bigint;
  realTokenReserves: bigint;
  totalFeeBps: bigint;
  complete?: boolean;
}): bigint {
  if (params.complete || params.quoteIn === 0n) return 0n;
  const dx = stripFees(params.quoteIn, params.totalFeeBps);
  if (dx === 0n) return 0n;
  const tokens =
    (dx * params.virtualTokenReserves) / (params.virtualQuoteReserves + dx);
  return tokens > params.realTokenReserves
    ? params.realTokenReserves
    : tokens;
}

/**
 * quoteOut = dy * X / (Y + dy). Fees taken from quote-out after the swap.
 */
export function quoteSellQuoteOut(params: {
  tokensIn: bigint;
  virtualQuoteReserves: bigint;
  virtualTokenReserves: bigint;
  realQuoteReserves: bigint;
  totalFeeBps: bigint;
  complete?: boolean;
}): bigint {
  if (params.complete || params.tokensIn === 0n) return 0n;
  const gross =
    (params.tokensIn * params.virtualQuoteReserves) /
    (params.virtualTokenReserves + params.tokensIn);
  const capped = gross > params.realQuoteReserves ? params.realQuoteReserves : gross;
  const fee = applyFeeBps(capped, params.totalFeeBps);
  return capped > fee ? capped - fee : 0n;
}

export function quoteFromCurve(
  curve: BondingCurve,
  side: "buy" | "sell",
  amount: bigint,
  totalFeeBps: bigint,
) {
  if (side === "buy") {
    const tokensOut = quoteBuyTokensOut({
      quoteIn: amount,
      virtualQuoteReserves: curve.virtualQuoteReserves,
      virtualTokenReserves: curve.virtualTokenReserves,
      realTokenReserves: curve.realTokenReserves,
      totalFeeBps,
      complete: curve.complete,
    });
    return {
      side,
      amountIn: amount.toString(),
      amountOut: tokensOut.toString(),
      unitIn: "quote",
      unitOut: "base",
    };
  }
  const quoteOut = quoteSellQuoteOut({
    tokensIn: amount,
    virtualQuoteReserves: curve.virtualQuoteReserves,
    virtualTokenReserves: curve.virtualTokenReserves,
    realQuoteReserves: curve.realQuoteReserves,
    totalFeeBps,
    complete: curve.complete,
  });
  return {
    side,
    amountIn: amount.toString(),
    amountOut: quoteOut.toString(),
    unitIn: "base",
    unitOut: "quote",
  };
}

export function graduationProgress(curve: BondingCurve): {
  complete: boolean;
  realTokenReserves: string;
  soldBase: string;
  progressBps: string;
} {
  const initial = curve.tokenTotalSupply === 0n ? 0n : curve.tokenTotalSupply;
  const remaining = curve.realTokenReserves;
  const sold = initial > remaining ? initial - remaining : 0n;
  const progressBps =
    initial === 0n ? 0n : (sold * BPS_DENOM) / initial;
  return {
    complete: curve.complete,
    realTokenReserves: remaining.toString(),
    soldBase: sold.toString(),
    progressBps: progressBps.toString(),
  };
}
