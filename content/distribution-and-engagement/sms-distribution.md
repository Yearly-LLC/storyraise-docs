---
title: SMS distribution
section: Sharing & Analytics
status: stub
keywords: text message, texting, phone
last_reviewed: 2026-10-15
---

# SMS distribution

> **Coming soon** — text messaging in Storyraise Send isn't available to customers yet; email is. See [Email distribution](email-distribution.md).

Text messages get seen — most are read within minutes. **Storyraise Send** lets you deliver your reports and messages to constituents by SMS, each text personalized to its recipient.

<!-- TEAM REVIEW: SMS is allowlist-only in Send (storyraise-mail@stepper public/feature-flags.js SMS_PREVIEW_ORGS: storyraise, storyraise-alerts, ramsey, yearlytttest, jmsg, demo) and also needs a per-org registered sender (o/{slug}/sms/sender, A2P 10DLC). Every other org sees the SMS channel as "Coming soon" (public/channels/index.html), and the builder's Share modal marks Text as not live (builder public/js/app.js env.storyraise_send.channels, is_live: false). Send's SMS code still sends through Twilio, which is not on the published subprocessor list (Twilio was retired from the builder 2026-10-02). Decide whether SMS will launch before un-stubbing this page. -->

## What a Send text looks like

Each recipient gets a text containing:

- **Your personalized message** — written by you, with merge tags (`@@first_name@@` and any constituent field) filled in per recipient.
- **A personalized link** — opening your attached report or content, addressed to that constituent.
- **An image** — a visual preview that makes the text feel like more than a bare link.

## Sending a text campaign

The flow mirrors [email distribution](email-distribution.md):

1. **Compose your message.** Keep it short — SMS rewards brevity. Personalize with `@@field_name@@` merge tags.
2. **Attach your content** — a published report or any link.
3. **Add recipients.** Pick from your constituents. Only people with a phone number and SMS consent on file can be selected.
4. **Preview per recipient.** Click **Review & send** and step through recipients to see each person's resolved message before anything goes out.
5. **Send.** The confirmation shows exactly how many people you're texting.


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
- **Watch engagement through the report.** Open tracking for texts isn't available yet — but if you attach a report via personalized links, the report's [Analytics](understanding-report-metrics.md) shows exactly which constituents opened it.
