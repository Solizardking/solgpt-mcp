import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  INITIAL_VIRTUAL_SOL_RESERVES,
  INITIAL_VIRTUAL_TOKEN_RESERVES,
  ONE_BILLION_SUPPLY,
} from "./constants.ts";
import { decodeBondingCurve, encodeBondingCurve, effectiveQuoteReserves } from "./decode.ts";

describe("bonding curve decode (shipped)", () => {
  it("round-trips a 115-byte BondingCurve account", () => {
    const creator = Keypair.generate().publicKey.toBase58();
    const encoded = encodeBondingCurve({
      virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
      virtualQuoteReserves: INITIAL_VIRTUAL_SOL_RESERVES,
      realTokenReserves: 793_100_000_000_000n,
      realQuoteReserves: 0n,
      tokenTotalSupply: ONE_BILLION_SUPPLY,
      complete: false,
      creator,
      isMayhemMode: false,
      isCashbackCoin: true,
      quoteMint: "11111111111111111111111111111111",
    });
    expect(encoded.length).toBe(115);
    const decoded = decodeBondingCurve(encoded);
    expect(decoded.virtualTokenReserves).toBe(INITIAL_VIRTUAL_TOKEN_RESERVES);
    expect(decoded.virtualQuoteReserves).toBe(INITIAL_VIRTUAL_SOL_RESERVES);
    expect(decoded.complete).toBe(false);
    expect(decoded.creator).toBe(creator);
    expect(decoded.isCashbackCoin).toBe(true);
    expect(decoded.quoteMint).toBe("11111111111111111111111111111111");
  });

  it("rejects a non-bonding-curve discriminator", () => {
    expect(() => decodeBondingCurve(Buffer.alloc(115))).toThrow(/discriminator/);
  });

  it("effective quote reserves add virtual_quote_reserves", () => {
    expect(effectiveQuoteReserves(100n, 5n)).toBe(105n);
    expect(effectiveQuoteReserves(100n, 0n)).toBe(100n);
  });
});
