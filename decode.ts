import { PublicKey } from "@solana/web3.js";
import { BONDING_CURVE_DISCRIMINATOR, POOL_DISCRIMINATOR } from "./constants.ts";

function u64le(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

function i64le(buf: Buffer, offset: number): bigint {
  return buf.readBigInt64LE(offset);
}

function i128le(buf: Buffer, offset: number): bigint {
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigInt64LE(offset + 8);
  return (hi << 64n) + lo;
}

function pubkey(buf: Buffer, offset: number): string {
  return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

export type BondingCurve = {
  virtualTokenReserves: bigint;
  virtualQuoteReserves: bigint;
  realTokenReserves: bigint;
  realQuoteReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  creator: string | null;
  isMayhemMode: boolean;
  isCashbackCoin: boolean;
  quoteMint: string | null;
  dataLength: number;
};

export function encodeBondingCurve(curve: {
  virtualTokenReserves: bigint;
  virtualQuoteReserves: bigint;
  realTokenReserves: bigint;
  realQuoteReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  creator: string;
  isMayhemMode?: boolean;
  isCashbackCoin?: boolean;
  quoteMint?: string;
}): Buffer {
  const buf = Buffer.alloc(115);
  BONDING_CURVE_DISCRIMINATOR.copy(buf, 0);
  buf.writeBigUInt64LE(curve.virtualTokenReserves, 8);
  buf.writeBigUInt64LE(curve.virtualQuoteReserves, 16);
  buf.writeBigUInt64LE(curve.realTokenReserves, 24);
  buf.writeBigUInt64LE(curve.realQuoteReserves, 32);
  buf.writeBigUInt64LE(curve.tokenTotalSupply, 40);
  buf.writeUInt8(curve.complete ? 1 : 0, 48);
  Buffer.from(new PublicKey(curve.creator).toBytes()).copy(buf, 49);
  buf.writeUInt8(curve.isMayhemMode ? 1 : 0, 81);
  buf.writeUInt8(curve.isCashbackCoin ? 1 : 0, 82);
  const quote = curve.quoteMint ?? "11111111111111111111111111111111";
  Buffer.from(new PublicKey(quote).toBytes()).copy(buf, 83);
  return buf;
}

export function decodeBondingCurve(data: Buffer | Uint8Array): BondingCurve {
  const buf = Buffer.from(data);
  if (buf.length < 49) {
    throw new Error(`bonding curve account too small: ${buf.length} bytes`);
  }
  const disc = buf.subarray(0, 8);
  if (!disc.equals(BONDING_CURVE_DISCRIMINATOR)) {
    throw new Error("not a BondingCurve account (discriminator mismatch)");
  }
  const curve: BondingCurve = {
    virtualTokenReserves: u64le(buf, 8),
    virtualQuoteReserves: u64le(buf, 16),
    realTokenReserves: u64le(buf, 24),
    realQuoteReserves: u64le(buf, 32),
    tokenTotalSupply: u64le(buf, 40),
    complete: buf[48] !== 0,
    creator: buf.length >= 81 ? pubkey(buf, 49) : null,
    isMayhemMode: buf.length >= 82 ? buf[81] !== 0 : false,
    isCashbackCoin: buf.length >= 83 ? buf[82] !== 0 : false,
    quoteMint: buf.length >= 115 ? pubkey(buf, 83) : null,
    dataLength: buf.length,
  };
  return curve;
}

export type PumpPool = {
  poolBump: number;
  index: number;
  creator: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  poolBaseTokenAccount: string;
  poolQuoteTokenAccount: string;
  lpSupply: bigint;
  coinCreator: string;
  isMayhemMode: boolean;
  isCashbackCoin: boolean;
  virtualQuoteReserves: bigint;
};

export function decodePool(data: Buffer | Uint8Array): PumpPool {
  const buf = Buffer.from(data);
  if (buf.length < 211) {
    throw new Error(`pool account too small: ${buf.length} bytes`);
  }
  if (!buf.subarray(0, 8).equals(POOL_DISCRIMINATOR)) {
    throw new Error("not a Pool account (discriminator mismatch)");
  }
  let o = 8;
  const poolBump = buf[o]!;
  o += 1;
  const index = buf.readUInt16LE(o);
  o += 2;
  const creator = pubkey(buf, o);
  o += 32;
  const baseMint = pubkey(buf, o);
  o += 32;
  const quoteMint = pubkey(buf, o);
  o += 32;
  const lpMint = pubkey(buf, o);
  o += 32;
  const poolBaseTokenAccount = pubkey(buf, o);
  o += 32;
  const poolQuoteTokenAccount = pubkey(buf, o);
  o += 32;
  const lpSupply = u64le(buf, o);
  o += 8;
  const coinCreator = pubkey(buf, o);
  o += 32;
  const isMayhemMode = buf[o] !== 0;
  o += 1;
  const isCashbackCoin = buf[o] !== 0;
  o += 1;
  const virtualQuoteReserves = buf.length >= o + 16 ? i128le(buf, o) : 0n;
  return {
    poolBump,
    index,
    creator,
    baseMint,
    quoteMint,
    lpMint,
    poolBaseTokenAccount,
    poolQuoteTokenAccount,
    lpSupply,
    coinCreator,
    isMayhemMode,
    isCashbackCoin,
    virtualQuoteReserves,
  };
}

export function effectiveQuoteReserves(
  poolQuoteTokenAccountAmount: bigint,
  virtualQuoteReserves: bigint,
): bigint {
  return poolQuoteTokenAccountAmount + virtualQuoteReserves;
}

export { i64le, u64le, pubkey };
