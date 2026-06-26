---
title: Supported integrations
section: CRM & Data Connections
status: draft
keywords: integrations, connections, crm, supported, salesforce, mailchimp, giving
last_reviewed: 2026-06-24
---

# Supported integrations

Storyraise connects to your CRM, giving platforms, and email tools through the **[Connections tab](connections-overview.md)** — one hub where you connect a system, import your constituents, and sync the rest (giving history, email engagement, and more) into Storyraise.

## CRM

| Integration | What it syncs |
|---|---|
| [Raiser's Edge NXT (Blackbaud)](integrations/blackbaud-raisers-edge-nxt.md) | Constituents from your RE NXT lists |
| [Bloomerang](integrations/bloomerang.md) | Constituents, plus gifts into Insights |
| [Salesforce / Nonprofit Cloud](integrations/salesforce.md) | Contacts and giving — and can send report engagement *back* to Salesforce |
| [Virtuous](integrations/virtuous.md) | Contacts and giving history |
| [CiviCRM](integrations/civicrm.md) | Contacts (API v4) |
| [Slate for Advancement](integrations/slate.md) | Constituents from a Slate query (you map the columns) |
| [Ellucian Advancement](integrations/ellucian.md) | Persons via the Ethos Integration API |
| [Little Green Light](integrations/little-green-light.md) | Constituents and their giving |
| [DonorPerfect](integrations/donorperfect.md) | Donors and gift history |
| [Neon CRM](integrations/neon-crm.md) | Accounts and donations |
| [Funraise](integrations/funraise.md) | Supporters and giving — *coming soon* |

## Giving

| Integration | What it syncs |
|---|---|
| [Givebutter](integrations/givebutter.md) | Contacts, plus donations into Insights (also embeds in reports) |
| [Donorbox](integrations/donorbox.md) | Donors, plus donations into Insights |
| [Fundraise Up](integrations/fundraise-up.md) | Supporters, plus donations into Insights |

## Email

| Integration | What it syncs |
|---|---|
| [Mailchimp](integrations/mailchimp.md) | Audience members and email engagement |

## Not yet supported

[HubSpot](integrations/hubspot.md) isn't a native connection yet. Using a system that isn't listed? You can almost always export your records to CSV and [import them directly](importing-constituent-data.md) — you'll get the same personalization and insights as a native connection. Let us know which integration you'd like next; customer requests drive the roadmap.

## What connections can access

Connections **import** your data into Storyraise — your constituents, and any extra data you choose to [sync into collections](syncing-data-to-collections.md). They don't change anything in your source system, with one exception you opt into: **Salesforce** can also **send report engagement back** to your CRM (logged on each donor's record), so your team sees Storyraise activity where they already work. See [Salesforce](integrations/salesforce.md). You can disconnect any connection at any time.
