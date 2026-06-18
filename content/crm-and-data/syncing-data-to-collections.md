---
title: Syncing data to collections
section: CRM & Data Connections
status: draft
keywords: extended data, collections, collect, sync, gifts, donations, fields, data sync
last_reviewed: 2026-06-12
---

# Syncing data to collections

Connecting a system imports your constituents. But your systems hold far more than names and emails — giving history, event attendance, email engagement, membership details, and whatever custom data you track. **Syncing data to collections** lets you pull *any* of that into Storyraise, where it's available for your reports.

<!-- TEAM REVIEW: part of the Connections tab (rolling out / internal). Confirm availability before publishing. -->

## What it does

From any connected system, you choose a set of data to bring in. Storyraise writes it to a **collection** — the same kind of collection [Storyraise Collect](../storyraise-collect/what-is-storyraise-collect.md) uses — and relates each row to a constituent by their ID. The result is structured data, tied to the right people, ready to pull into reports.

> *Pick any data this connection exposes. It's written to a Collect collection, related to each constituent by id.*

This is deliberately open-ended: gifts, donations, and email engagement are common examples, but the data you can sync is whatever your connected system exposes — not a fixed list.

## Add data to a collection

On a connected system, choose **Add data**. A short four-step flow walks you through it:

1. **Choose data.** Pick which object the connection exposes — for example gifts, donations, event registrations, or email activity.
2. **Fields.** Select the specific fields you want to bring in.
3. **Shape.** Decide how rows come across — keep them all, keep only the most recent, or summarize (for example, a total or a count per constituent).
4. **Destination.** Send the data to an existing collection or create a new one.

Storyraise imports the data and relates each row to its constituent automatically.

## Using the data in reports

Once data lands in a collection, it's available wherever collections are — so you can surface giving totals, recent gifts, or engagement counts in a report, personalized per constituent through [personalized links](../distribution-and-engagement/personalized-links.md).

## Keeping it current

Re-sync a collection any time from the connection's menu, or turn on daily auto-sync so it refreshes on its own. See [Managing connections](managing-connections.md).

## Related

- [The Connections tab](connections-overview.md)
- [What is Storyraise Collect?](../storyraise-collect/what-is-storyraise-collect.md)
- [Managing connections](managing-connections.md)
