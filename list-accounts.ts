import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { mcpServerRoot } from "./utils.ts";

export type ListedAccount = {
  name: string;
  publicKey: string;
};

function publicKeyFromFile(filePath: string): string | null {
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed === "string") {
    try {
      return new PublicKey(parsed).toBase58();
    } catch {
      return null;
    }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const rec = parsed as Record<string, unknown>;
    for (const key of ["publicKey", "pubkey", "address"]) {
      if (typeof rec[key] === "string") {
        try {
          return new PublicKey(rec[key]).toBase58();
        } catch {
          return null;
        }
      }
    }
  }
  if (Array.isArray(parsed) && parsed.length >= 32) {
    const bytes = Uint8Array.from(parsed as number[]);
    if (bytes.length === 64) {
      return Keypair.fromSecretKey(bytes).publicKey.toBase58();
    }
    if (bytes.length === 32) {
      return new PublicKey(bytes).toBase58();
    }
  }
  return null;
}

export function keysFolderPath(): string {
  return process.env.KEYS_FOLDER?.trim() || path.join(mcpServerRoot, ".keys");
}

/**
 * List named public wallets. Secret bytes are used only to derive a public
 * key and are never returned.
 */
export function listAccounts(folder = keysFolderPath()): {
  success: boolean;
  message: string;
  accounts: ListedAccount[];
  secretsExposed: false;
} {
  if (!existsSync(folder)) {
    return {
      success: true,
      message: `No accounts folder at ${folder}. Pass a public address to tools instead of storing keypairs.`,
      accounts: [],
      secretsExposed: false,
    };
  }
  const accounts: ListedAccount[] = [];
  for (const file of readdirSync(folder)) {
    if (!file.endsWith(".json") || file.startsWith("mint-")) continue;
    const filePath = path.join(folder, file);
    try {
      const publicKey = publicKeyFromFile(filePath);
      accounts.push({
        name: file.replace(/\.json$/, ""),
        publicKey: publicKey ?? "unreadable",
      });
    } catch {
      accounts.push({
        name: file.replace(/\.json$/, ""),
        publicKey: "unreadable",
      });
    }
  }
  return {
    success: true,
    message: accounts.length
      ? `Public accounts in ${folder} (secret keys are never returned):`
      : `No accounts found in ${folder}.`,
    accounts,
    secretsExposed: false,
  };
}

export function formatListAccountsResult(
  result: ReturnType<typeof listAccounts>,
): string {
  if (result.accounts.length === 0) return result.message;
  const lines = result.accounts.map((a) => `${a.name}: ${a.publicKey}`);
  return `${result.message}\n${lines.join("\n")}`;
}
