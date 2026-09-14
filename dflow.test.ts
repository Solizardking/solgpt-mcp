import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  buildDflowOrderQuery,
  buildDflowOrderUrl,
  getDflowOrder,
  getDflowPriorityFees,
} from "./dflow.ts";
import { NATIVE_MINT } from "./constants.ts";

describe("DFlow GET /order and /priority-fees (shipped)", () => {
  it("buildDflowOrderQuery requires atomic amount and mints", () => {
    const user = Keypair.generate().publicKey.toBase58();
    const qs = buildDflowOrderQuery({
      inputMint: NATIVE_MINT,
      outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amount: "1000000000",
      userPublicKey: user,
      slippageBps: "auto",
      prioritizationFeeLamports: "high",
    });
    expect(qs.get("inputMint")).toBe(NATIVE_MINT);
    expect(qs.get("amount")).toBe("1000000000");
    expect(qs.get("userPublicKey")).toBe(user);
    expect(qs.get("prioritizationFeeLamports")).toBe("high");
    expect(() =>
      buildDflowOrderQuery({
        inputMint: NATIVE_MINT,
        outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1.5",
      }),
    ).toThrow(/positive integer/);
    expect(() =>
      buildDflowOrderQuery({
        inputMint: NATIVE_MINT,
        outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1",
        privateKey: "oops",
      } as never),
    ).toThrow(/forbidden/);
  });

  it("quote-only URL omits userPublicKey and includes /order", () => {
    const url = buildDflowOrderUrl({
      inputMint: NATIVE_MINT,
      outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amount: "1000000",
    });
    expect(url).toContain("/order?");
    expect(url).not.toContain("userPublicKey=");
  });

  it("getDflowPriorityFees and getDflowOrder drive fetch with the real URLs", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("/priority-fees") && !url.includes("stream")) {
        return new Response(
          JSON.stringify({
            mediumMicroLamports: 1,
            highMicroLamports: 2,
            veryHighMicroLamports: 3,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          transaction: "dGVzdA==",
          inAmount: "1000000000",
          outAmount: "50",
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const fees = await getDflowPriorityFees(fetchImpl);
    expect(fees.mediumMicroLamports).toBe(1);
    expect(seen.some((u) => u.endsWith("/priority-fees"))).toBe(true);

    const order = await getDflowOrder(
      {
        inputMint: NATIVE_MINT,
        outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1000000000",
        userPublicKey: Keypair.generate().publicKey.toBase58(),
      },
      fetchImpl,
    );
    expect(order.unsigned).toBe(true);
    expect(order.executed).toBe(false);
    expect(order.unsignedTransactionBase64).toBe("dGVzdA==");
    expect(seen.some((u) => u.includes("/order?"))).toBe(true);
  });
});
