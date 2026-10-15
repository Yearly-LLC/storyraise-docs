---
title: Setting up your email sending subdomain
section: Account & Settings
status: draft
keywords: email, dns, subdomain, spf, dkim, sending, domain, records, cloudflare, godaddy
last_reviewed: 2026-10-15
---

# Setting up your email sending subdomain

Email sending setup is now self-service, and you no longer need a separate sending subdomain. Storyraise Send sends from the address your organization already uses (for example `giving@yourdomain.org`), and you add and verify the DNS records yourself in a short three-step setup.

> **Setting up a subdomain for a portal instead?** Hosting a Storyraise portal at your own web address uses different records. See [Setting up a custom subdomain for your portal](custom-portal-subdomain.md).

## How it works now

1. **Your existing address** — enter the address you send from today, and bring over your unsubscribe list from your previous email tool.
2. **Add DNS records** — Storyraise shows the records to add at your domain provider (DKIM, SPF, and a DMARC record if you don't have one), with copy buttons and a message you can forward to your IT team.
3. **Verify** — click **Check DNS records** and Storyraise confirms each one.

For the full walkthrough, see [Setting up a custom sending domain](custom-sending-domain.md).

## Prefer a hand?

If you'd rather we walk through it with you, or you need to move a verified organization to a different domain, contact [our support team](https://storyraise.com/support).

<!-- TEAM REVIEW: this page used to document a concierge process (customer picks email./messages. subdomain, Storyraise generates records). Send's live wizard (storyraise-mail stepper public/channels/email.html) only accepts an existing address and authenticates the domain after the @ — "there is deliberately no noreply@ or new domain path". Kept as a pointer because build.js redirects /docs/email-subdomain-setup/ here; consider retiring it in favor of custom-sending-domain.md. Also confirm orgs set up under the old concierge process on a subdomain keep working unchanged. -->
