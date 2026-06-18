---
title: Managing connections
section: CRM & Data Connections
status: draft
keywords: sync now, auto-sync, disconnect, reconnect, status, last synced, refresh
last_reviewed: 2026-06-12
---

# Managing connections

Once a system is connected, the **Connections** tab is where you keep it healthy — check its status, refresh data, adjust credentials, and turn on automatic syncing.

<!-- TEAM REVIEW: part of the Connections tab (rolling out / internal). Confirm availability and exact control labels before publishing. -->

## Connection status

Each connected system shows:

- A status indicator — **Live** when everything's working, or **Error** if the last sync failed (with a short message about what went wrong).
- The data it's syncing — **Constituents**, plus any collections you've added, with row counts (for example, *Recent gifts: 43*).
- When it last synced — *synced 2 hours ago*.
- A **daily** badge if auto-sync is on.

## Keeping data current

- **Sync now.** Trigger an immediate refresh — useful right before a mailing or a board report. Re-syncing updates existing records rather than duplicating them (constituents are matched by email).
- **Auto-sync daily.** Toggle this on (under the connection's **⋯ More** menu) and Storyraise refreshes the connection once a day on its own.
- **Refresh a collection.** If you've synced extra data into collections, refresh each one from the same menu. See [Syncing data to collections](syncing-data-to-collections.md).

## Updating credentials

If an API key is rotated or a connection falls into an **Error** state, choose **Edit credentials** (for API-key connections) and paste the new key. For sign-in (OAuth) systems like Raiser's Edge NXT and Salesforce, reconnect by authorizing again.

## Disconnecting

Disconnecting stops future syncs. Constituents and collection data already imported into Storyraise stay put — disconnecting doesn't delete what you've already brought in.

<!-- TEAM REVIEW: confirm the disconnect control's label/location and exactly what it removes vs. retains. -->

## Troubleshooting

Most issues are the same ones covered in [Troubleshooting sync issues](troubleshooting-sync-issues.md): an expired or mistyped key, missing email addresses, or a provider that needs reauthorizing. An **Error** badge with its message is your starting point.

## Related

- [The Connections tab](connections-overview.md)
- [Syncing data to collections](syncing-data-to-collections.md)
