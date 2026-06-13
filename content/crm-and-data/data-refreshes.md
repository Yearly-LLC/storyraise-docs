---
title: Data refreshes
section: CRM & Data Connections
status: draft
last_reviewed: 2026-06-12
---

# Data refreshes

Your CRM data changes constantly — new donors, updated emails, fresh gift records. This page covers how to keep your Storyraise constituent list in step.

## Refreshing today: re-run the sync

Storyraise pulls constituent data when you ask it to. To refresh:

- **Bloomerang** — open the **Constituents** area, go to the **Bloomerang** tab, and click **Sync constituents** again.
- **Blackbaud** — open the **Blackbaud** tab and re-sync your selected constituent list. If your authorization has expired, you may be asked to reconnect first.
- **CSV** — export a fresh file from your system and upload it again.

Because constituents are identified by email address, refreshed records **update** existing constituents rather than creating duplicates. New people in the source are added.

## When to refresh

A good rule of thumb: refresh right before you do anything that depends on the data —

- before generating personalized links or QR codes for a mailing,
- before publishing a personalized report,
- before reviewing constituent engagement in Insights for a board update.

## Automatic refreshes

> **Coming soon** — scheduled background syncs, so your constituent list stays current without manual refreshes.

<!-- TEAM REVIEW — internal outline for when scheduled sync ships:
- Default sync frequency and whether it's configurable
- How sync status/last-synced time is surfaced in the UI
- Notifications on sync failures (e.g., expired Blackbaud authorization)
-->

## Related

- [Troubleshooting sync issues](troubleshooting-sync-issues.md)
- [Importing constituent data](importing-constituent-data.md)
