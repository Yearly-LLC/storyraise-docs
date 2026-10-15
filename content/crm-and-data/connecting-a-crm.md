---
title: Connecting a CRM
section: Donor Data & CRM
status: draft
last_reviewed: 2026-10-15
---

# Connecting a CRM

Connecting your CRM brings your constituents — donors, members, volunteers — into Storyraise. Once they're in, you can personalize reports for each constituent, generate personalized QR codes and links, and see in Analytics which constituents actually opened your reports.

> **Connect from the Connections tab.** The [Connections tab](connections-overview.md) is the unified home for every integration — many more systems than the two examples below. Start there; this page covers the general approach.

## What a connection does

When you connect a CRM, Storyraise pulls your constituent records (names, emails, and other fields your CRM provides) into your organization's constituent list.

Importing is **read-only** — Storyraise reads from your CRM and doesn't change your constituent records. Two connections can also send report engagement *back*: [Salesforce](integrations/salesforce.md) and [Raiser's Edge NXT](integrations/blackbaud-raisers-edge-nxt.md). Write-back stays off until you set it up with **Send to Salesforce** or **Send to Raiser's Edge**; each donor then gets one Storyraise Task (Salesforce) or action (Raiser's Edge), kept up to date as their engagement changes. See each guide for exactly what it writes.

## Before you start

- You'll need credentials for your CRM — either admin access to authorize the connection (Blackbaud) or an API key (Bloomerang). The per-CRM guides below cover exactly what to gather.
- Constituent records are matched by **email address**, so the more complete your CRM's email data, the better.

## Connect your CRM

1. Open the **Connections** tab and find your CRM under **Add a connection**.
2. Click **Connect** and follow the prompts:
   - **Raiser's Edge NXT** and **Salesforce** — sign in and approve access, then choose who to sync: Raiser's Edge NXT asks you to **Select a list to import**, and Salesforce asks **Who should sync from Salesforce?** (everyone, or one or more Contact List Views). Click **Sync Constituents** (or **Sync constituents**) to finish. Full guides: [Raiser's Edge NXT](integrations/blackbaud-raisers-edge-nxt.md) and [Salesforce](integrations/salesforce.md).
   - **API-key systems** such as Bloomerang — paste your key (and any other details the dialog asks for) and click **Connect & sync** (for Bloomerang, **Sync constituents**). Full guide: [Bloomerang](integrations/bloomerang.md).
3. Storyraise imports your constituents. Each record is tagged with its source, so you always know where data came from.

## No CRM? No problem

If your CRM isn't supported yet — or you don't use one — you can [import constituents from a CSV file](importing-constituent-data.md). It unlocks the same personalization and insights features.

## Keeping data current

Turn on **Auto-sync** for a connection (it's off by default) and Storyraise re-pulls your constituents daily or weekly, so new donors in your CRM arrive on their own. You can also click **Sync now** at any time. Syncs update existing records in place, but people deleted in your CRM aren't removed from Storyraise — see [Data refreshes](data-refreshes.md).

## Related

- [Supported integrations](supported-integrations.md) — what's available today and what's coming
- [Troubleshooting sync issues](troubleshooting-sync-issues.md)
