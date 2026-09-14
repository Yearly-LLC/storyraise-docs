---
title: Data refreshes
section: Donor Data & CRM
status: draft
last_reviewed: 2026-09-08
---

# Data refreshes

Your CRM data changes constantly — new donors, updated emails, fresh gift records. This page covers how to keep your Storyraise constituent list in step.

## Refreshing on demand

To refresh a connection right now, open the **Connections** tab and click **Sync now** (the sync icon) on its card.

- **Raiser's Edge NXT** asks which constituent list to sync. If your authorization has expired, you may be asked to reconnect first.
- **Salesforce** asks who should sync: everyone, or one of your Contact List Views.
- **Slate** asks you to map your query's columns to first name, last name, and email.
- **CSV** — export a fresh file from your system and upload it again from the **Constituents** area.

Because constituents are identified by email address, refreshed records **update** existing constituents rather than creating duplicates. New people in the source are added.

## When to refresh

A good rule of thumb: refresh right before you do anything that depends on the data —

- before generating personalized links or QR codes for a mailing,
- before publishing a personalized report,
- before reviewing constituent engagement in Analytics for a board update.

## Automatic refreshes

Storyraise can refresh a connection on a schedule, so you're not relying on someone remembering to press **Sync now**.

Turn it on per connection: in the **Connections** tab, open a connection's menu and switch on **Auto-sync**. Pick **Daily** or **Weekly**, and the card then shows when it last ran.

Each scheduled run does two things, in this order:

- **Re-pulls your constituents** from the source system, so a donor added to your CRM last week becomes a constituent without anyone opening the dashboard.
- **Refreshes your synced collections**, using the constituent list it just updated — so someone added tonight is linked to their rows in the same run rather than waiting for the next one.

A scheduled run brings in the same people as your last **Sync now**: the Salesforce List View, the Raiser's Edge NXT list, or the Slate column mapping you chose. For Raiser's Edge NXT and Slate, run **Sync now** once after turning on Auto-sync, so Storyraise knows which list or mapping to use.

Auto-sync is off until you turn it on, and it's set per connection, so you can leave a hand-curated source alone while a busy one refreshes nightly.

> **Personalized links pick up new donors automatically.** A report looks each reader up when they open their link, so a donor who syncs in tonight can open a report you published months ago. There's nothing to republish.

<!-- TEAM REVIEW: a connection can also be set to refresh collections without re-pulling constituents, for orgs that curate their constituent list by hand. Confirm whether that is exposed in the UI anywhere before documenting it. -->

<!-- TEAM REVIEW: confirm what a customer sees when a scheduled sync fails (e.g. an expired Blackbaud authorization) — is there a notification, or only the connection's status in the tab? -->

## Related

- [Troubleshooting sync issues](troubleshooting-sync-issues.md)
- [Importing constituent data](importing-constituent-data.md)
- [Automated donor journeys](/automated-donor-journeys/) — personalized reports sent by your email platform's automations, for donors who sync in overnight.
