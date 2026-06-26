---
title: Managing connections
section: CRM & Data Connections
status: draft
keywords: sync now, auto-sync, disconnect, reconnect, status, last synced, refresh
last_reviewed: 2026-06-12
---

# Managing connections

Once a system is connected, the **Connections** tab is where you keep it healthy — check its status, refresh data, adjust credentials, and turn on automatic syncing.

## Connection status

Each connected system shows:

- A status indicator — **Live** when everything's working, or **Error** if the last sync failed (with a short message about what went wrong).
- The data it's syncing — **Constituents**, plus any collections you've added, with row counts (for example, *Recent gifts: 43*).
- When it last synced — *synced 2 hours ago*.
- A badge when auto-sync is on, and (for Salesforce write-back) a note of how many records were last **sent** back to your CRM.

## Keeping data current

- **Sync now.** Trigger an immediate refresh — useful right before a mailing or a board report. Re-syncing updates existing records rather than duplicating them (constituents are matched by email).
- **Auto-sync.** Turn this on under the connection's **⋯ More** menu and set the **Frequency** to **Daily** or **Weekly** — Storyraise refreshes the connection on that schedule on its own.
- **Refresh a collection.** If you've synced extra data into collections, refresh each one from the same menu. See [Syncing data to collections](syncing-data-to-collections.md).

## Updating credentials

If an API key is rotated or a connection falls into an **Error** state, choose **Edit credentials** (for API-key connections) and paste the new key. For sign-in (OAuth) systems like Raiser's Edge NXT and Salesforce, reconnect by authorizing again.

## Sending engagement back (Salesforce)

Connections import data *into* Storyraise — they don't change your source system. The one exception you can opt into is **Salesforce write-back**: from a connected Salesforce, choose **Send to Salesforce** to log report engagement (opens, time spent, link clicks) on each donor's Contact. See [Salesforce](integrations/salesforce.md) for the full setup.

## Disconnecting

Disconnecting stops future syncs. Constituents and collection data already imported into Storyraise stay put — disconnecting doesn't delete what you've already brought in.

<!-- TEAM REVIEW: confirm the disconnect control's label/location and exactly what it removes vs. retains. -->

## Troubleshooting

Most issues are the same ones covered in [Troubleshooting sync issues](troubleshooting-sync-issues.md): an expired or mistyped key, missing email addresses, or a provider that needs reauthorizing. An **Error** badge with its message is your starting point.

## Related

- [The Connections tab](connections-overview.md)
- [Syncing data to collections](syncing-data-to-collections.md)
