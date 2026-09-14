import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { docsRoot, mcpServerRoot } from "./utils.ts";

export type DocEntry = {
  uri: string;
  name: string;
  title: string;
  relativePath: string;
  mimeType: string;
};

function walkMarkdown(dir: string, prefix: string): DocEntry[] {
  if (!existsSync(dir)) return [];
  const out: DocEntry[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...walkMarkdown(full, `${prefix}${name.name}/`));
      continue;
    }
    const ext = path.extname(name.name).toLowerCase();
    if (![".md", ".json", ".ts", ".png"].includes(ext)) continue;
    const relativePath = `${prefix}${name.name}`;
    const mimeType =
      ext === ".json"
        ? "application/json"
        : ext === ".png"
          ? "image/png"
          : ext === ".ts"
            ? "text/plain"
            : "text/markdown";
    out.push({
      uri: `pump://docs/${relativePath}`,
      name: relativePath.replace(/\.[^.]+$/, "").replace(/\//g, "-"),
      title: relativePath,
      relativePath,
      mimeType,
    });
  }
  return out;
}

export function listPumpDocs(): DocEntry[] {
  return walkMarkdown(docsRoot, "").sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath),
  );
}

export function requiredDocPaths(): string[] {
  return [
    "README.md",
    "BREAKING_FEE_RECIPIENT.md",
    "CPI_README.md",
    "FAQ.md",
    "FEE_PROGRAM_README.md",
    "FEE_RECIPIENTS.md",
    "PUMP_CASHBACK_README.md",
    "PUMP_CREATOR_FEE_README.md",
    "PUMP_PROGRAM_README.md",
    "PUMP_SWAP_CREATOR_FEE_README.md",
    "PUMP_SWAP_README.md",
    "PUMP_SWAP_SDK_README.md",
    "idl/pump.json",
    "idl/pump.ts",
    "idl/pump_amm.json",
    "idl/pump_amm.ts",
    "idl/pump_fees.json",
    "idl/pump_fees.ts",
    "instructions/BUY.md",
    "instructions/CLAIM_CASHBACK.md",
    "instructions/COIN_CREATION.md",
    "instructions/COLLECT_CREATOR_FEE.md",
    "instructions/CREATOR_FEE_SHARING.md",
    "instructions/SELL.md",
  ];
}

export function readDoc(relativePath: string): { text?: string; blob?: Buffer; mimeType: string } {
  const abs = path.resolve(docsRoot, relativePath);
  if (!abs.startsWith(docsRoot) || !existsSync(abs)) {
    throw new Error(`unknown doc: ${relativePath}`);
  }
  const ext = path.extname(abs).toLowerCase();
  if (ext === ".png") {
    return { blob: readFileSync(abs), mimeType: "image/png" };
  }
  const mimeType =
    ext === ".json" ? "application/json" : ext === ".ts" ? "text/plain" : "text/markdown";
  return { text: readFileSync(abs, "utf8"), mimeType };
}

export function searchDocs(query: string, limit = 8): Array<DocEntry & { snippet: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: Array<DocEntry & { snippet: string; score: number }> = [];
  for (const entry of listPumpDocs()) {
    if (entry.mimeType === "image/png") continue;
    const body = readDoc(entry.relativePath).text ?? "";
    const lower = body.toLowerCase();
    const idx = lower.indexOf(q);
    const nameHit = entry.relativePath.toLowerCase().includes(q);
    if (idx < 0 && !nameHit) continue;
    const start = Math.max(0, idx - 80);
    const snippet = body.slice(start, start + 240).replace(/\s+/g, " ").trim();
    hits.push({
      ...entry,
      snippet,
      score: (nameHit ? 10 : 0) + (idx >= 0 ? 1 : 0),
    });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _s, ...rest }) => rest);
}

export function listIdlSummaries(): Record<string, { address?: string; instructions: string[]; accounts: string[]; events: string[] }> {
  const files = ["pump.json", "pump_amm.json", "pump_fees.json"];
  const out: Record<string, { address?: string; instructions: string[]; accounts: string[]; events: string[] }> = {};
  for (const file of files) {
    const raw = readFileSync(path.join(docsRoot, "idl", file), "utf8");
    const idl = JSON.parse(raw) as {
      address?: string;
      instructions?: Array<{ name?: string }>;
      accounts?: Array<{ name?: string }>;
      events?: Array<{ name?: string }>;
    };
    out[file.replace(".json", "")] = {
      address: idl.address,
      instructions: (idl.instructions ?? []).map((i) => i.name).filter(Boolean) as string[],
      accounts: (idl.accounts ?? []).map((i) => i.name).filter(Boolean) as string[],
      events: (idl.events ?? []).map((i) => i.name).filter(Boolean) as string[],
    };
  }
  return out;
}

export function instructionDocName(name: string): string {
  const map: Record<string, string> = {
    buy: "BUY.md",
    buy_v2: "BUY.md",
    sell: "SELL.md",
    sell_v2: "SELL.md",
    create: "COIN_CREATION.md",
    create_v2: "COIN_CREATION.md",
    claim_cashback: "CLAIM_CASHBACK.md",
    collect_creator_fee: "COLLECT_CREATOR_FEE.md",
    collect_creator_fee_v2: "COLLECT_CREATOR_FEE.md",
    creator_fee_sharing: "CREATOR_FEE_SHARING.md",
    sharing_config: "CREATOR_FEE_SHARING.md",
  };
  const key = name.trim().toLowerCase().replace(/-/g, "_");
  const file = map[key] ?? `${name.toUpperCase()}.md`;
  return `instructions/${file}`;
}

export function localGuidePath(name: string): string {
  return path.join(mcpServerRoot, name);
}
