import { describe, expect, it } from "vitest";
import {
  buildOwsArgs,
  createOwsWallet,
  listOwsWallets,
  normalizeOwsChain,
  parseWalletList,
  sanitizeOwsValue,
  signOwsMessage,
  signOwsTx,
  solanaAccount,
  unsignedTxToHex,
  type OwsRunner,
} from "./ows.ts";

const LIST_FIXTURE = `
ID:      52e4f648-c5b9-4a5d-92b9-11f79aa4f0a0
Name:    agent-treasury
Secured: ✓ (encrypted)
  eip155:1 (ethereum) → 0xd78879F21c8493c1965aEC8932042ac8F502da82
  solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp (solana) → 3xe3YMaucoJRDTtdtmGAT8UMZbp4dpfDWoXpLRHrMQzG
  bip122:000000000019d6689c085ae165831e93 (bitcoin) → bc1qg2r5yhy27megpe8mh2svnqw2vpgl4n6uugdhe9
Created: 2026-08-18T19:05:10.026347+00:00
`.trim();

describe("OWS access layer (shipped)", () => {
  it("parses vault list text into public descriptors only", () => {
    const wallets = parseWalletList(LIST_FIXTURE);
    expect(wallets).toHaveLength(1);
    expect(wallets[0]?.name).toBe("agent-treasury");
    expect(wallets[0]?.secured).toBe(true);
    expect(solanaAccount(wallets[0]!)?.address).toBe(
      "3xe3YMaucoJRDTtdtmGAT8UMZbp4dpfDWoXpLRHrMQzG",
    );
    expect(JSON.stringify(wallets)).not.toMatch(/mnemonic|private/i);
  });

  it("normalizes chains and converts Solana base64 tickets to hex", () => {
    expect(normalizeOwsChain("evm")).toBe("ethereum");
    expect(normalizeOwsChain("8453")).toBe("8453");
    expect(unsignedTxToHex("deadbeef")).toBe("deadbeef");
    expect(unsignedTxToHex("dGVzdA==")).toBe(
      Buffer.from("dGVzdA==", "base64").toString("hex"),
    );
  });

  it("strips mnemonic/private material from results", () => {
    const cleaned = sanitizeOwsValue({
      signature: "ab",
      mnemonic: "secret phrase",
      nested: { privateKey: "00", ok: 1 },
    }) as Record<string, unknown>;
    expect(cleaned.signature).toBe("ab");
    expect(cleaned.mnemonic).toBeUndefined();
    expect((cleaned.nested as Record<string, unknown>).ok).toBe(1);
    expect((cleaned.nested as Record<string, unknown>).privateKey).toBeUndefined();
  });

  it("buildOwsArgs matches the CLI sign surface", () => {
    expect(
      buildOwsArgs(["sign", "message"], {
        wallet: "agent-treasury",
        chain: "solana",
        message: "hello",
        json: true,
      }),
    ).toEqual([
      "sign",
      "message",
      "--wallet",
      "agent-treasury",
      "--chain",
      "solana",
      "--message",
      "hello",
      "--json",
    ]);
  });

  it("list/create/sign drive the runner with real argv (no key export)", async () => {
    const calls: string[][] = [];
    const runner: OwsRunner = async (args) => {
      calls.push(args);
      if (args[0] === "wallet" && args[1] === "list") {
        return { stdout: LIST_FIXTURE, stderr: "", code: 0 };
      }
      if (args[0] === "sign" && args[1] === "message") {
        return {
          stdout: JSON.stringify({ signature: "aa", recovery_id: null, mnemonic: "nope" }),
          stderr: "",
          code: 0,
        };
      }
      if (args[0] === "sign" && args[1] === "tx") {
        return {
          stdout: JSON.stringify({ signature: "bb" }),
          stderr: "",
          code: 0,
        };
      }
      return { stdout: "", stderr: `unexpected ${args.join(" ")}`, code: 1 };
    };
    const listed = await listOwsWallets(runner);
    expect(listed[0]?.name).toBe("agent-treasury");
    const created = await createOwsWallet("agent-treasury", runner);
    expect(created.created).toBe(false);
    expect(calls.some((c) => c[1] === "create")).toBe(false);
    const sig = await signOwsMessage(
      { wallet: "agent-treasury", chain: "solana", message: "hello" },
      runner,
    );
    expect(sig.signature).toBe("aa");
    expect(sig.mnemonic).toBeUndefined();
    const tx = await signOwsTx(
      { wallet: "agent-treasury", chain: "solana", tx: "dGVzdA==" },
      runner,
    );
    expect(tx.sent).toBe(false);
    const txCall = calls.find((c) => c[1] === "tx");
    expect(txCall).toContain(unsignedTxToHex("dGVzdA=="));
  });
});
