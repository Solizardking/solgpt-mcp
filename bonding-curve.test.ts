import { describe, expect, it } from "vitest";
import {
  INITIAL_REAL_TOKEN_RESERVES,
  INITIAL_VIRTUAL_SOL_RESERVES,
  INITIAL_VIRTUAL_TOKEN_RESERVES,
  ONE_BILLION_SUPPLY,
} from "./constants.ts";
import {
  bondingCurveMarketCap,
  ceilDiv,
  quoteBuyTokensOut,
  quoteSellQuoteOut,
  stripFees,
} from "./bonding-curve.ts";
import { bondingCurveFeeTier, totalFeeBps } from "./fees.ts";

describe("bondingCurve quotes (shipped)", () => {
  const feeBps = totalFeeBps(bondingCurveFeeTier());

  it("computes genesis market cap from docs Global reserves", () => {
    const cap = bondingCurveMarketCap({
      mintSupply: ONE_BILLION_SUPPLY,
      virtualSolReserves: INITIAL_VIRTUAL_SOL_RESERVES,
      virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
    });
    expect(cap > 0n).toBe(true);
    expect(cap).toBe(
      (INITIAL_VIRTUAL_SOL_RESERVES * ONE_BILLION_SUPPLY) /
        INITIAL_VIRTUAL_TOKEN_RESERVES,
    );
  });

  it("buy quote is capped by real token reserves and is zero when complete", () => {
    const out = quoteBuyTokensOut({
      quoteIn: 1_000_000_000n,
      virtualQuoteReserves: INITIAL_VIRTUAL_SOL_RESERVES,
      virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
      realTokenReserves: INITIAL_REAL_TOKEN_RESERVES,
      totalFeeBps: feeBps,
    });
    expect(out > 0n).toBe(true);
    expect(out <= INITIAL_REAL_TOKEN_RESERVES).toBe(true);
    expect(
      quoteBuyTokensOut({
        quoteIn: 1_000_000_000n,
        virtualQuoteReserves: INITIAL_VIRTUAL_SOL_RESERVES,
        virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
        realTokenReserves: INITIAL_REAL_TOKEN_RESERVES,
        totalFeeBps: feeBps,
        complete: true,
      }),
    ).toBe(0n);
    expect(
      quoteBuyTokensOut({
        quoteIn: 0n,
        virtualQuoteReserves: INITIAL_VIRTUAL_SOL_RESERVES,
        virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
        realTokenReserves: INITIAL_REAL_TOKEN_RESERVES,
        totalFeeBps: feeBps,
      }),
    ).toBe(0n);
  });

  it("sell quote is less than raw constant-product because of fees", () => {
    const tokensIn = 1_000_000_000_000n;
    const out = quoteSellQuoteOut({
      tokensIn,
      virtualQuoteReserves: INITIAL_VIRTUAL_SOL_RESERVES,
      virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
      realQuoteReserves: 10_000_000_000n,
      totalFeeBps: feeBps,
    });
    const gross =
      (tokensIn * INITIAL_VIRTUAL_SOL_RESERVES) /
      (INITIAL_VIRTUAL_TOKEN_RESERVES + tokensIn);
    expect(out > 0n).toBe(true);
    expect(out < gross).toBe(true);
  });

  it("stripFees and ceilDiv match the protocol formulas", () => {
    expect(stripFees(1_000_000_001n, 125n)).toBe(
      ((1_000_000_001n - 1n) * 10_000n) / (125n + 10_000n),
    );
    expect(ceilDiv(10n, 3n)).toBe(4n);
    expect(ceilDiv(0n, 3n)).toBe(0n);
  });
});
