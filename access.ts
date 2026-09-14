import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PublicKey } from "@solana/web3.js";
import { rpcUrl } from "./utils.ts";

export const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";
export const SESSION_COOKIE = "clawd_session";
export const HOLDER_EXCLUDED_TOOLS = new Set([
  "list-accounts", "composio-session-mcp", "ows-wallet-list", "ows-wallet-create", "ows-sign-message", "ows-sign-tx",
]);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");

export class AccessError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export type Balance = { raw: string; decimals: number; display: string };
export function parseBalanceResponse(value: unknown, wallet: string): Balance {
  const body = value as { error?: unknown; result?: { value?: Array<{ account?: { data?: { parsed?: { info?: { owner?: string; mint?: string; tokenAmount?: { amount?: string; decimals?: number } } } } } }> } };
  if (body.error || !Array.isArray(body.result?.value)) throw new AccessError(503, "Balance verification is unavailable. Please retry.");
  let raw = 0n;
  let decimals: number | undefined;
  for (const entry of body.result.value) {
    const info = entry.account?.data?.parsed?.info;
    if (info?.owner !== wallet || info.mint !== CLAWD_MINT) throw new AccessError(503, "Unexpected token account response.");
    const amount = info.tokenAmount;
    if (!amount || !/^\d+$/.test(amount.amount ?? "") || !Number.isInteger(amount.decimals) || amount.decimals! < 0 || amount.decimals! > 18) throw new AccessError(503, "Invalid token balance response.");
    if (decimals !== undefined && decimals !== amount.decimals) throw new AccessError(503, "Inconsistent token decimals.");
    decimals = amount.decimals;
    raw += BigInt(amount.amount!);
  }
  const places = decimals ?? 6;
  const digits = raw.toString().padStart(places + 1, "0");
  const display = places ? `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/\.?0+$/, "") : digits;
  return { raw: raw.toString(), decimals: places, display: display || "0" };
}

export async function fetchClawdBalance(wallet: string): Promise<Balance> {
  try {
    const res = await fetch(rpcUrl(), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner", params: [wallet, { mint: CLAWD_MINT }, { encoding: "jsonParsed", commitment: "confirmed" }] }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error("RPC unavailable");
    return parseBalanceResponse(await res.json(), wallet);
  } catch {
    throw new AccessError(503, "Could not verify Clawd holdings. Please try again shortly.");
  }
}

type Challenge = { wallet: string; message: string; expires: number };
type KeyRow = { id: string; wallet: string; name: string; prefix: string; created: number; revoked: number | null };

export class AccessService {
  db: DatabaseSync;
  private getBalance: (wallet: string) => Promise<Balance>;
  private now: () => number;
  private cache = new Map<string, { until: number; balance: Balance }>();
  constructor(options: { file?: string; balance?: (wallet: string) => Promise<Balance>; now?: () => number } = {}) {
    const file = options.file ?? path.join(process.env.API_DATA_DIR ?? ".data", "access.sqlite");
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, wallet TEXT NOT NULL, message TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, wallet TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, hash TEXT UNIQUE NOT NULL, wallet TEXT NOT NULL, name TEXT NOT NULL, purpose TEXT NOT NULL, prefix TEXT NOT NULL, created INTEGER NOT NULL, revoked INTEGER);
      CREATE INDEX IF NOT EXISTS keys_wallet ON api_keys(wallet);
      CREATE TABLE IF NOT EXISTS limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
    this.getBalance = options.balance ?? fetchClawdBalance;
    this.now = options.now ?? Date.now;
  }
  close() { this.db.close(); }
  rateLimit(scope: string, limit: number, period = 60_000) {
    const now = this.now();
    this.db.prepare("DELETE FROM limits WHERE expires <= ?").run(now);
    const bucket = hash(scope) + ":" + Math.floor(now / period);
    const result = this.db.prepare("INSERT INTO limits VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 RETURNING count").get(bucket, (Math.floor(now / period) + 1) * period) as { count: number };
    if (result.count > limit) throw new AccessError(429, "Rate limit reached. Please wait a minute and retry.");
  }
  challenge(wallet: string, origin: string) {
    try { if (new PublicKey(wallet).toBase58() !== wallet) throw new Error(); } catch { throw new AccessError(400, "Enter a valid Solana wallet address."); }
    this.rateLimit("challenge-wallet:" + wallet, 5);
    this.db.prepare("DELETE FROM challenges WHERE expires <= ?").run(this.now());
    const id = random();
    const expires = this.now() + 5 * 60_000;
    const message = `${new URL(origin).host} wants you to sign in with your Solana account:\n${wallet}\n\nSign in to Clawd developer access. This does not authorize a transaction or transfer.\n\nURI: ${origin}\nVersion: 1\nChain ID: solana:mainnet\nNonce: ${id}\nIssued At: ${new Date(this.now()).toISOString()}\nExpiration Time: ${new Date(expires).toISOString()}`;
    this.db.prepare("INSERT INTO challenges VALUES (?, ?, ?, ?)").run(id, wallet, message, expires);
    return { id, message, expires };
  }
  login(id: string, signature: string) {
    const challenge = this.db.prepare("SELECT wallet, message, expires FROM challenges WHERE id = ?").get(id) as Challenge | undefined;
    if (!challenge || challenge.expires <= this.now()) throw new AccessError(401, "Sign-in request expired or was already used. Reconnect your wallet.");
    let valid = false;
    try {
      const sig = Buffer.from(signature, "base64");
      const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), new PublicKey(challenge.wallet).toBuffer()]), format: "der", type: "spki" });
      valid = sig.length === 64 && verify(null, Buffer.from(challenge.message), key, sig);
    } catch { /* fail closed */ }
    if (!valid) throw new AccessError(401, "Wallet signature did not match. Please sign in again.");
    this.db.prepare("DELETE FROM challenges WHERE id = ?").run(id);
    this.db.prepare("DELETE FROM sessions WHERE expires <= ?").run(this.now());
    const token = random();
    this.db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(hash(token), challenge.wallet, this.now() + 3_600_000);
    return { token, wallet: challenge.wallet };
  }
  wallet(token: string | undefined) {
    if (!token) throw new AccessError(401, "Connect and verify your wallet first.");
    const row = this.db.prepare("SELECT wallet FROM sessions WHERE hash = ? AND expires > ?").get(hash(token), this.now()) as { wallet: string } | undefined;
    if (!row) throw new AccessError(401, "Your session expired. Reconnect your wallet.");
    return row.wallet;
  }
  logout(token?: string) { if (token) this.db.prepare("DELETE FROM sessions WHERE hash = ?").run(hash(token)); }
  async balance(wallet: string, fresh = false) {
    const cached = this.cache.get(wallet);
    if (!fresh && cached && cached.until > this.now()) return cached.balance;
    const balance = await this.getBalance(wallet);
    if (this.cache.size >= 1000) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(wallet, { balance, until: this.now() + 60_000 });
    return balance;
  }
  async requireHolder(wallet: string, fresh = false) {
    const balance = await this.balance(wallet, fresh);
    if (BigInt(balance.raw) <= 0n) throw new AccessError(403, "This wallet must hold Clawd to receive or use a key.");
    return balance;
  }
  listKeys(wallet: string) {
    return this.db.prepare("SELECT id, name, prefix, created, revoked FROM api_keys WHERE wallet = ? ORDER BY created DESC LIMIT 100").all(wallet);
  }
  async issue(wallet: string, name: string, purpose: string) {
    if (!name.trim() || name.length > 60 || purpose.trim().length < 10 || purpose.length > 500) throw new AccessError(400, "Add a project name (up to 60 characters) and a short use case (10–500 characters).");
    this.rateLimit("issue:" + wallet, 5, 3_600_000);
    await this.requireHolder(wallet, true);
    // No awaits between counting and inserting: issuance is atomic within this single-process service.
    const count = this.db.prepare("SELECT count(*) AS n FROM api_keys WHERE wallet = ? AND revoked IS NULL").get(wallet) as { n: number };
    if (count.n >= 3) throw new AccessError(409, "You can have three active keys. Revoke a key to create another.");
    const key = "clawd_" + random();
    const id = randomBytes(12).toString("hex");
    const prefix = key.slice(0, 14);
    const created = this.now();
    this.db.prepare("INSERT INTO api_keys VALUES (?, ?, ?, ?, ?, ?, ?, NULL)").run(id, hash(key), wallet, name.trim(), purpose.trim(), prefix, created);
    return { id, key, prefix, name: name.trim(), created };
  }
  revoke(wallet: string, id: string) {
    const result = this.db.prepare("UPDATE api_keys SET revoked = ? WHERE id = ? AND wallet = ? AND revoked IS NULL").run(this.now(), id, wallet);
    if (!result.changes) throw new AccessError(404, "Key not found or already revoked.");
  }
  async authorize(key: string) {
    const row = this.db.prepare("SELECT id, wallet FROM api_keys WHERE hash = ? AND revoked IS NULL").get(hash(key)) as KeyRow | undefined;
    if (!row) throw new AccessError(401, "Invalid or revoked API key.");
    this.rateLimit("mcp:" + row.wallet, 60);
    await this.requireHolder(row.wallet);
    return row.wallet;
  }
}
