import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { buyToken } from "./buy-token.ts";
import { createToken } from "./create-token.ts";
import { sellToken } from "./sell-token.ts";
import { stampUnsigned } from "./fun-block.ts";
import { FUN_BLOCK_BASE } from "./constants.ts";

function mockFetch(handler: (url: string, body: Record<string, unknown>) => unknown) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    const payload = handler(url, body);
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as typeof fetch;
}

describe("unsigned pump tickets (shipped)", () => {
  it("createToken posts to fun-block and stamps unsigned", async () => {
    const user = Keypair.generate().publicKey.toBase58();
    const fetchImpl = mockFetch((url, body) => {
      expect(url).toBe(`${FUN_BLOCK_BASE}/agents/create-coin`);
      expect(body.user).toBe(user);
      expect(body.encoding).toBe("base64");
      expect(body.privateKey).toBeUndefined();
      return { transaction: "Y3JlYXRl", mint: "Mint111111111111111111111111111111111111111" };
    });
    const result = await createToken(
      {
        user,
        name: "Example",
        symbol: "EX",
        uri: "https://example.com/ex.json",
        solLamports: "1000000000",
      },
      fetchImpl,
    );
    expect(result.executed).toBe(false);
    expect(result.unsigned).toBe(true);
    expect(result.unsignedTransactionBase64).toBe("Y3JlYXRl");
    expect(result.kind).toBe("pump-create-coin");
  });

  it("buyToken and sellToken use native mint direction and reject secrets", async () => {
    const user = Keypair.generate().publicKey.toBase58();
    const mint = Keypair.generate().publicKey.toBase58();
    const fetchImpl = mockFetch((_url, _body) => ({ transaction: "dHg=" }));
    const buy = await buyToken(
      { user, tokenAddress: mint, amount: "100000000" },
      fetchImpl,
    );
    expect(buy.kind).toBe("pump-buy");
    expect(buy.executed).toBe(false);
    const sell = await sellToken(
      { user, tokenAddress: mint, amount: "1000000" },
      fetchImpl,
    );
    expect(sell.kind).toBe("pump-sell");
    await expect(
      buyToken(
        { user, tokenAddress: mint, amount: "1", secretKey: "x" } as never,
        fetchImpl,
      ),
    ).rejects.toThrow(/forbidden/);
  });

  it("stampUnsigned never marks executed", () => {
    const stamped = stampUnsigned({ tx: "abc" });
    expect(stamped.executed).toBe(false);
    expect(stamped.unsignedTransactionBase64).toBe("abc");
  });
});
