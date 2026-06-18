---
title: CiviCRM
section: CRM & Data Connections
status: draft
keywords: civicrm, apiv4, site key, api key, contacts, connections
last_reviewed: 2026-06-12
---

# CiviCRM

Connect your CiviCRM site (APIv4) to import contacts into Storyraise as constituents.

<!-- TEAM REVIEW: CiviCRM connects via the Connections tab, which is rolling out (currently internal). Until it reaches your account, use the CSV path below. Confirm availability before publishing. -->

## What syncs

- **Constituents** (contacts) → your [constituent list](../importing-constituent-data.md), matched by email.
- Optionally, additional data into collections — see [Syncing data to collections](../syncing-data-to-collections.md).

## Connect

In the **Connections** tab, find **CiviCRM**, click **Connect**, and enter:

- **Site URL** — your CiviCRM site address (e.g. `https://your-civicrm-site.org`).
- **API Key** — set on your CiviCRM user/contact record.
- **Site Key** (optional) — the `CIVICRM_SITE_KEY` from `civicrm.settings.php`.

Then **Connect & sync**.

## Where to find these

API keys attach to a CiviCRM user; the site key lives in `civicrm.settings.php`. See the [CiviCRM API keys guide](https://docs.civicrm.org/sysadmin/en/latest/setup/api-keys/).

## No Connections tab yet?

While the native connection rolls out, you can bring CiviCRM contacts in today by exporting them to CSV and using [CSV import](../importing-constituent-data.md) — include **First Name**, **Last Name**, and **Email** columns, plus any custom fields.

## Related

- [The Connections tab](../connections-overview.md)
- [Managing connections](../managing-connections.md)
