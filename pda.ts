import { PublicKey } from "@solana/web3.js";
import {
  PUMP_AMM_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  PUMP_PROGRAM_ID,
} from "./constants.ts";

function pda(seeds: (Buffer | Uint8Array)[], programId: string): {
  address: string;
  bump: number;
} {
  const [address, bump] = PublicKey.findProgramAddressSync(
    seeds,
    new PublicKey(programId),
  );
  return { address: address.toBase58(), bump };
}

export function bondingCurvePda(mint: string) {
  return pda(
    [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()],
    PUMP_PROGRAM_ID,
  );
}

export function globalPda() {
  return pda([Buffer.from("global")], PUMP_PROGRAM_ID);
}

export function eventAuthorityPda(programId = PUMP_PROGRAM_ID) {
  return pda([Buffer.from("__event_authority")], programId);
}

export function creatorVaultPda(creator: string) {
  return pda(
    [Buffer.from("creator-vault"), new PublicKey(creator).toBuffer()],
    PUMP_PROGRAM_ID,
  );
}

export function ammCreatorVaultPda(creator: string) {
  return pda(
    [Buffer.from("creator_vault"), new PublicKey(creator).toBuffer()],
    PUMP_AMM_PROGRAM_ID,
  );
}

export function userVolumeAccumulatorPda(
  user: string,
  programId = PUMP_PROGRAM_ID,
) {
  return pda(
    [Buffer.from("user_volume_accumulator"), new PublicKey(user).toBuffer()],
    programId,
  );
}

export function globalVolumeAccumulatorPda(programId = PUMP_PROGRAM_ID) {
  return pda([Buffer.from("global_volume_accumulator")], programId);
}

export function sharingConfigPda(mint: string) {
  return pda(
    [Buffer.from("sharing-config"), new PublicKey(mint).toBuffer()],
    PUMP_FEE_PROGRAM_ID,
  );
}

export function feeConfigPda(pumpProgramId = PUMP_PROGRAM_ID) {
  return pda(
    [Buffer.from("fee_config"), new PublicKey(pumpProgramId).toBuffer()],
    PUMP_FEE_PROGRAM_ID,
  );
}

export function mintAuthorityPda() {
  return pda([Buffer.from("mint-authority")], PUMP_PROGRAM_ID);
}

export const PUMP_PROGRAMS = {
  pump: PUMP_PROGRAM_ID,
  pumpAmm: PUMP_AMM_PROGRAM_ID,
  pumpFees: PUMP_FEE_PROGRAM_ID,
};
