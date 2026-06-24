---
title: Salesforce / Nonprofit Cloud
section: CRM & Data Connections
status: published
keywords: salesforce, nonprofit cloud, npsp, oauth, contacts, gift transaction, engagement, write-back, connections
last_reviewed: 2026-06-24
---

# Salesforce / Nonprofit Cloud

Connect Salesforce to bring your contacts and giving data into Storyraise — and send report engagement back to Salesforce so it lives next to the rest of each donor's record.

## What syncs

**Into Storyraise**

- **Contacts** → your Storyraise [constituent list](../importing-constituent-data.md), matched by email.
- **Giving and other objects** → Storyraise collections. Storyraise discovers your org's objects and fields at connect time, so you choose exactly what to bring in. This includes **Nonprofit Cloud Gift Transactions** — Storyraise resolves each gift's **Person Account** to the right constituent automatically. See [Syncing data to collections](../syncing-data-to-collections.md).

**Back into Salesforce**

- **Report engagement** (opens, time spent, link clicks) → logged on each donor's Contact, so your team sees Storyraise activity inside Salesforce. You choose where it lands and who it goes to (see below).

## Connect

Salesforce uses sign-in (OAuth), so there's no API key to copy:

1. In the **Connections** tab, find **Salesforce / Nonprofit Cloud** and click **Connect**.
2. You're sent to Salesforce to sign in and authorize Storyraise.
3. Approve access — you'll return to Storyraise, and your contacts begin importing.

Sign in with a Salesforce account that can see the contacts you want to bring over — and, for write-back, that has permission to create the records you choose below.

## Send engagement to Salesforce

On the connected Salesforce card, choose **Send to Salesforce** to configure write-back:

- **Where to write it** — log a completed **Activity (Task)** on the Contact, or update **custom fields** on the Contact (you map each Salesforce field to a metric: opens, minutes, link clicks, engagement score, last open, and more).
- **Assign to the gift officer** — for Activities, optionally assign each task to the donor's **Account Owner**, so the right fundraiser is notified.
- **Minimum engagement to send** — only send for donors who reached a chosen level (e.g. opened a report, read in depth, or clicked a link).

Run it on demand with **Save & send now**, or let it run automatically with auto-sync (below).

> Engagement is matched to the exact Contact using a Storyraise constituent id carried through each personalized report link, not by name — so it lands on the right person.

## Keeping it current

Sync on demand with **Sync now**, or turn on **Auto-sync** and choose **Daily** or **Weekly**. When write-back is enabled, auto-sync also pushes engagement on the same schedule. See [Managing connections](../managing-connections.md).

## Related

- [The Connections tab](../connections-overview.md)
- [Syncing data to collections](../syncing-data-to-collections.md)
- [Troubleshooting sync issues](../troubleshooting-sync-issues.md)
