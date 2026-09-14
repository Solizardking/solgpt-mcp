import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PublicKey } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';
import { AccessService, CLAWD_MINT, parseBalanceResponse } from './access.ts';

function identity() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const wallet = new PublicKey(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)).toBase58();
  return { wallet, sign: (message: string) => sign(null, Buffer.from(message), privateKey).toString('base64') };
}
const positive = async () => ({ raw: '1000000', decimals: 6, display: '1' });
const project = ['My agent', 'An agent for public Solana data'] as const;

describe('Clawd wallet verification and API keys', () => {
  it('proves possession, consumes the nonce, and stores only a session hash', () => {
    const service = new AccessService({ file: ':memory:', balance: positive });
    try {
      const user = identity();
      const challenge = service.challenge(user.wallet, 'https://example.test');
      expect(challenge.message).toContain('example.test wants you to sign in');
      const result = service.login(challenge.id, user.sign(challenge.message));
      expect(service.wallet(result.token)).toBe(user.wallet);
      expect(() => service.login(challenge.id, user.sign(challenge.message))).toThrow('already used');
      const row = service.db.prepare('SELECT hash FROM sessions').get();
      expect(row?.hash).not.toBe(result.token);
      service.logout(result.token);
      expect(() => service.wallet(result.token)).toThrow('expired');
    } finally { service.close(); }
  });
  it('rejects forged signatures and messages signed by a different wallet', () => {
    const service = new AccessService({ file: ':memory:' });
    try {
      const user = identity(), attacker = identity();
      const challenge = service.challenge(user.wallet, 'https://example.test');
      expect(() => service.login(challenge.id, attacker.sign(challenge.message))).toThrow('signature');
      expect(() => service.login(challenge.id, user.sign(challenge.message + 'tampered'))).toThrow('signature');
      expect(() => service.login(challenge.id, 'invalid')).toThrow('signature');
    } finally { service.close(); }
  });
  it('expires challenges and wallet sessions', () => {
    let now = 1_000_000;
    const service = new AccessService({ file: ':memory:', now: () => now });
    try {
      const user = identity();
      const challenge = service.challenge(user.wallet, 'https://example.test');
      now += 300_001;
      expect(() => service.login(challenge.id, user.sign(challenge.message))).toThrow('expired');
      const fresh = service.challenge(user.wallet, 'https://example.test');
      const session = service.login(fresh.id, user.sign(fresh.message));
      now += 3_600_001;
      expect(() => service.wallet(session.token)).toThrow('expired');
    } finally { service.close(); }
  });
  it('rejects missing or invalid wallet identities', () => {
    const service = new AccessService({ file: ':memory:' });
    try {
      expect(() => service.challenge('not-a-wallet', 'https://example.test')).toThrow('valid Solana');
      expect(() => service.wallet(undefined)).toThrow('verify your wallet');
    } finally { service.close(); }
  });
  it('rejects nonholders and fails closed on RPC errors', async () => {
    const empty = new AccessService({ file: ':memory:', balance: async () => ({ raw: '0', decimals: 6, display: '0' }) });
    const down = new AccessService({ file: ':memory:', balance: async () => { throw new Error('RPC unavailable'); } });
    try {
      await expect(empty.issue(identity().wallet, ...project)).rejects.toThrow('must hold');
      await expect(down.issue(identity().wallet, ...project)).rejects.toThrow('RPC unavailable');
      expect(empty.db.prepare('SELECT count(*) n FROM api_keys').get()?.n).toBe(0);
      expect(down.db.prepare('SELECT count(*) n FROM api_keys').get()?.n).toBe(0);
    } finally { empty.close(); down.close(); }
  });
  it('accepts even one base unit, enforces key limits, and isolates revocation by wallet', async () => {
    const service = new AccessService({ file: ':memory:', balance: async () => ({ raw: '1', decimals: 6, display: '0.000001' }) });
    try {
      const user = identity(), other = identity();
      const key = await service.issue(user.wallet, ...project);
      expect(await service.authorize(key.key)).toBe(user.wallet);
      expect(JSON.stringify(service.listKeys(user.wallet))).not.toContain(key.key);
      expect(service.listKeys(other.wallet)).toHaveLength(0);
      expect(() => service.revoke(other.wallet, key.id)).toThrow('not found');
      await service.issue(user.wallet, ...project);
      await service.issue(user.wallet, ...project);
      await expect(service.issue(user.wallet, ...project)).rejects.toThrow('three active');
      service.revoke(user.wallet, key.id);
      await expect(service.authorize(key.key)).rejects.toThrow('revoked');
    } finally { service.close(); }
  });
  it('rechecks holdings after the bounded cache expires', async () => {
    let now = 1_000_000, raw = '1';
    const service = new AccessService({ file: ':memory:', now: () => now, balance: async () => ({ raw, decimals: 6, display: raw }) });
    try {
      const key = await service.issue(identity().wallet, ...project);
      await expect(service.authorize(key.key)).resolves.toBeTruthy();
      raw = '0'; now += 60_001;
      await expect(service.authorize(key.key)).rejects.toThrow('must hold');
    } finally { service.close(); }
  });
  it('persists issued keys and revocations across restarts without raw secrets', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'clawd-keys-'));
    const file = path.join(dir, 'access.sqlite');
    let service = new AccessService({ file, balance: positive });
    try {
      const wallet = identity().wallet, key = await service.issue(wallet, ...project);
      expect(JSON.stringify(service.db.prepare('SELECT * FROM api_keys').all())).not.toContain(key.key);
      service.close(); service = new AccessService({ file, balance: positive });
      expect(await service.authorize(key.key)).toBe(wallet);
      service.revoke(wallet, key.id);
      service.close(); service = new AccessService({ file, balance: positive });
      await expect(service.authorize(key.key)).rejects.toThrow('revoked');
    } finally { service.close(); rmSync(dir, { recursive: true, force: true }); }
  });
  it('limits requests per wallet rather than per API key', async () => {
    const service = new AccessService({ file: ':memory:', balance: positive });
    try {
      const user = identity(), first = await service.issue(user.wallet, ...project), second = await service.issue(user.wallet, ...project);
      for (let i = 0; i < 60; i++) await service.authorize(i % 2 ? first.key : second.key);
      await expect(service.authorize(first.key)).rejects.toThrow('Rate limit');
    } finally { service.close(); }
  });
});

describe('on-chain balance parsing', () => {
  const wallet = identity().wallet;
  const account = (raw: string, mint = CLAWD_MINT, owner = wallet) => ({ account: { data: { parsed: { info: { mint, owner, tokenAmount: { amount: raw, decimals: 6 } } } } } });
  it('sums all token accounts without floating-point loss', () => {
    expect(parseBalanceResponse({ result: { value: [account('9007199254740993'), account('7')] } }, wallet)).toEqual({ raw: '9007199254741000', decimals: 6, display: '9007199254.741' });
  });
  it('treats an empty account list as zero', () => {
    expect(parseBalanceResponse({ result: { value: [] } }, wallet).raw).toBe('0');
  });
  it('rejects wrong mints, owners, and malformed RPC results', () => {
    expect(() => parseBalanceResponse({ result: { value: [account('1', 'wrong')] } }, wallet)).toThrow();
    expect(() => parseBalanceResponse({ result: { value: [account('1', CLAWD_MINT, 'wrong')] } }, wallet)).toThrow();
    expect(() => parseBalanceResponse({ result: { value: [account('-1')] } }, wallet)).toThrow();
    expect(() => parseBalanceResponse({ error: { code: -1 } }, wallet)).toThrow();
  });
});
