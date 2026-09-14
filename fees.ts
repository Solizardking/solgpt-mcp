/**
 * Fee tiers from docs/fees.png (PumpSwap canonical pools + bonding-curve row).
 * Basis points: 1 bps = 0.01%.
 */

export type FeeTier = {
  label: string;
  approxMcapUsd: string;
  minQuoteSol: bigint | null;
  maxQuoteSol: bigint | null;
  creatorFeeBps: bigint;
  protocolFeeBps: bigint;
  lpFeeBps: bigint;
};

const SOL = 1_000_000_000n;

export const FEE_TIERS: readonly FeeTier[] = [
  {
    label: "Bonding curve",
    approxMcapUsd: "N/A",
    minQuoteSol: null,
    maxQuoteSol: null,
    creatorFeeBps: 30n,
    protocolFeeBps: 95n,
    lpFeeBps: 0n,
  },
  {
    label: "0-420 SOL (PumpSwap)",
    approxMcapUsd: "0-85k",
    minQuoteSol: 0n,
    maxQuoteSol: 420n * SOL,
    creatorFeeBps: 30n,
    protocolFeeBps: 93n,
    lpFeeBps: 2n,
  },
  {
    label: "420-1470 SOL (PumpSwap)",
    approxMcapUsd: "85k-300k",
    minQuoteSol: 420n * SOL,
    maxQuoteSol: 1470n * SOL,
    creatorFeeBps: 95n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "1470-2460 SOL (PumpSwap)",
    approxMcapUsd: "300k-500k",
    minQuoteSol: 1470n * SOL,
    maxQuoteSol: 2460n * SOL,
    creatorFeeBps: 90n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "2460-3440 SOL (PumpSwap)",
    approxMcapUsd: "500k-700k",
    minQuoteSol: 2460n * SOL,
    maxQuoteSol: 3440n * SOL,
    creatorFeeBps: 85n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "3440-4420 SOL (PumpSwap)",
    approxMcapUsd: "700k-900k",
    minQuoteSol: 3440n * SOL,
    maxQuoteSol: 4420n * SOL,
    creatorFeeBps: 80n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "4420-9820 SOL (PumpSwap)",
    approxMcapUsd: "900k-2M",
    minQuoteSol: 4420n * SOL,
    maxQuoteSol: 9820n * SOL,
    creatorFeeBps: 75n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "9820-14740 SOL (PumpSwap)",
    approxMcapUsd: "2-3M",
    minQuoteSol: 9820n * SOL,
    maxQuoteSol: 14740n * SOL,
    creatorFeeBps: 70n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "14740-19650 SOL (PumpSwap)",
    approxMcapUsd: "3-4M",
    minQuoteSol: 14740n * SOL,
    maxQuoteSol: 19650n * SOL,
    creatorFeeBps: 65n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "19650-24560 SOL (PumpSwap)",
    approxMcapUsd: "4-5M",
    minQuoteSol: 19650n * SOL,
    maxQuoteSol: 24560n * SOL,
    creatorFeeBps: 60n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "24560-29470 SOL (PumpSwap)",
    approxMcapUsd: "5-6M",
    minQuoteSol: 24560n * SOL,
    maxQuoteSol: 29470n * SOL,
    creatorFeeBps: 55n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "29470-34380 SOL (PumpSwap)",
    approxMcapUsd: "6-7M",
    minQuoteSol: 29470n * SOL,
    maxQuoteSol: 34380n * SOL,
    creatorFeeBps: 50n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "34380-39300 SOL (PumpSwap)",
    approxMcapUsd: "7-8M",
    minQuoteSol: 34380n * SOL,
    maxQuoteSol: 39300n * SOL,
    creatorFeeBps: 45n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "39300-44210 SOL (PumpSwap)",
    approxMcapUsd: "8-9M",
    minQuoteSol: 39300n * SOL,
    maxQuoteSol: 44210n * SOL,
    creatorFeeBps: 40n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "44210-49120 SOL (PumpSwap)",
    approxMcapUsd: "9-10M",
    minQuoteSol: 44210n * SOL,
    maxQuoteSol: 49120n * SOL,
    creatorFeeBps: 35n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "49120-54030 SOL (PumpSwap)",
    approxMcapUsd: "10-11M",
    minQuoteSol: 49120n * SOL,
    maxQuoteSol: 54030n * SOL,
    creatorFeeBps: 30n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "54030-58940 SOL (PumpSwap)",
    approxMcapUsd: "11-12M",
    minQuoteSol: 54030n * SOL,
    maxQuoteSol: 58940n * SOL,
    creatorFeeBps: 28n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "58940-63860 SOL (PumpSwap)",
    approxMcapUsd: "12-13M",
    minQuoteSol: 58940n * SOL,
    maxQuoteSol: 63860n * SOL,
    creatorFeeBps: 25n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "63860-68770 SOL (PumpSwap)",
    approxMcapUsd: "13-14M",
    minQuoteSol: 63860n * SOL,
    maxQuoteSol: 68770n * SOL,
    creatorFeeBps: 23n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "68770-73681 SOL (PumpSwap)",
    approxMcapUsd: "14-15M",
    minQuoteSol: 68770n * SOL,
    maxQuoteSol: 73681n * SOL,
    creatorFeeBps: 20n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "73681-78590 SOL (PumpSwap)",
    approxMcapUsd: "15-16M",
    minQuoteSol: 73681n * SOL,
    maxQuoteSol: 78590n * SOL,
    creatorFeeBps: 18n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "78590-83500 SOL (PumpSwap)",
    approxMcapUsd: "16-17M",
    minQuoteSol: 78590n * SOL,
    maxQuoteSol: 83500n * SOL,
    creatorFeeBps: 15n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "83500-88400 SOL (PumpSwap)",
    approxMcapUsd: "17-18M",
    minQuoteSol: 83500n * SOL,
    maxQuoteSol: 88400n * SOL,
    creatorFeeBps: 13n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "88400-93330 SOL (PumpSwap)",
    approxMcapUsd: "18-19M",
    minQuoteSol: 88400n * SOL,
    maxQuoteSol: 93330n * SOL,
    creatorFeeBps: 10n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "93330-98240 SOL (PumpSwap)",
    approxMcapUsd: "19-20M",
    minQuoteSol: 93330n * SOL,
    maxQuoteSol: 98240n * SOL,
    creatorFeeBps: 8n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
  {
    label: "98240+ SOL (PumpSwap)",
    approxMcapUsd: "20M+",
    minQuoteSol: 98240n * SOL,
    maxQuoteSol: null,
    creatorFeeBps: 5n,
    protocolFeeBps: 5n,
    lpFeeBps: 20n,
  },
];

export function totalFeeBps(tier: FeeTier): bigint {
  return tier.creatorFeeBps + tier.protocolFeeBps + tier.lpFeeBps;
}

export function bondingCurveFeeTier(): FeeTier {
  return FEE_TIERS[0]!;
}

/** Select a PumpSwap tier from quote reserves in lamports. Iterates high-to-low. */
export function pumpSwapFeeTier(quoteReservesLamports: bigint): FeeTier {
  const swapTiers = FEE_TIERS.filter((t) => t.minQuoteSol !== null);
  for (let i = swapTiers.length - 1; i >= 0; i--) {
    const tier = swapTiers[i]!;
    if (tier.minQuoteSol != null && quoteReservesLamports >= tier.minQuoteSol) {
      return tier;
    }
  }
  return swapTiers[0]!;
}

export function serializeFeeTier(tier: FeeTier) {
  return {
    label: tier.label,
    approxMcapUsd: tier.approxMcapUsd,
    minQuoteSol: tier.minQuoteSol?.toString() ?? null,
    maxQuoteSol: tier.maxQuoteSol?.toString() ?? null,
    creatorFeeBps: Number(tier.creatorFeeBps),
    protocolFeeBps: Number(tier.protocolFeeBps),
    lpFeeBps: Number(tier.lpFeeBps),
    totalFeeBps: Number(totalFeeBps(tier)),
  };
}
