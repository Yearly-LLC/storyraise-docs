---
title: SMS distribution
section: Distribution & Engagement
status: draft
keywords: text message, texting, phone
last_reviewed: 2026-06-12
---

# SMS distribution

Text messages get seen — most are read within minutes. **Storyraise Send** lets you deliver your reports and messages to constituents by SMS, each text personalized to its recipient.

<!-- TEAM REVIEW: Storyraise Send is pre-release (text-message branch, not merged). Confirm availability, entry point, and final UI labels before publishing this page. -->

## What a Send text looks like

Each recipient gets a text containing:

- **Your personalized message** — written by you, with merge tags (`@@first_name@@` and any constituent field) filled in per recipient.
- **A personalized link** — opening your attached report or content, addressed to that constituent.
- **An image** — a visual preview that makes the text feel like more than a bare link.

## Sending a text campaign

The flow mirrors [email distribution](email-distribution.md):

1. **Compose your message.** Keep it short — SMS rewards brevity. Personalize with `@@field_name@@` merge tags.
2. **Attach your content** — a published report or any link.
3. **Add recipients.** Upload a CSV in the **Constituents Template** format; include a phone number column for text delivery.
4. **Preview per recipient.** Click **Preview Messages & Send** and step through recipients to see each person's resolved message before anything goes out.
5. **Send.** The confirmation shows exactly how many people you're texting.

<!-- TEAM REVIEW: confirm the phone-number column name expected in the recipients CSV, and how a recipient's email-vs-phone delivery preference is chosen in the UI. -->

## Consent comes first

Texting has stricter rules than email. Before sending:

- **Only text people who opted in.** Send SMS only to constituents who agreed to receive texts from your organization — a phone number in your CRM is not the same as permission to text it.
- **Identify yourself.** Lead with your organization's name; recipients won't recognize the sending number.
- **Honor opt-outs promptly.** If someone asks to stop receiving texts, remove them from your recipient lists right away.
- **Mind the clock.** Send during your audience's daytime hours — a 7 a.m. or 10 p.m. text erodes goodwill fast.

## Email or SMS?

A practical split that works for most organizations:

- **Email** for the full story — annual reports, newsletters, anything readers will sit with.
- **SMS** for the moment — event-day reminders, urgent campaign pushes, a short thank-you with a personalized report link.
- **Both** for big sends: email first, then a text a few days later to constituents who matter most.

## Tips

- **Front-load the value.** The first line decides whether the link gets tapped: "Maria, your 2026 impact report is ready" beats "Hello from the team at…".
- **Test on your own phone.** Add yourself as a recipient and check how the message, image, and link render before the full send.
- **Watch engagement through the report.** Open tracking for texts isn't available yet — but if you attach a report via personalized links, [Insights](understanding-report-metrics.md) shows exactly which constituents opened it.
