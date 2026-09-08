---
title: Managing connections
section: CRM & Data Connections
status: draft
keywords: sync now, auto-sync, disconnect, reconnect, status, last synced, refresh
last_reviewed: 2026-09-08
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

Open the connection's menu in the **Connections** tab and choose **Disconnect**.

Storyraise deletes the credentials it stored, stops syncing, and asks the other system to revoke our access. You can reconnect later.

**Your data stays by default.** Constituents and synced collections you've already imported stay exactly as they are; they just stop updating. Reports built on them keep working.

The confirmation offers **Also delete the data it synced** as an option. Tick it and Storyraise permanently deletes the collections this connection synced, along with any constituents it was the only source for — and reports built on that data lose it. It can't be undone, so leave it unticked unless removing the data is the reason you're disconnecting.

Disconnecting needs the same access as connecting: Owners, Admins, and Editors can do it, Viewers can't.

## Troubleshooting

Most issues are the same ones covered in [Troubleshooting sync issues](troubleshooting-sync-issues.md): an expired or mistyped key, missing email addresses, or a provider that needs reauthorizing. An **Error** badge with its message is your starting point.

## Related

- [The Connections tab](connections-overview.md)
- [Syncing data to collections](syncing-data-to-collections.md)
