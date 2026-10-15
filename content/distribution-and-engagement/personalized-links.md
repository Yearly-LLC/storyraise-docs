---
title: Personalized links
section: Sharing & Analytics
status: draft
keywords: qr, qr code, merge tags, for parameter, unique url, honor roll, major donor, stewardship, endowment report, gift acknowledgment, salutation, pledge, personalization
last_reviewed: 2026-10-15
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

## Getting a link for your email platform

If you send through Mailchimp, Constant Contact, Bloomerang, Raiser's Edge NXT, Salesforce, or another email platform, you only need **one** link. In the dashboard, open a published report's menu and choose **Send in an email**, then pick your **Email tool** (or choose **Other** and paste your tool's email merge tag). You can also click **Get personalized link** on the **Your report is live!** page that opens after you publish. Storyraise formats the link with that platform's own email merge field after `?for=`, so the platform fills in each recipient's address when it sends. Leave the merge field exactly as it is.

## Generating personalized links and QR codes at scale

For a mailing, you don't build links by hand. Two tools under **Tools** in the dashboard do it for every constituent at once:

- **Generate QR codes** — one personalized QR code per constituent.
- **Generate Report Links** — a CSV of personalized links, for mail merges.

Both work the same way:

1. **Choose your constituents.** Load them **From Storyraise** (optionally narrowed to a saved list), or **Upload CSV** with `first_name`, `last_name`, and `email` headers.
2. **Choose your report.** Select one of your published reports, or paste a link. The tool appends `?for=email` to it for each constituent.
3. **Preview and download.** Review the per-constituent URLs, then download.

You get:

- From **Generate QR codes**, a **ZIP of QR codes** (**Download ZIP**) — one folder per constituent, each containing a print-ready SVG QR code that opens their personalized report.
- From **Generate Report Links**, a **CSV of links** (**Download CSV**) — the columns you choose plus a `report_url_used` column with each constituent's personalized URL, ready to mail-merge into your email platform.

## Where personalized links shine

- **Donor thank-yous** — a year-end report that greets each donor by name and reflects their giving.
- **Direct mail** — printed cards with a personal QR code feel individually made.
- **Email campaigns** — merge the `report_url_used` column into your email platform so each recipient's button opens their version.
- **Automated donor journeys** — let your email platform's automations send the report at the right moment, such as a welcome two weeks after a first gift. See [Automated donor journeys](/automated-donor-journeys/).
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
