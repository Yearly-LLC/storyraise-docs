---
title: Connecting a CRM
section: CRM & Data Connections
status: draft
last_reviewed: 2026-06-12
---

# Connecting a CRM

Connecting your CRM brings your constituents — donors, members, volunteers — into Storyraise. Once they're in, you can personalize reports for each constituent, generate personalized QR codes and links, and see in Insights which constituents actually opened your reports.

> **New: the Connections tab.** Storyraise is rolling out a redesigned [Connections tab](connections-overview.md) that unifies every integration — many more systems than the two below — in one place. If your dashboard has it, start there; this page describes the current setup until it reaches your account.

## What a connection does

When you connect a CRM, Storyraise pulls your constituent records (names, emails, and other fields your CRM provides) into your organization's constituent list. Storyraise reads from your CRM — it never writes back or modifies your CRM data.

## Before you start

- You'll need credentials for your CRM — either admin access to authorize the connection (Blackbaud) or an API key (Bloomerang). The per-CRM guides below cover exactly what to gather.
- Constituent records are matched by **email address**, so the more complete your CRM's email data, the better.

## Connect your CRM

1. From the dashboard, open your **Constituents** area and choose the option to sync constituents.
2. Pick your CRM's tab — **Blackbaud** or **Bloomerang** — and follow the prompts:
   - **Blackbaud** — click **Connect**, sign in to Blackbaud, and approve access. Then choose which constituent list to sync. Full guide: [Blackbaud (Raiser's Edge NXT)](integrations/blackbaud-raisers-edge-nxt.md).
   - **Bloomerang** — paste your Bloomerang API key and click **Sync constituents**. Full guide: [Bloomerang](integrations/bloomerang.md).
3. Storyraise imports your constituents. Each record is tagged with its source (Blackbaud, Bloomerang, or CSV), so you always know where data came from.

## No CRM? No problem

If your CRM isn't supported yet — or you don't use one — you can [import constituents from a CSV file](importing-constituent-data.md). It unlocks the same personalization and insights features.

## Keeping data current

Connections don't update themselves automatically yet. When your CRM data changes, re-run the sync to pull in the latest records — see [Data refreshes](data-refreshes.md).

## Related

- [Supported integrations](supported-integrations.md) — what's available today and what's coming
- [Troubleshooting sync issues](troubleshooting-sync-issues.md)
