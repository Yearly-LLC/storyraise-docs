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

A Send message is built around your content: write a personal note, attach a report, and deliver it to each constituent with their own personalized link. Your organization's logo and branding frame the message, and a clear call-to-action button takes recipients straight to your content.

## Composing a message

1. Open the compose view and write your message.
2. **Personalize with merge tags.** Use `@@field_name@@` anywhere in your subject or body — `@@first_name@@`, `@@last_name@@`, or any custom field from your constituent records. Each recipient sees their own values.
3. **Attach your content.** Choose **Attach a Report** to pick one of your published reports, or **Attach Link Instead** to send any URL.
4. Set your subject line and adjust how your logo appears.

## Choosing recipients

Add recipients by uploading a CSV — click **Upload Recipients** and use the **Constituents Template (CSV)** format (`first_name`, `last_name`, `email`). Recipients map to your constituent records, which is what powers per-recipient personalization.

<!-- TEAM REVIEW: selecting recipients directly from synced Constituents (rather than CSV upload) appears not wired up yet ("Connect to CRM" is disabled in compose). Confirm what ships. -->

## Preview before you send

Click **Preview Messages & Send** to see the message exactly as each recipient will receive it:

- Step through recipients one by one, or search for a specific person by name or email.
- Every merge tag is shown resolved with that recipient's real data — the single best way to catch a missing field before it goes out.

When everything looks right, confirm the send — the button shows exactly how many people you're reaching: **Send Messages to N People**.

## Sending addresses and your domain

By default, messages are delivered from a Storyraise sending address. To send from your own domain (so emails come from `you@email.yourdomain.org`), set up a custom sending subdomain — see [Setting up your email sending subdomain](../account-and-settings/email-subdomain-setup.md).

## Good to know

- **Sends are immediate.** Scheduling a send for later isn't available yet — compose when you're ready to deliver.
- **Delivery analytics are coming.** Open and click tracking for sent emails isn't available yet; in the meantime, attach a report and use its [Insights](understanding-report-metrics.md) to see who engaged — personalized report links attribute each open to its constituent.

## Tips

- **Subject lines are personal too.** `Your 2026 impact, @@first_name@@` outperforms a generic subject.
- **Send yourself a test.** Add your own email to the recipient CSV and check the real message in your inbox before the full send.
- **Mind your data gaps.** A recipient missing the field a merge tag uses gets an awkward blank — preview a handful of recipients with the least-complete records first.
