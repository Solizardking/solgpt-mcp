import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  listIdlSummaries,
  listPumpDocs,
  readDoc,
  requiredDocPaths,
  searchDocs,
} from "./catalog.ts";
import { docsRoot } from "./utils.ts";

describe("pump docs catalog (shipped)", () => {
  it("every required doc/idl/instruction file exists on disk", () => {
    const missing = requiredDocPaths().filter(
      (rel) => !existsSync(path.join(docsRoot, rel)),
    );
    expect(missing).toEqual([]);
  });

  it("listPumpDocs includes README, BUY instruction, and pump IDL", () => {
    const paths = listPumpDocs().map((d) => d.relativePath);
    expect(paths).toContain("README.md");
    expect(paths).toContain("instructions/BUY.md");
    expect(paths).toContain("idl/pump.json");
    expect(paths).toContain("PUMP_SWAP_README.md");
  });

  it("searchDocs finds buy_v2 in the buy instruction doc", () => {
    const hits = searchDocs("buy_v2", 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.relativePath.includes("BUY"))).toBe(true);
    const buy = readDoc("instructions/BUY.md");
    expect(buy.text).toMatch(/buy_v2/);
  });

  it("IDL summary lists create_v2, buy_v2, sell_v2 on pump", () => {
    const idl = listIdlSummaries();
    expect(idl.pump?.address).toBe("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
    expect(idl.pump?.instructions).toContain("create_v2");
    expect(idl.pump?.instructions).toContain("buy_v2");
    expect(idl.pump?.instructions).toContain("sell_v2");
    expect(idl.pump_amm?.events).toContain("BuyEvent");
    expect(idl.pump_amm?.events).toContain("SellEvent");
  });
});
