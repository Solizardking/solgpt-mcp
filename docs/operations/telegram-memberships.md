# Telegram memberships

Status: prepared; MoonPay dashboard configuration, bot administrator permissions,
and purchase/expiry behavior have not been verified.

## Group mapping

| Field | Value |
| --- | --- |
| Integration display name | CLAWD Token |
| Telegram username | @clawdtoken |
| Group URL | https://t.me/clawdtoken |
| Chat ID (provided by owner) | `-1004411988777` |
| Membership bot | @HelioTelegramBot |

The display name above is a proposed label. The ID has the required `-100`
supergroup prefix; live group identity and bot permissions still need verification.

## Merchant setup

1. In the target Telegram group, make @HelioTelegramBot an administrator with
   permissions needed to invite and remove members. Confirm its `/chat_id`
   response matches `-1004411988777`.
2. In MoonPay Commerce **Settings → Integrations**, add the group name and chat ID
   above and save. The provider supports up to 15 groups.
3. On every applicable Pay Link, open **Advanced Options**, enable **Telegram
   Memberships**, select this group, and save. Adding the integration alone does
   not enable memberships on individual purchase links.
4. Verify the saved configuration on the hosted checkout and the site's embedded
   checkout: customers must supply Telegram username and email. After a successful
   order, MoonPay emails the group invite link.

Apply to the existing purchase inventory:

| Product | Pay Link ID source |
| --- | --- |
| SOLGPT site access | `6aa6d8461dd4b1c45cf90183` |
| Voice | `6aa6d7f115b6bc52d57f4b3b` |
| Clawd Bot monthly | `HELIO_PAYLINK_CLAWD_BOT_MONTHLY` in deployment configuration |
| Clawd Bot lifetime | `HELIO_PAYLINK_CLAWD_BOT_LIFETIME` in deployment configuration |

These are the purchase paths identified in this checkout. Reconcile them with the
merchant's full Pay Link list to cover additional products. Preserve existing
prices, payout wallets, currencies, redirects, and webhooks.

## Access duration

MoonPay documents automated group admission when a subscription starts and removal
when it expires. Verify that monthly products are subscription Pay Links in the
merchant dashboard. A local application's 30-day entitlement does not establish
a MoonPay subscription or a Telegram removal schedule. The existing site-access
implementation grants 30 days per confirmed payment and does not initiate renewals;
confirm the intended Telegram duration before changing its payment terms.

One-time purchases can include group admission; the documentation does not promise
timed removal for those purchases. Verify refund handling and behavior for a member
who holds multiple purchases separately before relying on either.

If @clawdtoken permits direct public joining, verify that an unpaid account cannot
bypass membership through that URL. Any change to group visibility or existing
members needs the owner's decision; no such change has been made.

## Acceptance checks

- Saved group mapping and bot administration match the group above.
- Every applicable Pay Link has Telegram Memberships enabled for this group.
- A successful authorized purchase delivers an email invite usable by the intended
  Telegram account; failed or abandoned checkout does not grant access.
- A test subscription grants access and removes the test account on expiry.
- An unpaid account cannot bypass the gate through public or older invite links.
- Existing website access and payment webhook behavior still work.

Do not mark this setup live until these checks have evidence. No purchase, member
removal, merchant setting change, or group visibility change was performed while
preparing this document.

Provider guide: https://docs.hel.io/docs/telegram-memberships
Related site access setup: [moonpay-site-access.md](moonpay-site-access.md).
