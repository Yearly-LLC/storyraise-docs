---
title: The Connections tab
section: Donor Data & CRM
status: draft
keywords: connections, integrations, crm, sync, connect, hub
last_reviewed: 2026-10-15
---

# The Connections tab

**Connections** is your hub for bringing donor data into Storyraise. Connect a system once and Storyraise imports your constituents — then you can sync additional data (like giving history or email engagement) into collections for use in your reports.

> *Connect your CRM and fundraising tools so your donor data flows into Storyraise automatically.*

## The home for every integration

Connections is the unified home for your integrations — connect a CRM, giving platform, or email tool, all in one place. (Prefer to upload a file? CSV import lives in the **Constituents** area — see [Importing constituent data](importing-constituent-data.md).)

## What you can connect

Connections groups integrations into three categories:

- **CRM** — import your constituents from your system of record: [Raiser's Edge NXT](integrations/blackbaud-raisers-edge-nxt.md), [Bloomerang](integrations/bloomerang.md), [Salesforce](integrations/salesforce.md), [Virtuous](integrations/virtuous.md), [CiviCRM](integrations/civicrm.md), [Slate](integrations/slate.md), [Ellucian](integrations/ellucian.md), [Little Green Light](integrations/little-green-light.md), [DonorPerfect](integrations/donorperfect.md), [Neon CRM](integrations/neon-crm.md), and [Funraise](integrations/funraise.md).
- **Giving** — import contacts and sync donations: [Givebutter](integrations/givebutter.md), [Donorbox](integrations/donorbox.md), and [Fundraise Up](integrations/fundraise-up.md).
- **Email** — import your audience and sync email engagement: [Mailchimp](integrations/mailchimp.md).

## How connecting works

1. Open the **Connections** tab and find the system you want under **Add a connection** (search by name).
2. Click **Connect**. What happens next depends on the system:
   - **Sign-in (OAuth)** — for Raiser's Edge NXT and Salesforce, you're sent to the provider to sign in and authorize Storyraise, then returned automatically. Next you choose who to sync — a constituent list for Raiser's Edge NXT, or everyone or one or more Contact List Views for Salesforce — and click **Sync Constituents** (Raiser's Edge NXT) or **Sync constituents** (Salesforce).
   - **API key / credentials** — for everything else, a **Connect {system}** dialog asks for an API key (and sometimes a URL or account email). Each dialog includes a hint on exactly where to find your key in that provider, plus a link to their documentation. Click **Connect & sync** (Bloomerang's dialog says **Sync constituents**).
3. Storyraise imports your constituents and the connection appears under your connected systems, marked **Live** (or **Error** if something went wrong).

Each integration's page (linked above) lists exactly what it needs and where to find it.

## What a connection does

- **Imports constituents.** Records flow into your shared [constituent list](importing-constituent-data.md), matched by email — the foundation for personalization and insights.
- **Syncs extra data into collections (optional).** Beyond names and emails, you can pull any data a connection exposes — giving history, email engagement, and more — into a collection. See [Syncing data to collections](syncing-data-to-collections.md).
- **Keeps itself current (optional).** Turn on auto-sync (daily or weekly), or sync on demand. See [Managing connections](managing-connections.md).
- **Sends engagement back (Salesforce and Raiser's Edge NXT).** These two connections can also push report engagement back to your CRM — one Task or action per donor, kept up to date — so activity shows up on each donor's record. See [Salesforce](integrations/salesforce.md) and [Raiser's Edge NXT](integrations/blackbaud-raisers-edge-nxt.md).

## Related

- [Syncing data to collections](syncing-data-to-collections.md)
- [Managing connections](managing-connections.md)
- [Supported integrations](supported-integrations.md)
