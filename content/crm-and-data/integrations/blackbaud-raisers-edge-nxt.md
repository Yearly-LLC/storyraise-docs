---
title: Blackbaud (Raiser's Edge NXT)
section: Donor Data & CRM
status: draft
last_reviewed: 2026-10-13
---

# Blackbaud (Raiser's Edge NXT)

Connect Storyraise to Blackbaud to sync constituents from Raiser's Edge NXT, so you can personalize reports for your donors and see who's engaging — and send report engagement back to Raiser's Edge so it shows up on each constituent's record.

## What you'll need

- A Blackbaud account with access to your organization's Raiser's Edge NXT environment and the constituent lists you want to sync.
- A **constituent list** in Raiser's Edge NXT containing the people you want in Storyraise. If you don't have one yet, create a list in RE NXT first — syncing works list by list, which keeps you in control of exactly who comes over.

## Connect and sync

Raiser's Edge NXT uses sign-in (OAuth), so there's no API key to copy:

1. Open the **[Connections](../connections-overview.md)** tab and find **Raiser's Edge NXT** under **Add a connection**.
2. Click **Connect**. You'll be sent to Blackbaud to sign in and authorize Storyraise.
3. Approve the authorization. You'll return to Storyraise automatically, and a **Select a list to import** picker opens.
4. Choose the **constituent list** you want to sync.
5. Click **Sync Constituents**.

Synced constituents appear in your constituent list tagged **Blackbaud**, and the connection shows as **Live**.

## What gets synced

**Into Storyraise**

- First name, last name, and email for each constituent in the selected list, along with their Raiser's Edge constituent id (so engagement can be sent back to the right record).

That's it — custom fields from your RE NXT environment are **not** imported. Records are matched by email address — constituents without an email in RE NXT are skipped, and re-syncs update existing records rather than duplicating them.

To bring giving into Storyraise, use **Add data** on the connection row to sync gifts into a collection, with fields for **Amount**, **Date**, **Type**, **Fund**, **Campaign**, and **Appeal**. See [Syncing data to collections](../syncing-data-to-collections.md).

**Back into Raiser's Edge NXT**

- **Report engagement** — opens, reports viewed, minutes engaged, link clicks, and whether the donor is a returning visitor — logged on each constituent's record. See **Send engagement to Raiser's Edge** below.

## Keeping it fresh

- **Sync now.** Click the sync icon on the connection row to run a sync immediately. The list picker reopens, so you can confirm or change which list to pull.
- **Auto-sync.** Open the connection's **⋯ More** menu and turn on **Auto-sync** (it's off by default), then set the **Frequency** to **Daily** or **Weekly** (weekly syncs run on Mondays). Scheduled syncs pull the list you chose most recently.

Each sync re-pulls the whole chosen list and updates existing records in place. **Constituents deleted in Raiser's Edge NXT are not removed from Storyraise** — remove them in Storyraise yourself if they shouldn't stay. See [Data refreshes](../data-refreshes.md) and [Managing connections](../managing-connections.md).

Storyraise refreshes your Blackbaud authorization automatically; if it ever fully expires, just click **Connect** again.

## Send engagement to Raiser's Edge

On the connected Raiser's Edge NXT row, choose **Send to Raiser's Edge** to configure write-back:

- **Where to write it** — **Action** logs a completed action on the constituent timeline; **Custom fields** writes engagement into constituent custom fields (you map each RE custom field category to a metric: opens, reports, minutes, link clicks, engagement score, returning visitor, or last open).
- **Action summary** — the summary shown on each action. Defaults to *Storyraise report engagement*.
- **Action category** — **Email**, **Mailing**, **Phone Call**, **Meeting**, or **Task/Other**.
- **Assign the action to each donor's fundraiser** — optionally assign each action to the constituent's fundraiser, so the right person sees it.
- **Minimum engagement to send** — **Everyone with any activity**, **Opened a report (1★+)**, **Engaged — read in depth (2★+)**, or **High intent — clicked a link (3★)**.

Click **Save** to keep the settings, or **Save & send now** to send right away. Once saved, engagement is also sent on every scheduled sync while Auto-sync is on.

Each donor gets **one** Storyraise action, updated in place as their engagement changes — no duplicates pile up on the timeline. If someone deletes that action in Raiser's Edge, the next send creates a fresh one. Only constituents who came from Raiser's Edge NXT and have recorded engagement are sent.

Sign in with a Blackbaud account that has permission to add actions (or edit custom fields) on constituent records.

## Embedding Blackbaud donation forms

Beyond constituent data, you can embed a Blackbaud donation form inside a report: add the donation form element in the builder and paste your **Donation Form URL** from Blackbaud. Readers can give without leaving your report.

## Troubleshooting

- **Authorization errors** — reconnect via the **Connect** button, using a Blackbaud account with access to your lists.
- **Missing constituents** — check that they're in the synced list and have an email address in RE NXT.

More help: [Troubleshooting sync issues](../troubleshooting-sync-issues.md).
