---
title: Bloomerang
section: CRM & Data Connections
status: draft
last_reviewed: 2026-06-12
---

# Bloomerang

Connect Storyraise to Bloomerang to sync your constituents, so you can personalize reports for your donors and see who's engaging.

> **Two ways to connect.** You can connect Bloomerang from the **[Connections](../connections-overview.md)** tab (recommended — see [Connecting via the Connections tab](#connecting-via-the-connections-tab) below) or from the per-system steps in the **Constituents** area. Bloomerang also syncs gifts into [Insights](../../distribution-and-engagement/understanding-report-metrics.md).

## What you'll need

A **Bloomerang API key**. Bloomerang's guide to finding or creating one: [Where can I find my Bloomerang API key?](https://support.bloomerang.co/s/article/13000076351#new)

> API keys belong to a Bloomerang user account. Use a key from an account that will stay active — if that user is deactivated, the key stops working.

## Connect and sync

1. From the Storyraise dashboard, open the **Constituents** area and choose to sync constituents.
2. Select the **Bloomerang** tab.
3. Paste your API key into the key field (it looks like `aaead1d4-7075-57df-ec7f-11e717c7bdd1`).
4. Click **Sync constituents**.

Storyraise pulls in your Bloomerang constituents — names, emails, addresses, phone numbers, and other profile fields. Synced constituents appear in your constituent list tagged **Bloomerang**.

## Connecting via the Connections tab

If your dashboard has the **Connections** tab, connect there instead: open **Connections**, find **Bloomerang**, click **Connect**, paste your API key, and choose **Connect & sync**. The connection then shows as **Live**, with **Sync now** and daily auto-sync options — see [The Connections tab](../connections-overview.md) and [Managing connections](../managing-connections.md).

## What gets synced

- Name and email for each constituent
- Profile details such as address and phone fields
- Other fields from each constituent's Bloomerang record, flattened into individual Storyraise fields you can use as merge tags

Records are matched by email address — constituents without an email in Bloomerang can't be synced, and re-syncs update existing records rather than duplicating them.

## Keeping it fresh

Syncs run when you trigger them. Re-run **Sync constituents** before mailings or personalized publishes to pull the latest data — see [Data refreshes](../data-refreshes.md).

## Embedding Bloomerang donation forms

You can also embed a Bloomerang donation form inside a report: add the donation form element in the builder and paste your form's URL. Readers can give without leaving your report.

## Troubleshooting

- **Invalid key** — re-copy the full key with no extra spaces; regenerate it in Bloomerang if needed.
- **Missing constituents** — check that they have an email address in Bloomerang.

More help: [Troubleshooting sync issues](../troubleshooting-sync-issues.md).
