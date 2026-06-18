---
title: Virtuous
section: CRM & Data Connections
status: draft
keywords: virtuous, api key, contacts, crm, connections
last_reviewed: 2026-06-12
---

# Virtuous

Connect Virtuous with an API key to import your contacts into Storyraise as constituents.

<!-- TEAM REVIEW: Virtuous connects via the Connections tab, which is rolling out (currently internal). Until it reaches your account, use the CSV path below. Confirm availability before publishing. -->

## What syncs

- **Constituents** (contacts) → your [constituent list](../importing-constituent-data.md), matched by email.
- Optionally, additional data into collections — see [Syncing data to collections](../syncing-data-to-collections.md).

## Connect

In the **Connections** tab, find **Virtuous**, click **Connect**, and enter:

- **API Key** — your Virtuous API key.

Then **Connect & sync**.

## Where to find your key

In Virtuous, open **Settings → API Keys** and create a key (pick a permission group). See the [Virtuous API key guide](https://support.virtuous.org/hc/en-us/articles/360052340251-Virtuous-API-Authentication).

## No Connections tab yet?

While the native connection rolls out, you can bring Virtuous contacts in today by exporting them to CSV and using [CSV import](../importing-constituent-data.md) — include **First Name**, **Last Name**, and **Email** columns, plus any custom fields. You'll get the same merge tags, personalized links, and insights.

## Related

- [The Connections tab](../connections-overview.md)
- [Managing connections](../managing-connections.md)
