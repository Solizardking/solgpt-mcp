/** Canonical Pump / PumpSwap / PumpFees / Mayhem program IDs from docs/. */

export const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMP_AMM_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const PUMP_FEE_PROGRAM_ID = "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ";
export const MAYHEM_PROGRAM_ID = "MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e";
export const PUMP_AGENT_PAYMENTS_PROGRAM =
  "AgenTMiC2hvxGebTsgmsD4HHBa8WEcqGFf87iwRRxLo7";

export const NATIVE_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

export const GLOBAL_PDA = "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf";
export const PUMP_AMM_GLOBAL_CONFIG =
  "ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw";

export const FUN_BLOCK_BASE = "https://fun-block.pump.fun";
export const PUMP_COINS_V2 = "https://frontend-api-v3.pump.fun/coins-v2";

export const DEFAULT_DECIMALS = 6;
export const ONE_BILLION_SUPPLY = 1_000_000_000_000_000n; // 1B * 10^6
export const INITIAL_VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000n;
export const INITIAL_VIRTUAL_SOL_RESERVES = 30_000_000_000n;
export const INITIAL_REAL_TOKEN_RESERVES = 793_100_000_000_000n;

export const BONDING_CURVE_DISCRIMINATOR = Buffer.from([
  23, 183, 248, 55, 96, 216, 172, 96,
]);
export const POOL_DISCRIMINATOR = Buffer.from([
  241, 154, 109, 4, 17, 177, 109, 188,
]);
export const TRADE_EVENT_DISCRIMINATOR = Buffer.from([
  189, 219, 127, 211, 78, 230, 97, 238,
]);
export const BUY_EVENT_DISCRIMINATOR = Buffer.from([
  103, 244, 82, 31, 44, 245, 119, 119,
]);
export const SELL_EVENT_DISCRIMINATOR = Buffer.from([
  62, 47, 55, 10, 165, 3, 220, 42,
]);
export const CREATE_EVENT_DISCRIMINATOR = Buffer.from([
  27, 114, 169, 77, 222, 235, 99, 118,
]);
export const COMPLETE_EVENT_DISCRIMINATOR = Buffer.from([
  95, 114, 97, 156, 212, 46, 152, 8,
]);

export const BUY_V2_DISCRIMINATOR = [184, 23, 238, 97, 103, 197, 211, 61];
export const SELL_V2_DISCRIMINATOR = [93, 246, 130, 60, 231, 233, 64, 178];
export const CREATE_V2_DISCRIMINATOR = [214, 144, 76, 236, 95, 139, 49, 180];

/** docs/FEE_RECIPIENTS.md */
export const NORMAL_FEE_RECIPIENTS = [
  "62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV",
  "7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ",
  "7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX",
  "9rPYyANsfQZw3DnDmKE3YCQF5E8oD89UXoHn9JFEhJUz",
  "AVmoTthdrX6tKt4nDjco2D775W2YK3sDhxPcMmzUAmTY",
  "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM",
  "FWsW1xNtWscwNmKv6wVsU1iTzRN6wmmk3MjxRP5tT7hz",
  "G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP",
] as const;

export const MAYHEM_FEE_RECIPIENTS = [
  "GesfTA3X2arioaHp8bbKdjG9vJtskViWACZoYvxp4twS",
  "4budycTjhs9fD6xw62VBducVTNgMgJJ5BgtKq7mAZwn6",
  "8SBKzEQU4nLSzcwF4a74F2iaUDQyTfjGndn6qUWBnrpR",
  "4UQeTP1T39KZ9Sfxzo3WR5skgsaP6NZa87BAkuazLEKH",
  "8sNeir4QsLsJdYpc9RZacohhK1Y5FLU3nC5LXgYB4aa6",
  "Fh9HmeLNUMVCvejxCtCL2DbYaRyBFVJ5xrWkLnMH6fdk",
  "463MEnMeGyJekNZFQSTUABBEbLnvMTALbT6ZmsxAbAdq",
  "6AUH3WEHucYZyC61hqpqYUWVto5qA5hjHuNQ32GNnNxA",
] as const;

export const BUYBACK_FEE_RECIPIENTS = [
  "5YxQFdt3Tr9zJLvkFccqXVUwhdTWJQc1fFg2YPbxvxeD",
  "9M4giFFMxmFGXtc3feFzRai56WbBqehoSeRE5GK7gf7",
  "GXPFM2caqTtQYC2cJ5yJRi9VDkpsYZXzYdwYpGnLmtDL",
  "3BpXnfJaUTiwXnJNe7Ej1rcbzqTTQUvLShZaWazebsVR",
  "5cjcW9wExnJJiqgLjq7DEG75Pm6JBgE1hNv4B2vHXUW6",
  "EHAAiTxcdDwQ3U4bU6YcMsQGaekdzLS3B5SmYo46kJtL",
  "5eHhjP8JaYkz83CWwvGU2uMUXefd3AazWGx4gpcuEEYD",
  "A7hAgCzFw14fejgCp387JUJRMNyz4j89JKnhtKU8piqW",
] as const;

export const DFLOW_TRADE_API = "https://quote-api.dflow.net";
export const DFLOW_TRADE_API_DEV = "https://dev-quote-api.dflow.net";
export const DFLOW_DOCS_INDEX = "https://pond.dflow.net/llms.txt";
export const JUPITER_DOCS_INDEX = "https://developers.jup.ag/docs/llms.txt";
export const DFLOW_OPENAPI =
  "https://pond.dflow.net/resources/trading-api/openapi.json";
export const COMPOSIO_REST_V31 = "https://backend.composio.dev/api/v3.1";
export const COMPOSIO_DOCS_INDEX = "https://docs.composio.dev/llms.txt";
export const COMPOSIO_WEBHOOK_URL = "https://solgpt.us/api/composio/triggers";
export const CLAWD_WS_ORIGIN = "https://clawd-ws.fly.dev";
export const CUSTOM_SOLGPT_TOOLKIT_SLUG = "CUSTOM_SOLGPT";
export const CUSTOM_CLAWD_WS_TOOLKIT_SLUG = "CUSTOM_CLAWD_WS";

export const UNSIGNED_NOTE =
  "Unsigned ticket. Review and sign in the user's wallet. This server never holds keys and never submits the transaction.";

export const SERVER_NAME = "pumpfun";
export const SERVER_VERSION = "1.0.0";
