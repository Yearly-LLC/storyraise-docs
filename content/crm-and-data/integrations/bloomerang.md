---
title: Bloomerang
section: Donor Data & CRM
status: draft
last_reviewed: 2026-10-15
---

# Bloomerang

Connect Storyraise to Bloomerang to sync your constituents, so you can personalize reports for your donors and see who's engaging.

> Connect Bloomerang from the **[Connections](../connections-overview.md)** tab. Bloomerang also syncs gifts into [Analytics](../../distribution-and-engagement/understanding-report-metrics.md).

## What you'll need

A **Bloomerang API key**. Bloomerang's guide to finding or creating one: [Where can I find my Bloomerang API key?](https://support.bloomerang.co/s/article/13000076351#new)

> API keys belong to a Bloomerang user account. Use a key from an account that will stay active — if that user is deactivated, the key stops working.

## Connect and sync

1. Open the **[Connections](../connections-overview.md)** tab and find **Bloomerang** under **Add a connection**.
2. Click **Connect**.
3. Paste your API key into the key field (it looks like `aaead1d4-7075-57df-ec7f-11e717c7bdd1`).
4. Click **Sync constituents**.

Storyraise pulls in your Bloomerang constituents. Synced constituents appear in your constituent list tagged **Bloomerang**, and the connection shows as **Live** — see [Managing connections](../managing-connections.md).

## What gets synced

- First name, last name, and email for each constituent, along with their Bloomerang constituent id.

Other profile fields (address, phone, and so on) are **not** imported onto the constituent record. To bring giving into Storyraise, use **Add data** on the connection row to sync gifts into a collection — see [Syncing data to collections](../syncing-data-to-collections.md).

Records are matched by email address — constituents without an email in Bloomerang can't be synced, and re-syncs update existing records rather than duplicating them.

## Keeping it fresh

Click the sync icon (**Sync now**) on the connection row to pull the latest data before mailings or personalized publishes. Or open the row's **⋯ More** menu, turn on **Auto-sync** (it's off by default), and set the **Frequency** to **Daily** or **Weekly** (weekly syncs run on Mondays). See [Data refreshes](../data-refreshes.md).

## Embedding Bloomerang donation forms

You can also embed a Bloomerang donation form inside a report: add the donation form element in the builder and paste your form's URL. Readers can give without leaving your report.

## Troubleshooting

- **Invalid key** — re-copy the full key with no extra spaces; regenerate it in Bloomerang if needed. Bloomerang has no **Edit credentials** option, so to switch to a new key, **Disconnect** the connection (your synced data stays) and connect again with the new key.
- **Missing constituents** — check that they have an email address in Bloomerang.

More help: [Troubleshooting sync issues](../troubleshooting-sync-issues.md).
