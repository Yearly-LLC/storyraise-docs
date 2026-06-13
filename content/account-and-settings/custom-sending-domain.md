---
title: Setting up a custom sending domain
section: Account & Settings
status: draft
keywords: dns, spf, dkim, cname, deliverability, godaddy, cloudflare, from address
last_reviewed: 2026-06-12
---

# Setting up a custom sending domain

When you send email through Storyraise, verifying your own sending domain makes your messages come clearly from your organization — and helps them reach the inbox instead of the spam folder. This guide walks through the setup wizard.

<!-- TEAM REVIEW: confirm whether the self-service domain wizard (public/domains/) is enabled for customers, or whether the team still handles domain setup manually. Adjust this page to match the live flow before publishing. -->

## Why verify a domain?

Inbox providers (Gmail, Outlook, and the rest) trust messages more when the sending domain proves the sender is who they claim to be. Verifying your domain:

- Makes emails clearly come **from your organization**, not a generic address.
- Improves deliverability so updates actually reach donors.
- Brands the tracking links in your emails with your own domain.

You'll set up DNS records — small, safe entries at your domain host. **This does not affect your website.**

## What you'll need

- The domain you'll send from (e.g. `example.org` — you'll send from something like `updates@example.org`).
- Access to your domain's DNS settings (at GoDaddy, Cloudflare, Squarespace, or wherever your domain is managed). Not technical? You can forward the records to whoever manages your DNS.

## The four steps

### 1. Verify your sending domain

Enter your organization identifier and your **sending domain**. Storyraise prepares the records your domain will need.

### 2. Add DNS records

Storyraise shows a table of DNS records to add — typically CNAME, MX, and TXT entries covering:

- **SPF** — authorizes Storyraise to send on your behalf.
- **DKIM** — cryptographically signs your mail so it's trusted.
- **Tracking** — brands the links in your emails with your domain.

Each row has **Copy host** and **Copy value** buttons. Log in to your domain host and add each record exactly as shown.

> **DNS changes can take a few minutes to a few hours to take effect.** That's normal — you can move on and check back.

### 3. Verify setup

Once you've added the records, click **Check verification**. Storyraise looks up your DNS and confirms which records it can see, marking each **Verified** or still **Missing**. If something's missing, double-check that record at your host and check again.

### 4. You're ready to send

When everything verifies, you'll see **You're ready to send** — emails will now come from your domain. From here, set up your **From** address and make sure donor updates include an unsubscribe footer.

## Tips

- **Copy, don't retype.** DNS values are long and unforgiving — use the copy buttons.
- **Hand it to IT if you're unsure.** Forwarding the records page to your web person is a perfectly normal step.
- **Be patient with verification.** If a record doesn't verify immediately, wait a bit and re-check before assuming it's wrong.

## Related

- [Email distribution](../distribution-and-engagement/email-distribution.md)
- [Organization settings](organization-settings.md)
