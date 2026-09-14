import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertNoSecretFields } from "./secrets.ts";

export type OwsAccount = {
  chainId: string;
  label: string;
  address: string;
};

export type OwsWalletDescriptor = {
  id: string;
  name: string;
  secured: boolean;
  accounts: OwsAccount[];
  createdAt?: string;
};

export type OwsRunResult = {
  stdout: string;
  stderr: string;
  code: number;
};

export type OwsRunner = (
  args: string[],
  opts?: { env?: NodeJS.ProcessEnv },
) => Promise<OwsRunResult>;

const SECRET_KEY =
  /mnemonic|private[_-]?key|seed|passphrase|ciphertext|secretKey|rawToken/i;

export function owsBin(): string {
  const envBin = process.env.OWS_BIN?.trim();
  if (envBin) return envBin;
  const homeBin = path.join(os.homedir(), ".ows", "bin", "ows");
  if (existsSync(homeBin)) return homeBin;
  return "ows";
}

export function normalizeOwsChain(chain: string): string {
  const raw = chain.trim();
  const lower = raw.toLowerCase();
  if (lower === "evm") return "ethereum";
  if (lower === "eth") return "ethereum";
  return raw;
}

/** Solana unsigned tickets from fun-block are base64; OWS `--tx` wants hex. */
export function unsignedTxToHex(tx: string): string {
  const raw = tx.trim();
  if (!raw) throw new Error("tx is required");
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) return raw.toLowerCase();
  const buf = Buffer.from(raw, "base64");
  if (buf.length === 0) throw new Error("tx is not valid hex or base64");
  return buf.toString("hex");
}

export function sanitizeOwsValue(value: unknown, path = "ows"): unknown {
  if (Array.isArray(value)) return value.map((v, i) => sanitizeOwsValue(v, `${path}[${i}]`));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = sanitizeOwsValue(child, `${path}.${key}`);
  }
  return out;
}

export function parseWalletList(text: string): OwsWalletDescriptor[] {
  const wallets: OwsWalletDescriptor[] = [];
  let current: OwsWalletDescriptor | null = null;
  for (const line of text.split(/\r?\n/)) {
    const id = line.match(/^ID:\s+(\S+)/);
    if (id) {
      current = { id: id[1]!, name: "", secured: false, accounts: [] };
      wallets.push(current);
      continue;
    }
    if (!current) continue;
    const name = line.match(/^Name:\s+(.+)$/);
    if (name) {
      current.name = name[1]!.trim();
      continue;
    }
    if (line.startsWith("Secured:")) {
      current.secured = /✓|encrypted/i.test(line);
      continue;
    }
    const created = line.match(/^Created:\s+(.+)$/);
    if (created) {
      current.createdAt = created[1]!.trim();
      continue;
    }
    const acct = line.match(/^\s+(\S+)\s+\(([^)]+)\)\s+→\s+(\S+)/);
    if (acct) {
      current.accounts.push({
        chainId: acct[1]!,
        label: acct[2]!,
        address: acct[3]!,
      });
    }
  }
  return wallets;
}

export function solanaAccount(wallet: OwsWalletDescriptor): OwsAccount | undefined {
  return wallet.accounts.find(
    (a) => a.label === "solana" || a.chainId.startsWith("solana:"),
  );
}

export function buildOwsArgs(
  command: string[],
  flags: Record<string, string | number | boolean | undefined>,
): string[] {
  const args = [...command];
  for (const [key, value] of Object.entries(flags)) {
    if (value === undefined || value === false) continue;
    if (value === true) {
      args.push(`--${key}`);
      continue;
    }
    args.push(`--${key}`, String(value));
  }
  return args;
}

export const defaultOwsRunner: OwsRunner = (args, opts) =>
  new Promise((resolve, reject) => {
    const child = spawn(owsBin(), args, {
      env: { ...process.env, ...opts?.env, PATH: `${path.join(os.homedir(), ".ows", "bin")}:${process.env.PATH ?? ""}` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (c) => stdout.push(c));
    child.stderr.on("data", (c) => stderr.push(c));
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        code: code ?? 1,
      }),
    );
  });

async function runOws(
  args: string[],
  runner: OwsRunner = defaultOwsRunner,
): Promise<OwsRunResult> {
  const result = await runner(args);
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `ows exited ${result.code}`);
  }
  return result;
}

export async function listOwsWallets(
  runner: OwsRunner = defaultOwsRunner,
): Promise<OwsWalletDescriptor[]> {
  const result = await runOws(["wallet", "list"], runner);
  return parseWalletList(result.stdout);
}

export async function createOwsWallet(
  name: string,
  runner: OwsRunner = defaultOwsRunner,
): Promise<{ name: string; created: boolean; wallets: OwsWalletDescriptor[] }> {
  assertNoSecretFields({ name });
  const existing = await listOwsWallets(runner);
  if (existing.some((w) => w.name === name)) {
    return { name, created: false, wallets: existing.filter((w) => w.name === name) };
  }
  await runOws(["wallet", "create", "--name", name], runner);
  const wallets = (await listOwsWallets(runner)).filter((w) => w.name === name);
  return { name, created: true, wallets };
}

export async function signOwsMessage(
  input: {
    wallet: string;
    chain: string;
    message: string;
    encoding?: "utf8" | "hex";
    index?: number;
  },
  runner: OwsRunner = defaultOwsRunner,
): Promise<Record<string, unknown>> {
  assertNoSecretFields(input);
  const args = buildOwsArgs(["sign", "message"], {
    wallet: input.wallet,
    chain: normalizeOwsChain(input.chain),
    message: input.message,
    encoding: input.encoding,
    index: input.index,
    json: true,
  });
  const result = await runOws(args, runner);
  return sanitizeOwsValue(JSON.parse(result.stdout)) as Record<string, unknown>;
}

export async function signOwsTx(
  input: {
    wallet: string;
    chain: string;
    tx: string;
    index?: number;
    send?: boolean;
    rpcUrl?: string;
  },
  runner: OwsRunner = defaultOwsRunner,
): Promise<Record<string, unknown>> {
  assertNoSecretFields(input);
  const hex = unsignedTxToHex(input.tx);
  const cmd = input.send ? ["sign", "send-tx"] : ["sign", "tx"];
  const args = buildOwsArgs(cmd, {
    wallet: input.wallet,
    chain: normalizeOwsChain(input.chain),
    tx: hex,
    index: input.index,
    json: true,
    "rpc-url": input.send ? input.rpcUrl : undefined,
  });
  const result = await runOws(args, runner);
  return sanitizeOwsValue({
    ...JSON.parse(result.stdout),
    chain: normalizeOwsChain(input.chain),
    wallet: input.wallet,
    sent: Boolean(input.send),
  }) as Record<string, unknown>;
}
