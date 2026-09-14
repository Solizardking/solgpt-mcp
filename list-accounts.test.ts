import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { listAccounts } from "./list-accounts.ts";
import { assertNoSecretFields } from "./secrets.ts";
import { getAccountBalance } from "./get-token-balance.ts";

describe("listAccounts and balances (shipped)", () => {
  it("returns only public keys from a keypair JSON folder", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pump-mcp-keys-"));
    const kp = Keypair.generate();
    writeFileSync(path.join(dir, "default.json"), JSON.stringify([...kp.secretKey]));
    writeFileSync(
      path.join(dir, "named.json"),
      JSON.stringify({ publicKey: kp.publicKey.toBase58() }),
    );
    const result = listAccounts(dir);
    expect(result.secretsExposed).toBe(false);
    expect(JSON.stringify(result)).not.toContain(
      JSON.stringify([...kp.secretKey]).slice(1, 20),
    );
    expect(result.accounts.map((a) => a.publicKey)).toContain(kp.publicKey.toBase58());
    expect(result.accounts.every((a) => !("secretKey" in a))).toBe(true);
  });

  it("rejects secret fields and requires a public address", async () => {
    expect(() => assertNoSecretFields({ privateKey: "x" })).toThrow(/forbidden/);
    await expect(
      getAccountBalance(
        { address: "not-a-key" },
        async () => {
          throw new Error("rpc should not run");
        },
      ),
    ).rejects.toThrow(/public key/);
  });
});
