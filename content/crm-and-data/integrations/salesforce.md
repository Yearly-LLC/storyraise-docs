---
title: Salesforce / Nonprofit Cloud
section: CRM & Data Connections
status: draft
keywords: salesforce, nonprofit cloud, npsp, oauth, contacts, connections
last_reviewed: 2026-06-12
---

# Salesforce / Nonprofit Cloud

Connect Salesforce to import your contacts into Storyraise as constituents.

<!-- TEAM REVIEW: Salesforce connects via the Connections tab (rolling out / internal). Confirm availability before publishing. -->

## What syncs

- **Contacts** → your Storyraise [constituent list](../importing-constituent-data.md), matched by email.
- Optionally, additional Salesforce data into collections — see [Syncing data to collections](../syncing-data-to-collections.md).

## Connect

Salesforce uses sign-in (OAuth), so there's no API key to copy:

1. In the **Connections** tab, find **Salesforce / Nonprofit Cloud** and click **Connect**.
2. You're sent to Salesforce to sign in and authorize Storyraise.
3. Approve access — you'll return to Storyraise, and your contacts begin importing.

Sign in with a Salesforce account that can see the contacts you want to bring over.

## Keeping it current

Sync on demand with **Sync now**, or turn on daily auto-sync. See [Managing connections](../managing-connections.md).

## Related

- [The Connections tab](../connections-overview.md)
- [Troubleshooting sync issues](../troubleshooting-sync-issues.md)
