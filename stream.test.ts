import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { TRADE_EVENT_DISCRIMINATOR } from "./constants.ts";
import {
  classifyLogs,
  dflowPriorityFeesStreamUrl,
  logsSubscribeMessage,
  parseDflowPriorityFees,
  parseProgramLogs,
  parseTradeEventFields,
  pollStreamEvents,
  pushStreamEvent,
} from "./stream.ts";

describe("program log stream parser (shipped)", () => {
  it("decodes a TradeEvent from Program data logs", () => {
    const mint = Keypair.generate().publicKey;
    const user = Keypair.generate().publicKey;
    const buf = Buffer.alloc(8 + 32 + 8 + 8 + 1 + 32 + 8);
    TRADE_EVENT_DISCRIMINATOR.copy(buf, 0);
    Buffer.from(mint.toBytes()).copy(buf, 8);
    buf.writeBigUInt64LE(1_000_000_000n, 40);
    buf.writeBigUInt64LE(2_000_000n, 48);
    buf.writeUInt8(1, 56);
    Buffer.from(user.toBytes()).copy(buf, 57);
    buf.writeBigInt64LE(1_700_000_000n, 89);
    const fields = parseTradeEventFields(buf);
    expect(fields.mint).toBe(mint.toBase58());
    expect(fields.solAmount).toBe("1000000000");
    expect(fields.tokenAmount).toBe("2000000");
    expect(fields.isBuy).toBe(true);
    expect(fields.user).toBe(user.toBase58());

    const logs = [
      "Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke [1]",
      `Program data: ${buf.toString("base64")}`,
    ];
    const parsed = parseProgramLogs(logs);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe("TradeEvent");
    expect(classifyLogs(logs).programs).toContain("pump");
  });

  it("builds logsSubscribe and DFlow stream URLs", () => {
    const msg = logsSubscribeMessage([
      "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
    ]);
    expect(msg.method).toBe("logsSubscribe");
    expect(dflowPriorityFeesStreamUrl("https://quote-api.dflow.net")).toBe(
      "wss://quote-api.dflow.net/priority-fees/stream",
    );
  });

  it("parses priority fee JSON and buffers events", () => {
    const fees = parseDflowPriorityFees({
      mediumMicroLamports: 1000,
      highMicroLamports: 5000,
      veryHighMicroLamports: 20000,
    });
    expect(fees.highMicroLamports).toBe(5000);
    expect(() => parseDflowPriorityFees({})).toThrow(/missing/);
    pushStreamEvent("test", {
      source: "dflow-priority-fees",
      at: 10,
      payload: fees,
    });
    expect(pollStreamEvents("test", 5)).toHaveLength(1);
    expect(pollStreamEvents("test", 10)).toHaveLength(0);
  });
});
