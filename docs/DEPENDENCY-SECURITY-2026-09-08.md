# Dependency security review — 2026-09-08

These are local release changes; production has not been redeployed.

Production dependency audit: 62 affected package entries before changes; 59 afterward. High-severity entries fell from 7 to 4. These are affected dependency entries, not counts of proven remotely exploitable app bugs.

## Updates applied

- `fast-uri` 3.1.5 → 3.1.7, within the parent dependency range.
- `qs` 6.15.3 → 6.16.0, within the parent dependency range.
- `toml` 3.0.0 → 4.2.0 through an explicit override. CJS `parse(Buffer)` remains compatible with Anchor configuration; defensive tests cover deep recursion and prototype pollution. The runtime uses Node 22, satisfying the new Node >=20 requirement.

## Legacy bigint runtime mitigation

`bigint-buffer` 1.1.5 has no upstream patched release listed in [GHSA-3gc7-fjrx-p6mg](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg). Its native binding path is disabled for the main app.

- Postinstall/prebuild selects the package's own `dist/browser.js` entry for root and nested MCP copies. The exact version and SHA-256 are checked before patching.
- Webpack explicitly aliases `bigint-buffer` to that verified JS implementation, including nested imports and managed dependency caches.
- Tests prevent native-binding loads while round-tripping Solana 64/128/256-bit layouts and larger buffers. Invalid input throws without a native crash.
- A build gate scans compiled/traced server JS for the native bigint loader and rejects affected artifacts.
- The advisory remains visible in `npm audit`; this is a runtime mitigation, not a claim that the upstream package is fixed. Independent deployments that bypass this app's install/build hooks are not covered.

## Remaining advisory roots

| Package | Severity | Advisory |
| --- | --- | --- |
| @ai-sdk/provider-utils | low | [@ai-sdk/provider-utils has an Uncontrolled Resource Consumption issue](https://github.com/advisories/GHSA-866g-f22w-33x8) |
| bigint-buffer | high | [bigint-buffer Vulnerable to Buffer Overflow via toBigIntLE() Function](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg) |
| decode-uri-component | moderate | [decode-uri-component: Denial of service via exponential decoding of malformed percent-encoded input](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) |
| stream-json | moderate | [stream-json: pick/ignore/filter/replace filters are O(depth²) on nested input — small crafted JSON blocks the event loop for seconds→minutes (DoS)](https://github.com/advisories/GHSA-528h-pc64-c93x) |
| uuid | moderate | [uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

The remaining API/provider and wallet dependency advisories still need reachability assessment or compatible upstream upgrades. Do not run `npm audit fix --force`: its proposed resolutions include major AI SDK migrations and downgrades of wallet/trading SDKs.

The Jayson path currently imports `stream-json/streamers/StreamValues` and `stream-json/utils/Verifier`, not the filters named in its advisory; it uses `uuid.v4()` without a caller-provided buffer. This is evidence about that path only, not a blanket exclusion for every wallet SDK.

Run `npm run test:dependency-security`, the full app test suite and `npm run build` after any dependency changes. The build gate must pass on the final artifact.

## Final artifact evidence

The final production build passed lint/typechecks, all 68 static pages and CSS verification. The native-loader release gate checked 5,933 compiled/traced JS files and found no bigint native-loader code. A standalone copy outside the repository started in 322 ms, served all 53 public pages and denied anonymous Pump.fun MCP access with 401. Its only page-smoke failure was expected `/readyz` 503 without production secrets. No bigint binding warning occurred during the isolated runtime check. All 1,926 app tests and 13 focused security/migration tests passed after hardening.
