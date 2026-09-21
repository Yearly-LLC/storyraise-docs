---
title: Setting up a custom subdomain for your portal
section: Account & Settings
status: draft
keywords: domain, subdomain, custom domain, web address, url, dns, a record, txt, cname, ssl, certificate, https, caa, cloudflare, godaddy, portal, donor portal, it team
last_reviewed: 2026-09-21
---

# Setting up a custom subdomain for your portal

Host your Storyraise portal at your own web address, such as portal.yourdomain.org, with a few DNS records your IT team adds once.

A custom subdomain puts your organization's name in the address bar, so donors land on a site they recognize and trust. We handle the hosting side, and your IT team adds the DNS records we send. Most setups finish within a few hours, and your current portal address keeps working the whole time.

> **Setting up email sending instead?** That uses a different subdomain and a different set of records. See [Setting up your email sending subdomain](email-subdomain-setup.md).

<!-- TEAM REVIEW: custom subdomains are currently set up by hand for hosted portals only. Published report links always use the organization's Storyraise URL. Confirm how customers request this (support email, account manager?) and name it in step 2. -->

## Before you start

You'll need:

- **Someone who can edit DNS for your domain.** Usually your IT team, or whoever manages your account with your domain provider (GoDaddy, Cloudflare, Network Solutions, and so on).
- **The subdomain you want to use.** See step 1.

## 1. Choose a subdomain

Pick a subdomain that isn't in use today. The portal takes over the whole hostname, so anything served there now will stop being reachable.

Common examples:

- `portal.yourdomain.org`
- `donors.yourdomain.org`
- `giving.yourdomain.org`

> **Tip:** Use a subdomain rather than your main domain (`yourdomain.org`) or `www`. Your main website stays exactly where it is.

## 2. We'll send you the DNS records

Send us the subdomain you chose. We register it in our system, which generates the records for your domain, and we send them to you. Expect two:

| Type | Host | What it does |
|---|---|---|
| TXT | Your subdomain | Confirms your organization owns the domain |
| A | Your subdomain | Points the subdomain at our system |

The values are unique to your setup. Wait for ours rather than copying values from another article or another customer.

## 3. Add the records

In your domain provider:

1. **Clear the hostname first.** Delete any existing A, AAAA, or CNAME records on the subdomain. A leftover record sends some visitors to the old destination and blocks the security certificate.
2. **Add the records exactly as we sent them.** Some providers want the full hostname (`portal.yourdomain.org`) in the Host field. Others add your domain automatically and want only the first part (`portal`). If you're not sure, check how your existing records are entered.
3. **Turn off proxying for the subdomain.** If you use Cloudflare, set the record to **DNS only** (gray cloud). Other CDNs and web application firewalls need the same exception. Our system has to reach the subdomain directly to issue and renew its certificate.
4. **Check your CAA records.** CAA records limit which certificate authorities can issue certificates for your domain. If your domain has them, add entries allowing `letsencrypt.org` and `pki.goog`. If it has none, skip this step.

> **Good to know:** Leave these records in place for as long as you use the subdomain. Our system checks them every time it renews the certificate, so removing them takes the portal offline.

## 4. Verification and certificate

Once the records are added, let us know. Our system confirms them and then issues an SSL certificate for your subdomain automatically, so the portal loads securely over `https://`. There's no certificate for you to buy, install, or renew.

DNS changes usually take effect within a few hours. Allow up to 24 hours before troubleshooting.

## 5. Go live

When the certificate is active, we switch your portal to the new address. Sign-in emails, invitations, and shared links all start using your subdomain.

Your original portal address keeps working, so links you've already sent don't break.

## If people sign in with your organization's accounts

If donors or staff sign in to the portal through your organization's identity provider (for example Auth0, Okta, or Microsoft Entra ID), that provider has to recognize the new address before sign-in works there.

We'll send two URLs for whoever manages your identity provider to add to the same application, alongside the entries already there:

- A **callback URL**, where people return after signing in
- A **logout URL**, where people land after signing out

Add them before we switch the portal over, so sign-in works the moment the new address goes live.

## Troubleshooting

**The subdomain shows the old site, or nothing at all.** DNS changes can take a few hours to reach everyone. If it's been more than 24 hours, check that no old A, AAAA, or CNAME record is left on the subdomain.

**The browser shows a certificate warning or says the site isn't secure.** The certificate is usually still being issued. If the warning lasts past 24 hours, check proxying (step 3.3) and CAA records (step 3.4). Those two cause nearly every certificate failure.

**Sign-in works at the old address but fails at the new one.** Your identity provider is missing the new callback URL. See **If people sign in with your organization's accounts** above.

## Related

- [Setting up your email sending subdomain](email-subdomain-setup.md)
- [Single sign-on (SSO)](single-sign-on.md)
- [Network requirements and troubleshooting](../resources/network-requirements.md)
