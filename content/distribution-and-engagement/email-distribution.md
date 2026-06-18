---
title: Email distribution
section: Distribution & Engagement
status: draft
keywords: send, campaign, newsletter, blast
last_reviewed: 2026-06-12
---

# Email distribution

**Storyraise Send** lets you deliver your reports and messages to constituents by email, right from Storyraise — personalized for each recipient, with no separate email platform required.

<!-- TEAM REVIEW: Storyraise Send is pre-release (text-message branch, not merged). Confirm availability and entry point before publishing this page, and verify final UI labels against the shipped product. -->

## What you can send

A Send message is built around your content: write a personal note, include a link to your report, and deliver it to each constituent with their own personalized link. Your organization's logo and branding frame the message, and a clear call-to-action takes recipients straight to your content.

## Before you start

Two things to set up in [app.storyraise.com](https://app.storyraise.com) first:

- **Add your constituents.** Your recipients come from your constituent list — import or sync them before you send, since that's also what powers per-recipient personalization. See [Importing constituent data](../crm-and-data/importing-constituent-data.md).
- **Set up your sending domain.** So email arrives from your own domain rather than a Storyraise address, verify a custom sending domain first. See [Setting up a custom sending domain](../account-and-settings/custom-sending-domain.md).

## Composing a message

1. Open the editor view and write your message.
2. **Personalize with merge tags.** Use `@@field_name@@` anywhere in your subject or body — `@@first_name@@`, `@@last_name@@`, or any custom field from your constituent records. Each recipient sees their own values.
3. **Link to your report.** Paste your report's link into the body of your email — when you send, each recipient gets their own [personalized link](personalized-links.md) to it. (You add the link in the message body; there's no separate "attach a report" step.)
4. Set your subject line and adjust how your logo appears.

## Choosing recipients

Add recipients from your constituents in [app.storyraise.com](https://app.storyraise.com) — they're matched to your constituent records, which is what powers per-recipient personalization.

<!-- TEAM REVIEW: confirm the exact recipient-selection flow in the shipped product (choosing from synced constituents vs. CSV upload) and update this section to match. -->

## Preview before you send

Click **Preview Messages & Send** to see the message exactly as each recipient will receive it:

- Step through recipients one by one, or search for a specific person by name or email.
- Every merge tag is shown resolved with that recipient's real data — the single best way to catch a missing field before it goes out.

When everything looks right, confirm the send — the button shows exactly how many people you're reaching: **Send Messages to N People**.

## Sending addresses and your domain

By default, messages are delivered from a Storyraise sending address. To send from your own domain (so emails come from `you@email.yourdomain.org`), set up a custom sending subdomain — see [Setting up your email sending subdomain](../account-and-settings/email-subdomain-setup.md).

## Good to know

- **Schedule ahead.** You can send right away or schedule a send for later — up to 30+ days in advance.
- **Delivery status, not opens.** You can see the delivery status of your messages. Email **open and click tracking aren't available** — to measure engagement, link to a report and use its [Insights](understanding-report-metrics.md), where personalized links attribute each open to its constituent.

<!-- TEAM REVIEW: confirm the exact scheduling cap (stated here as "30+ days") and the delivery-status states surfaced to customers. -->

## Tips

- **Subject lines are personal too.** `Your 2026 impact, @@first_name@@` outperforms a generic subject.
- **Send yourself a test.** Add your own email to the recipient CSV and check the real message in your inbox before the full send.
- **Mind your data gaps.** A recipient missing the field a merge tag uses gets an awkward blank — preview a handful of recipients with the least-complete records first.
