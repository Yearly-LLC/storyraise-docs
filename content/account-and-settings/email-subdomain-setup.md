---
title: Setting up your email sending subdomain
section: Account & Settings
status: draft
keywords: email, dns, subdomain, spf, dkim, sending, domain, records, cloudflare, godaddy
last_reviewed: 2026-06-12
---

# Setting up your email sending subdomain

To enable email sending from Storyraise, we'll walk through a quick 4-step process with you.

## 1. Choose a subdomain

First, decide on a subdomain to use for sending emails.

Common examples:

- `email.yourdomain.org`
- `messages.yourdomain.org`
- `updates.yourdomain.org`

> **Tip:** Pick something simple and brand-friendly. Most customers go with `email.` or `messages.`

## 2. We'll generate DNS records

Once you've chosen your subdomain, send it back to us. We will:

- Generate the required DNS records (SPF, DKIM, and tracking)
- Send you a list of records to add to your domain provider (GoDaddy, Cloudflare, etc.)

## 3. Add DNS records

After we send the records:

- Log into your domain provider
- Add the provided DNS records exactly as listed

> **Good to know:** DNS changes typically take a few minutes to a few hours to propagate.

## 4. Verification & go live

Once records are added:

- Let us know
- We'll verify everything is set up correctly
- Then activate email sending for your account

## Prefer self-service?

A self-service domain wizard — where you generate, add, and verify your DNS records without waiting on us — is described in [Setting up a custom sending domain](custom-sending-domain.md).

<!-- TEAM REVIEW: this page documents the current concierge process (migrated from the original standalone /docs/email-subdomain-setup/ page). Once the self-service wizard ships, merge this page into custom-sending-domain.md and retire one of the two. -->
