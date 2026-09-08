---
title: Data governance and CRM flags
section: Donor Data & CRM
keywords: anonymous, do not contact, do not solicit, do not email, deceased, opted out, flags, governance, suppression, exclusions, data hygiene
status: draft
last_reviewed: 2026-09-08
---

# Data governance and CRM flags

Your CRM carries flags that exist to stop things happening — anonymous, do not contact, do not solicit, deceased, opted out. This page is about what happens to them when constituent data reaches Storyraise, and what you have to handle yourself.

> **The short version:** treat every flag as something Storyraise does not act on for you. Storyraise imports the fields you map and does not interpret them as suppression rules. If a constituent must not be contacted or must not be named, that has to be enforced by what you sync and who you send to.

## The flags that matter

| Flag | What it must prevent | Where it can go wrong in a report |
|---|---|---|
| **Anonymous** | The donor's name appearing publicly | An anonymous donor printed in a [donor list or honor roll](../building-reports/donor-lists.md) |
| **Do Not Contact / Do Not Solicit** | Outreach reaching them at all | Their inclusion in an [email](../distribution-and-engagement/email-distribution.md) or [SMS](../distribution-and-engagement/sms-distribution.md) recipient list |
| **Do Not Email** | Email specifically | Same, for the email channel |
| **Deceased** | A report addressed to them reaching a household | A personalized greeting arriving at a bereaved address |
| **Opted out / unsubscribed** | Further mailings | Re-adding them by importing a fresh list |

## Practical handling

Until flag handling is documented as a product behaviour, the reliable pattern is to **filter at the source**:

1. **Sync a filtered list, not your whole database.** Several integrations sync from a saved list or query — build that list in your CRM with the exclusions already applied, so flagged records never arrive in Storyraise. This is far safer than importing everything and remembering to exclude later.
2. **Bring the flag across as a field** where you can, so anyone building a report can see it on the constituent record.
3. **Re-check before every send.** A list synced in March reflects March's flags. Re-sync before a send, or re-export from your CRM.
4. **Check donor lists by hand.** A donor list is typed or pasted into a report and is not governed by anything your CRM knows. Someone has to check it against the anonymous flag every time.
5. **Keep a suppression check in your launch process** rather than relying on any single person's memory.

<!-- TEAM REVIEW: this page is written as guidance because we cannot currently
     answer the underlying product questions anywhere in the knowledge base.
     Each of these needs a verified answer, after which most of the "handle it
     yourself" advice above should be replaced with what the product does:
       1. Are any of these flags imported by any integration, and under what
          field names?
       2. Does Storyraise act on any of them — excluding a constituent from an
          email or SMS recipient list, or from a personalized send?
       3. What happens to a constituent who is deleted at the source, or removed
          from the synced list? Are they removed from Storyraise, or do they
          persist as orphans indefinitely? This is the question with the worst
          failure mode: a person who asked to be forgotten remaining in a
          recipient list forever.
       4. Does the Salesforce write-back check any of these flags before
          creating an Activity on a Contact?
     Confirm with engineering before this page is treated as authoritative. -->

## Deletion at the source

If someone is deleted or suppressed in your CRM, confirm what happens to their Storyraise record before you rely on it. Currently the only documented deletion path is at the connection level — disconnecting an integration can permanently delete the collections it synced and any constituents it was the only source for. See [Managing connections](managing-connections.md).

## Sync only what you need

The strongest governance control available to you is the mapping step. Fields you don't sync can't be exposed, can't appear in a merge tag, and can't be seen by a colleague with View access — [access is per area, not per field](../getting-started/user-roles-and-permissions.md).

Before connecting, agree with whoever owns your data which fields have a reason to be in a reporting tool. Capacity ratings, solicitor notes, and giving history often don't.

## Related

- [Connecting a CRM](connecting-a-crm.md) — what a connection does
- [Mapping fields](mapping-fields.md) — choosing what comes across
- [Security and data governance](../resources/security-and-data.md) — the wider data picture
- [Managing connections](managing-connections.md) — disconnecting and deleting
