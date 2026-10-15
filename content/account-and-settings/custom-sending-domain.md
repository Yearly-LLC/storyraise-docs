---
title: Setting up a custom sending domain
section: Account & Settings
status: draft
keywords: dns, spf, dkim, dmarc, cname, deliverability, godaddy, cloudflare, from address, unsubscribe
last_reviewed: 2026-10-15
---

# Setting up a custom sending domain

When you send email through Storyraise Send, your messages go out from the email address your organization already uses — for example `giving@yourdomain.org` — so they keep the trust that address has built with inbox providers and donors. Connecting your domain lets inbox providers confirm the messages are genuinely from you. This guide walks through the email setup in Storyraise Send.

## Where to find it

Open **Storyraise Send** ([send.storyraise.com](https://send.storyraise.com/channels/)) and go to **Setup Sending**, then choose the **Email** card. If your organization hasn't set up email yet, sending a report from the builder takes you to this page automatically.

The setup has three steps: **Your existing address**, **Add DNS records**, and **Verify**.

## What you'll need

- **An address your organization already sends from**, on your organization's own domain. Ideally one with a history of sending mail. Personal addresses like Gmail or Outlook can't be used.
- **Access to your domain's DNS settings** (at GoDaddy, Cloudflare, Squarespace, or wherever your domain is managed). Not the person who manages DNS? You can forward the records to whoever does — see step 2.
- **Your unsubscribe list from your previous email tool**, if you've sent from this address before (Mailchimp, Constant Contact, and so on).

## 1. Your existing address

Enter the address you want your emails to come from. Storyraise shows **Your emails will send from** with the address, and connects that address's domain.

On the same step, **Bring your unsubscribe list with you**: import the unsubscribe export from your previous email tool (upload a CSV or paste addresses), or confirm you have no one to import. Laws like CAN-SPAM, CASL, and GDPR require you to honor opt-outs made before you switched tools. Imported addresses are added as soon as your domain is verified.

Tick the box confirming your organization is responsible for importing past unsubscribes, then click **Continue**.

## 2. Add DNS records

Storyraise shows a table of records to add at your DNS provider, with a **Copy** button for each host and value:

| What it does | Type |
|---|---|
| Signs your email (DKIM) — two records | CNAME |
| Return address (SPF) | CNAME |
| Inbox policy for your domain (DMARC) | TXT |

A few things to know:

- **Already have a DMARC record?** Keep it and skip ours — a domain with two DMARC records is treated as having none. Storyraise looks for an existing one and marks it **Already set up**.
- **Using Cloudflare?** Set each record's proxy status to **DNS only**. Proxied records stop verification from ever passing.
- **TTL:** if your provider asks, leave it at the default.
- **Not the person who manages DNS?** Click **Copy message** and send it to whoever does. It lists every record and needs no Storyraise access.

These records only authorize Storyraise's email provider to send for your domain. They don't affect your website or your existing email.

When you've added them, click **I've added the records**.

## 3. Verify

Click **Check DNS records**. Storyraise looks up each record and shows whether it's found. If some are still missing, it names the hosts it's waiting on — compare them against what's in your DNS, since a single character off is the usual cause.

> **DNS changes usually show up within 15 minutes, but can take up to 48 hours.** That's normal — you can come back and check again.

The DMARC record isn't required to send, but Gmail and Yahoo may filter bulk mail from domains without one, so add it before large sends.

Once verified, click **Done**. The Email page then shows your verified sending address, the status of each DNS record, and your imported unsubscribes.

## After you're set up

- **Leave the DNS records in place.** If they're removed, your email stops being authenticated and deliverability drops.
- **Unsubscribes are handled for you.** Every email includes **Unsubscribe** and **Manage preferences** links, and people who unsubscribe aren't emailed again. You can import more past unsubscribes from the Email page at any time.
- **Changing to a different domain** once you're verified would stop your email until new records are added, so contact [our support team](https://storyraise.com/support) and we'll move you across safely. Changing just the address on the same domain is self-service (**Change address**).

<!-- TEAM REVIEW: until a domain is verified, Send falls back to a shared noreply@message.storyraise.com address (storyraise-mail stepper functions/index.js getOrgSendGridConfig; memory reference_send_email_domains.md). Confirm whether to tell customers that, or whether sending is effectively blocked until setup (builder app.js:2846 routes unconfigured orgs to setup). Also: the dashboard's Donor Signals follow-up still links "Verify your sending domain" to the retired app.storyraise.com/domains/ wizard (builder public/index.html:5510); it should point at send.storyraise.com/channels/. -->

## Tips

- **Copy, don't retype.** DNS values are long and unforgiving — use the copy buttons.
- **Hand it to IT if you're unsure.** Forwarding the **Copy message** text to your web person is a perfectly normal step.
- **Be patient with verification.** If a record doesn't verify immediately, wait a bit and check again before assuming it's wrong.

## Related

- [Email compliance and deliverability](email-compliance.md)
- [Email distribution](../distribution-and-engagement/email-distribution.md)
- [Organization settings](organization-settings.md)
