---
title: Slate for Advancement
section: CRM & Data Connections
status: draft
keywords: slate, technolutions, advancement, query, web service, connections
last_reviewed: 2026-06-12
---

# Slate for Advancement

Connect a Slate Query web service to import constituents into Storyraise. Because Slate queries are custom, you'll map their columns to Storyraise fields as you import.


## What syncs

- **Constituents**, from the Query you expose — mapped to your [constituent list](../importing-constituent-data.md) during import.
- Optionally, additional data into collections — see [Syncing data to collections](../syncing-data-to-collections.md).

## Connect

In the **Connections** tab, find **Slate for Advancement**, click **Connect**, and provide:

- **Query Web Service URL** — build a Query in Slate, output it as a JSON web service, and paste that URL.
- **Service Username** — a Slate service account.
- **Service Password** — that service account's password.

Then **Connect & sync**. You'll map the query's columns to Storyraise fields on import.

## Where to find these

In Slate, share a Query as a JSON web service, then authenticate with a service account. See the [Slate Configurable API docs](https://knowledge.technolutions.net/docs/slate-configurable-api).

## Related

- [The Connections tab](../connections-overview.md)
- [Managing connections](../managing-connections.md)
