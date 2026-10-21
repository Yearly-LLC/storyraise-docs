---
title: EveryAction
section: Donor Data & CRM
status: draft
keywords: everyaction, ngp van, van, saved list, api key, application name, contributions, gifts, connections
last_reviewed: 2026-10-21
---

# EveryAction

Connect EveryAction (NGP VAN) with an API key to import a saved list as constituents and bring each person's giving into Storyraise.

> EveryAction is available on request while we roll it out. Contact support and we'll turn it on for your organization.

## What syncs

- **Constituents** — everyone on the EveryAction **saved list** you choose, into your [constituent list](../importing-constituent-data.md). Each person is matched by their EveryAction **VAN ID**, so name and email changes in EveryAction update the same constituent.
- **Gifts** — each person's contribution history (amount, date, type, designation, amount refunded, source code) into a collection. See [Syncing data to collections](../syncing-data-to-collections.md). Refunds come across as negative amounts, the way EveryAction records them.

Storyraise only reads from EveryAction. Nothing is written back.

## Before you start

EveryAction doesn't let other tools page through every person in your database. Instead, you share people through a **saved list**. Create (or pick) a saved list in EveryAction of the people you want in Storyraise — for example, all active donors.

You'll also need an **API key** and the **Application Name** EveryAction issues with it. An EveryAction administrator requests these from inside EveryAction.

<!-- TEAM REVIEW: confirm the exact menu path a customer admin uses to request an API key in EveryAction (NGP VAN's docs point to the "API Integrations" page, which needs the right permission), and whether they must name Storyraise as the integration. Update this paragraph from the first customer onboarding. -->

## Connect

1. In the **Connections** tab, find **EveryAction** and click **Connect**.
2. Enter:
   - **Application Name** — the name issued with your API key.
   - **API Key** — paste it exactly as issued. Storyraise adds the database suffix (`|1`) for you.
   - **Database** — leave blank for **My Campaign** (`1`), where fundraising data lives. Enter `0` only if your key is for My Voters.
   - **Region** — leave blank for US accounts. Enter `intl` if your EveryAction account is hosted outside the US.
3. Click **Connect & sync**. A **Which EveryAction list should sync?** picker opens with your saved lists and how many people are on each.
4. Pick a list (or type its ID under **Or enter a saved list ID**) and click **Sync constituents**.

EveryAction prepares an export of the list before Storyraise can read it. For a large list this takes a few minutes; keep the tab open until the sync finishes.

## Bring in giving

On the connected EveryAction row, choose **Add data**, pick **Gifts**, and choose the details you want. Gifts come from the people on the same saved list you imported.

EveryAction only shares giving one person at a time, so a large list is covered over more than one sync. Each sync fetches complete giving histories for as many people as it can in a few minutes, then tells you how far it got (for example, *people 1–4,000 of 12,500*). The next sync — **Sync now** or the scheduled sync — carries on from there until everyone is covered, then starts over to pick up new gifts. Turn on **Auto-sync** so this happens without anyone pressing a button.

## Keeping it current

Click the sync icon on the connection row (**Sync now**) to sync again. The list picker reopens with your current list selected, so you can confirm it or switch to a different list.

Or open the row's **⋯ More** menu, turn on **Auto-sync**, and set the **Frequency** to **Daily** or **Weekly**. Scheduled syncs re-import the saved list you last chose, then continue the giving sync.

People removed from the saved list, or deleted in EveryAction, are **not removed from Storyraise** — remove them yourself if they shouldn't stay. See [Managing connections](../managing-connections.md).

## Troubleshooting

| Message | What to do |
|---|---|
| *EveryAction rejected the Application Name or API key* | Re-enter both exactly as issued (**⋯ More → Edit credentials**). |
| *EveryAction denied access — check the API key is for the right database mode* | The key is probably for the other database. Try **Database** `0` (My Voters) or `1` (My Campaign). |
| *EveryAction endpoint not found — check the region* | Set **Region** to `intl` for an account hosted outside the US, or clear it for a US account. |
| *EveryAction export did not finish in time* | EveryAction took longer than 15 minutes to prepare the list. Try again, or sync a smaller list. |
| *EveryAction export has no VanID column* | The export didn't include the column Storyraise matches people on. Contact support with the column list from the message. |
| No saved lists in the picker | The API key may not have access to saved lists. Enter the list's ID instead, or ask your EveryAction administrator to check the key's permissions. |

## Related

- [The Connections tab](../connections-overview.md)
- [Managing connections](../managing-connections.md)
- [Syncing data to collections](../syncing-data-to-collections.md)
