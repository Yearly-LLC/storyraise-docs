---
title: Personalized links
section: Sharing & Analytics
status: draft
keywords: qr, qr code, merge tags, for parameter, unique url, honor roll, major donor, stewardship, endowment report, gift acknowledgment, salutation, pledge, personalization
last_reviewed: 2026-09-04
---

# Personalized links

A personalized link opens your report addressed to one specific constituent — their name in the greeting, their details filled into merge tags, and their visit attributed to them in your Analytics. It's the difference between "Dear friend" and "Dear Maria."

## How personalized links work

Take your report's public link and add `?for=` followed by a constituent's email address:

```
https://your-organization.yearly.report/your-report?for=maria@example.com
```

When Maria opens that link, Storyraise looks up her constituent record and:

- **Fills in merge tags.** Anywhere your report says `@@first_name@@`, Maria sees "Maria" — and the same goes for any field on her record (`@@last_name@@`, custom fields like giving level, and so on).
- **Attributes the visit.** Her open shows up in your report's Analytics as *Maria* — not an anonymous visitor — so you know exactly who engaged. See [Tracking engagement](tracking-engagement.md).

The constituent must exist in your Storyraise constituent list (matched by email address), so [import your constituents](../crm-and-data/importing-constituent-data.md) first.

## Adding merge tags to a report

Type a merge tag anywhere in your report's text using the `@@field_name@@` format — for example:

> Thank you, @@first_name@@ — supporters like you made this year possible.

Any field on your constituent records can be a merge tag. Open a constituent from your **Constituents** list to see their available fields and exact field names.

> **A field that's missing on a constituent's record can't be filled in** — check your data for gaps (especially custom fields) before a big personalized mailing. See [Troubleshooting sync issues](../crm-and-data/troubleshooting-sync-issues.md).

## Generating personalized links and QR codes at scale

For a mailing, you don't build links by hand — the **Generate QR codes** tool creates one personalized link and QR code per constituent:

1. **Upload constituents CSV.** Export a CSV from your **Constituents** tab (or build one with `first_name`, `last_name`, and `email` headers).
2. **Paste your report link.** The tool appends `?for=email` to it for each constituent.
3. **Preview and download.** Review the per-constituent URLs, then click **Download ZIP**.

You get:

- A **ZIP of QR codes** — one folder per constituent, each containing a print-ready SVG QR code that opens their personalized report.
- A **CSV of links** — your original file plus a `report_url_used` column with each constituent's personalized URL, ready to mail-merge into your email platform.

<!-- TEAM REVIEW: confirm where customers access the QR code generator tool from the dashboard navigation. -->

## Where personalized links shine

- **Donor thank-yous** — a year-end report that greets each donor by name and reflects their giving.
- **Direct mail** — printed cards with a personal QR code feel individually made.
- **Email campaigns** — merge the `report_url_used` column into your email platform so each recipient's button opens their version.
- **Knowing who engaged** — after the send, Analytics shows which constituents opened the report. See [Understanding report metrics](understanding-report-metrics.md).

## What personalized links unlock in Analytics

Anonymous links tell you how your report performed. Personalized links tell you who to call on Monday.

Both link types record the same overall activity — opens, time spent, sections viewed, clicks, location, device, and visit timing. Personalized links connect that activity to a specific constituent, which additionally gives you:

- **Named readers in Most Engaged Constituents** — the per-report list of who engaged most deeply.
- **Engagement stars and intent badges tied to a person** — so you can see not just that someone clicked Donate, but who.
- **Who's Been Reading on your Home tab** — named constituents across all your reports.

Anonymous readers still count in your overall numbers; they just can't be named.

> **A forwarded link is attributed to its original recipient.** If a constituent passes their link to a friend, that friend's reading appears under the original name. Treat named engagement as a conversation starter, not proof of who completed every action.

## Privacy note

A personalized link reveals whatever constituent data your merge tags display. Treat each link as belonging to its constituent — don't post personalized links publicly, and use the plain public link for social media and websites.
