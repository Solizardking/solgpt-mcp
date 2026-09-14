# Convex cutover checklist

This is a pending rollout plan, not evidence of a completed migration. Production is `mawd/solgpt`, deployment `veracious-snake-356`. The app must not switch stores until its new endpoints and historical records are available. The existing service secrets are already named in production Convex; do not rotate or print them just to wire the application.

## Preserve the records that users already own

| Existing source | Convex destination | Invariants to verify |
| --- | --- | --- |
| `phantom_users` | `deskWalletProfiles` | Preserve wallet, stable user ID, creation time and last login time. Reject duplicate wallet identities rather than selecting one silently. |
| `automations` | `deskAutomations` | Preserve ID, wallet/Telegram ownership, condition, thresholds, repeat flag, cooldown, status and notification timestamps. Do not recreate every record with `create`: that resets triggered/cancelled records to active. Initialize `nextCheckAt` deliberately for active records. |
| `mpp_subscriptions` | `deskSubscriptions` | Preserve subscription ID, nullable owner, plan, amount, period, activation signature, status and update time. Do not re-activate cancelled records. |
| `gallery_objects` and existing Tigris gallery objects | Convex file storage + `deskGalleryObjects` | Copy bytes, verify byte count/hash, preserve owner and original gallery ID where one exists, then register metadata. Never infer ownership from whoever next requests an image. Keep an explicit old-to-new URL map for Tigris keys. |
| `wallet_usage_events` / `wallet_usage_totals` | `deskUsageEvents` / `deskUsageCounters` | Preserve event IDs, wallet, counts, token totals, timestamps and metadata. Reconcile historical event/counter discrepancies explicitly: the old Postgres writes were not atomic. Do not treat a bounded Redis recent-history mirror as complete all-time history. |
| Existing Open API / gateway keys | Existing Convex key tables | Compare hash-only IDs, owners, scopes, revocations and counters before switching. A previous live key smoke does not establish that every historical key has been migrated. Never export plaintext keys. |
| Historical Firecrawl jobs | `deskFirecrawlJobs` | Import only jobs whose wallet ownership can be established. Account-wide provider access is not ownership evidence. Unknown jobs remain inaccessible through holder APIs. |

Telegram sessions, Better Auth compatibility and other legacy integrations still need their own migration work. Keep Postgres/Tigris available for them. Gallery images that exceed the new 20 MiB limit or use unsupported content types require explicit handling; do not count skipped objects as migrated.

## Execute a controlled transition

1. Record the exact source revision to deploy and inspect its schema diff against production. Keep all existing tables/indexes. Run the app/Convex typechecks, tests, build and Convex deployment dry run against that revision.
2. Take recoverable source and target backups. Inventory record counts, stable IDs, owners, statuses and image hashes with read-only queries. Store exports privately outside Git; redact prompts and personal data from shared reports.
3. Deploy the additive Convex functions/schema after approval. Leave application traffic on its existing store during data preparation. Regenerate the checked-in Convex bindings from the deployed schema.
4. Prepare and rehearse idempotent backfills against an isolated deployment. A duplicate with conflicting ownership or content must stop the affected import; it must never overwrite an existing owner. Reconcile counts and field values, not just HTTP success codes.
5. For the final copy, coordinate a short write pause for affected features and stop automation pollers. Drain in-flight writes and notifications, copy the final delta, and verify there are no remaining source writes. Avoid an uncoordinated switch while both stores accept mutations.
6. Configure the application with the deployment URL, `SOLGPT_DATA_STORE=convex`, and the matching existing `SOLGPT_CONVEX_SERVICE_SECRET`. The secret remains server-only. Confirm that selected Convex failures do not write to a legacy store.
7. Verify signed health, profile identity, key verification/revocation, subscription state, owner-scoped automation history/cancellation and gallery upload/download. Test one holder, one non-holder and cross-wallet denials. Verify an active automation can trigger once while previously cancelled/triggered records retain their state.
8. Resume writes and pollers, monitor errors and provider quotas, then run representative staging load with multiple app instances. The existing `npm run load:staging` is only a small rate-limit smoke, not a capacity certification.

## Rollback boundary

Before Convex accepts new application writes, rollback can restore the prior application configuration while retaining additive tables. After Convex accepts writes, simply pointing back at Postgres would lose or split new data. Pause writes, reconcile the delta and ownership/status changes, then choose a reviewed rollback or forward fix. Do not delete either database or the old image objects during the initial rollout.
