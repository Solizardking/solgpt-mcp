# Prepared production cutover — 2026-09-08

Status: prepared and rehearsed; no production data import or backend deployment has been executed.

Target: `mawd/solgpt`, production deployment `veracious-snake-356`. The current app already selects this backend but its new service routes are absent. The change enables the tested routes after historical data is present.

## Exact prepared additions

| Destination | Records | Preservation |
| --- | ---: | --- |
| deskWalletProfiles | 5 | Original wallet, stable user ID, creation and login timestamps |
| deskUsageEvents | 67 | Original event IDs, owner, timestamps, model/provider, token counts and metadata |
| deskUsageCounters | 10 | Derived all/kind/provider counters; all eight legacy dimension totals reconcile exactly; original counter last-use timestamps |
| llmGatewayApiKeys | 2 | Original subject IDs, hashes, prefixes, rate limits, activity and revocation state; no wallet invented |
| llmGatewayRateLimitWindows | 5 | Existing request counts and window timestamps |

The target already contains unrelated keys; they remain intact. One imported legacy key is active and one is revoked. Both lack a wallet in the source and retain that absence. Existing holder/authorization checks are unchanged.

No records are imported for automations, subscriptions, gallery or Open API keys because the source tables are empty. The planner refuses to proceed if any of those tables gains records requiring its own migration.

## Backups and prepared artifacts

Private directory outside Git: `/Users/8bit/.codex/private/solgpt-cutover-20260908T1542/`.

- `postgres-before.json`: repeatable-read snapshot of all affected source tables, including original SQL key hashes and rate-limit windows.
- `convex-before.zip`: complete Convex export with file storage; archive integrity verified.
- `convex-before.json`: export data for read-only reconciliation.
- `prepared/`: five append files plus a SHA-256 manifest. Directory mode 0700; files mode 0600. No record values are printed in logs or committed.

## Validation

- Seven planner tests pass: preservation, idempotent replay, partial replay, identity conflicts, key collisions, inconsistent/overflowing counters, new target usage and unsupported historical tables.
- An isolated `convex-test` rehearsal loaded the actual private prepared files into the real schema, then verified stable profile login, exact usage totals and legacy key metadata/revocation behavior.
- The previously executed deployment dry run passed schema/type validation and proposed nineteen additive indexes without deletion.
- `scripts/prepare-convex-cutover.mjs` only produces private append files. It has no database/network write capability. Four CLI tests additionally verify manifest hashes, private permissions, rejection of existing directories and symlink paths into the repository, and redaction of malformed input. Run all eleven tool tests with `npm run test:cutover`. The output directory must be new and its parent must already exist.

## Execution and verification

1. Refresh the read-only source snapshot and target export immediately before importing. Re-run the planner and compare the append manifests. Any conflict stops the cutover; do not overwrite target data.
2. Confirm the affected new service routes still reject writes with 404 and the target desk tables have no new data. Coordinate a write pause if any legacy writer is still active or new target traffic is detected.
3. Append only the missing records in the five prepared files. Never use `--replace` or `--replace-all`. Record completed table imports; refresh target state and replan after any interrupted/uncertain operation before retrying.
4. Verify imported counts, identities, timestamps, metadata, counters and key state against source snapshots. Only then deploy the tested additive Convex functions/schema.
5. Verify signed service health and lookup behavior from Fly; verify unsigned/replayed/cross-owner denials without sending messages or submitting transactions.
6. Roll out the locally tested app hardening, then verify all pages, readiness, access controls and CLAWD streaming/non-streaming inference.

This is a forward migration. Do not delete legacy Postgres or existing Convex rows. After new writes begin, rollback requires reconciling the delta rather than pointing blindly back to Postgres.

Bitdeer HTTP 402 and Birdeye HTTP 403 are separate provider account issues and will not be fixed by this cutover.
