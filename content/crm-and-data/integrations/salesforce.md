---
title: Salesforce / Nonprofit Cloud
section: Donor Data & CRM
status: published
keywords: salesforce, nonprofit cloud, npsp, oauth, contacts, gift transaction, engagement, write-back, connections
last_reviewed: 2026-10-13
---

# Salesforce / Nonprofit Cloud

Connect Salesforce to bring your contacts and giving data into Storyraise — and send report engagement back to Salesforce so it lives next to the rest of each donor's record.

## What syncs

**Into Storyraise**

- **Contacts** → your Storyraise [constituent list](../importing-constituent-data.md), matched by email. Name and email always come across; you can pick extra Contact fields at connect time, and each one becomes a merge tag. Contacts without an email are skipped.
- **Giving and other objects** → Storyraise collections. Storyraise discovers your org's objects and fields at connect time, so you choose exactly what to bring in. This includes **Nonprofit Cloud Gift Transactions** — Storyraise resolves each gift's **Person Account** to the right constituent automatically. See [Syncing data to collections](../syncing-data-to-collections.md).

**Back into Salesforce**

- **Report engagement** (opens, reports viewed, minutes engaged, link clicks, and whether the donor is a returning visitor) → logged on each donor's Contact, so your team sees Storyraise activity inside Salesforce. You choose where it lands and who it goes to (see below).

## Connect

Salesforce uses sign-in (OAuth), so there's no API key to copy:

1. In the **Connections** tab, find **Salesforce / Nonprofit Cloud** and click **Connect**.
2. You're sent to Salesforce to sign in and authorize Storyraise.
3. Approve access — you'll return to Storyraise, and a **Who should sync from Salesforce?** picker opens.
4. Choose **Everyone** (every Contact the connection can see), or tick one or more of your Salesforce **Contact List Views**. A contact who appears in two views is only imported once.
5. Optionally, under **Bring extra fields across**, pick any Contact fields you want beyond name and email. Each field you pick becomes a merge tag you can use in reports.
6. Click **Sync constituents**.

Sign in with a Salesforce account that can see the contacts you want to bring over — and, for write-back, that has permission to create Tasks or edit the Contact fields you choose below.

## Send engagement to Salesforce

On the connected Salesforce row, choose **Send to Salesforce** to configure write-back:

- **Where to write it** — **Activity** logs a completed Task on the Contact; **Contact fields** updates custom fields on the Contact (you map each Salesforce field to a metric: opens, reports, minutes, link clicks, engagement score, returning visitor, or last open).
- **Activity subject** — the subject on each Task. Defaults to *Storyraise report engagement*.
- **Assign the task to each donor's gift officer (Account Owner)** — optionally assign each Task to the donor's Account Owner, so the right fundraiser is notified.
- **Minimum engagement to send** — **Everyone with any activity**, **Opened a report (1★+)**, **Engaged — read in depth (2★+)**, or **High intent — clicked a link (3★)**.

Click **Save** to keep the settings, or **Save & send now** to send right away. Once saved, engagement is also sent on every scheduled sync while Auto-sync is on.

Each donor gets **one** Storyraise Task, updated in place as their engagement changes — no duplicate Tasks pile up on the Contact. If someone deletes that Task in Salesforce, the next send creates a fresh one. Only constituents who came from Salesforce and have recorded engagement are sent.

> Engagement is matched to the exact Contact using a Storyraise constituent id carried through each personalized report link, not by name — so it lands on the right person.

## Keeping it current

Click the sync icon on the connection row (**Sync now**) to run a sync immediately — the **Who should sync from Salesforce?** picker reopens, so you can confirm or change the scope. Or open the row's **⋯ More** menu, turn on **Auto-sync** (it's off by default), and set the **Frequency** to **Daily** or **Weekly** (weekly syncs run on Mondays). When write-back is saved, auto-sync also sends engagement on the same schedule.

Each sync re-pulls everyone in the chosen scope and updates existing records in place. **Contacts deleted in Salesforce are not removed from Storyraise** — remove them in Storyraise yourself if they shouldn't stay. See [Managing connections](../managing-connections.md).

## Related

- [The Connections tab](../connections-overview.md)
- [Syncing data to collections](../syncing-data-to-collections.md)
- [Troubleshooting sync issues](../troubleshooting-sync-issues.md)
