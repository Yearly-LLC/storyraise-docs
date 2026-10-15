---
title: Email distribution
section: Sharing & Analytics
status: draft
keywords: send, campaign, newsletter, blast, schedule, storyraise send
last_reviewed: 2026-10-15
---

# Email distribution

**Storyraise Send** lets you deliver your reports and messages to constituents by email, right from Storyraise — personalized for each recipient, with no separate email platform required.

## What you can send

A Send message is built around your content: write a personal note, include a link to your report, and deliver it to each constituent with their own personalized link. Your organization's logo and branding frame the message, and a clear call-to-action takes recipients straight to your content.

## Where to start

The quickest route is from a published report:

1. Open the report's share options — the **Your report is live!** page that opens after you publish, or the **Share** button in the builder.
2. Under **Send it with Storyraise Send**, choose **Email** and click **Draft the email**. Send opens in a new tab with a message already drafted around your report: its cover image and a [personalized link](personalized-links.md) for each recipient (the link ends in `?for=@@email@@`, which Send fills in per person).

If your organization hasn't set up a sending address yet, the button reads **Set up your sending address** instead and walks you through that first, then brings you back to your draft.

## Before you start

- **Add your constituents.** Your recipients come from your constituent list — import or sync them before you send, since that's also what powers per-recipient personalization. Only constituents with an email address can receive an email. See [Importing constituent data](../crm-and-data/importing-constituent-data.md).
- **Set up your sending domain.** Send delivers from your organization's own verified domain. See [Setting up a custom sending domain](../account-and-settings/custom-sending-domain.md).
- **Have a mailing address ready.** Every email carries your organization's postal address in its footer (a CAN-SPAM requirement), and Send won't send without one.

## Composing a message

1. Write or adjust your message in the editor.
2. **Personalize with merge tags.** Use `@@field_name@@` anywhere in your subject or body — `@@first_name@@`, `@@last_name@@`, or any custom field from your constituent records. Each recipient sees their own values.
3. **Link to your report.** When you start from a report, the personalized link is already in the draft. You can also paste a report link into the body yourself.
4. When the message is ready, click **Review & send**.

## Review & send: four steps

**Review & send** opens a short flow. It doesn't send anything until the very end.

1. **Preview** — see the message as each recipient will receive it. Step through recipients or search for a specific person, and switch device sizes. Every merge tag is shown resolved with that recipient's real data — the single best way to catch a missing field before it goes out.
2. **Recipients** — pick who receives the message from your constituents. Narrow the list by your saved **Lists** or by tag, click a person to add them, and click again to remove them. **Add a recipient** creates a new constituent on the spot (merge tags beyond name and email will be blank for them).
3. **Schedule** — send everyone **On send**, or create schedule groups with their own date and time and move recipients into them. **Schedule by date tag** spreads a send across a date field on your records, such as a birthday.
4. **Send info** — confirm the **Subject**, **Display name**, and **Mailing address**. The **From email** is filled in from your verified sending domain.

Click **Send**, review the summary under **Ready to send?**, and click **Send now**. Keep the tab open until the progress bar finishes.

Please send only to constituents who have agreed to hear from you by email.

## Sending addresses and your domain

Send is designed to deliver from your own domain, so messages arrive from an address your donors recognize and inbox providers can verify. Until your domain is verified, messages fall back to a shared Storyraise address. To connect your domain, see [Setting up a custom sending domain](../account-and-settings/custom-sending-domain.md). If your domain has no DMARC record (or more than one), Send shows a warning on the Send info step — add or fix it before large sends.

## Good to know

- **Schedule ahead.** You can send right away or schedule groups of recipients for any future date and time.
- **Unsubscribes are handled for you.** Every email includes an unsubscribe link, and people who opt out are suppressed from future sends.
- **Delivery status, not opens.** Open **Sent campaigns** to see each recipient's status: **Delivered**, **Processing**, **Failed**, or **Unsubscribed**, with a resend option for failures. Email **open and click tracking aren't available** — to measure engagement, link to a report and use its [Analytics](understanding-report-metrics.md), where personalized links attribute each open to its constituent.

## Tips

- **Subject lines are personal too.** `Your 2026 impact, @@first_name@@` outperforms a generic subject.
- **Send yourself a test.** Use **Add a recipient** to add your own email, send to just yourself, and check the real message in your inbox before the full send.
- **Mind your data gaps.** A recipient missing the field a merge tag uses gets an awkward blank — preview a handful of recipients with the least-complete records first.
