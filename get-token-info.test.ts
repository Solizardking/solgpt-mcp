import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  INITIAL_REAL_TOKEN_RESERVES,
  INITIAL_VIRTUAL_SOL_RESERVES,
  INITIAL_VIRTUAL_TOKEN_RESERVES,
  ONE_BILLION_SUPPLY,
} from "./constants.ts";
import { encodeBondingCurve } from "./decode.ts";
import { getTokenInfo } from "./get-token-info.ts";
import { bondingCurvePda } from "./pda.ts";

describe("getTokenInfo (shipped)", () => {
  it("decodes the bonding-curve account returned by RPC", async () => {
    const mint = Keypair.generate().publicKey.toBase58();
    const creator = Keypair.generate().publicKey.toBase58();
    const pda = bondingCurvePda(mint);
    const encoded = encodeBondingCurve({
      virtualTokenReserves: INITIAL_VIRTUAL_TOKEN_RESERVES,
      virtualQuoteReserves: INITIAL_VIRTUAL_SOL_RESERVES,
      realTokenReserves: INITIAL_REAL_TOKEN_RESERVES,
      realQuoteReserves: 0n,
      tokenTotalSupply: ONE_BILLION_SUPPLY,
      complete: false,
      creator,
      isCashbackCoin: false,
    });
    const rpc = async (method: string, params: unknown[]) => {
      expect(method).toBe("getAccountInfo");
      expect(params[0]).toBe(pda.address);
      return {
        value: {
          data: [encoded.toString("base64"), "base64"],
          owner: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
          lamports: 1,
        },
      };
    };
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ complete: false, name: "Ex", symbol: "EX" }), {
        status: 200,
      })) as typeof fetch;
    const info = await getTokenInfo(mint, { rpc, fetchImpl });
    expect(info.tokenAddress).toBe(mint);
    expect(info.coinState).toBe("bonding");
    expect(info.bondingCurve?.creator).toBe(creator);
    expect(info.bondingCurve?.complete).toBe(false);
    expect(BigInt(info.marketCapLamports ?? "0") > 0n).toBe(true);
    expect(info.indicativeQuotes?.tokensOutFor1Sol).toBeTruthy();
  });
});
