---
title: Blackbaud (Raiser's Edge NXT)
section: CRM & Data Connections
status: draft
last_reviewed: 2026-06-12
---

# Blackbaud (Raiser's Edge NXT)

Connect Storyraise to Blackbaud to sync constituents from Raiser's Edge NXT, so you can personalize reports for your donors and see who's engaging.

> **Two ways to connect.** Storyraise is rolling out a redesigned **Connections** tab that brings every integration into one place. If your dashboard has it, see [Connecting via the Connections tab](#connecting-via-the-connections-tab) below; otherwise use the current steps first.
>
> <!-- TEAM REVIEW: confirm Connections-tab availability; once it's the default for everyone, this page can lead with that flow and retire the per-tab steps. -->

## What you'll need

- A Blackbaud account with access to your organization's Raiser's Edge NXT environment and the constituent lists you want to sync.
- A **constituent list** in Raiser's Edge NXT containing the people you want in Storyraise. If you don't have one yet, create a list in RE NXT first — syncing works list by list, which keeps you in control of exactly who comes over.

## Connect and sync

1. From the Storyraise dashboard, open the **Constituents** area and choose to sync constituents.
2. Select the **Blackbaud** tab.
3. Click **Connect**. You'll be sent to Blackbaud to sign in and authorize Storyraise.
4. Approve the authorization. You'll return to Storyraise automatically.
5. Choose the **constituent list** you want to sync.
6. Start the sync. Storyraise pulls in each constituent's name and email, along with custom fields from your RE NXT environment.

Synced constituents appear in your constituent list tagged **Blackbaud**.

## Connecting via the Connections tab

If your dashboard has the **Connections** tab, connect there instead:

1. Open **Connections** and find **Raiser's Edge NXT** under **Add a connection**.
2. Click **Connect**, sign in to Blackbaud, and authorize Storyraise.
3. Storyraise imports your constituents; the connection shows as **Live**, and you can **Sync now** or turn on daily auto-sync. See [The Connections tab](../connections-overview.md) and [Managing connections](../managing-connections.md).

## What gets synced

- First name, last name, and email for each constituent in the selected list
- Custom fields configured in your Raiser's Edge NXT environment

Records are matched by email address — constituents without an email in RE NXT can't be synced, and re-syncs update existing records rather than duplicating them.

## Keeping it fresh

Syncs run when you trigger them. Re-sync before mailings or personalized publishes to pull the latest data — see [Data refreshes](../data-refreshes.md). Storyraise refreshes your Blackbaud authorization automatically; if it ever fully expires, just click **Connect** again.

## Embedding Blackbaud donation forms

Beyond constituent data, you can embed a Blackbaud donation form inside a report: add the donation form element in the builder and paste your **Donation Form URL** from Blackbaud. Readers can give without leaving your report.

## Troubleshooting

- **Authorization errors** — reconnect via the **Connect** button, using a Blackbaud account with access to your lists.
- **Missing constituents** — check that they're in the synced list and have an email address in RE NXT.

More help: [Troubleshooting sync issues](../troubleshooting-sync-issues.md).
