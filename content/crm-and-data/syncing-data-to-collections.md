---
title: Syncing data to collections
section: CRM & Data Connections
status: draft
keywords: extended data, collections, collect, sync, gifts, donations, fields, data sync
last_reviewed: 2026-06-12
---

# Syncing data to collections

Connecting a system imports your constituents. But your systems hold far more than names and emails — giving history, event attendance, email engagement, membership details, and whatever custom data you track. **Syncing data to collections** lets you pull *any* of that into Storyraise, where it's available for your reports.

## What it does

From any connected system, you choose a set of data to bring in. Storyraise writes it to a **collection** — the same kind of collection [Storyraise Collect](../storyraise-collect/what-is-storyraise-collect.md) uses — and relates each row to a constituent by their ID. The result is structured data, tied to the right people, ready to pull into reports.

> *Pick any data this connection exposes. It's written to a Collect collection, related to each constituent by id.*

This is deliberately open-ended: gifts, donations, and email engagement are common examples, but the data you can sync is whatever your connected system exposes — not a fixed list.

## Add data to a collection

On a connected system, choose **Add data**. A short, friendly four-step wizard walks you through it:

1. **Choose** — *"What do you want to bring in?"* Pick which object the connection exposes (for example gifts, donations, event registrations, or email activity).
2. **Details** — *"Which details do you want?"* Select the specific fields to include. If the records you picked don't link to a person, Storyraise tells you here so you can choose something that does.
3. **Summarize** — *"Some people have more than one — how should we show it?"* Choose one:
   - **Just the most recent one** — keep each person's latest record.
   - **Add them all up** — total a number (like gift amount) per person.
   - **Count how many** — the number of records per person.
   - **Keep every one** — save all records, nothing combined.
4. **Review** — *"Here's a peek — look right?"* Choose who it covers (**Everyone** or **Just a specific list**), name the collection, and save. For gift-like data, Storyraise asks you to confirm which fields hold the **amount** and the **date**.

Storyraise imports the data and relates each row to its constituent automatically.

## Using the data in reports

Once data lands in a collection, it's available wherever collections are — so you can surface giving totals, recent gifts, or engagement counts in a report, personalized per constituent through [personalized links](../distribution-and-engagement/personalized-links.md).

## Keeping it current

Re-sync a collection any time from the connection's menu, or turn on auto-sync (daily or weekly) so it refreshes on its own. See [Managing connections](managing-connections.md).

## Related

- [The Connections tab](connections-overview.md)
- [What is Storyraise Collect?](../storyraise-collect/what-is-storyraise-collect.md)
- [Managing connections](managing-connections.md)
