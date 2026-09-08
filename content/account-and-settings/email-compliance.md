---
title: Email compliance and deliverability
section: Account & Settings
keywords: dmarc, spf, dkim, unsubscribe, can-spam, deliverability, spam, bounce, suppression, from address, reply-to, sender reputation
status: draft
last_reviewed: 2026-09-08
---

# Email compliance and deliverability

If you send donor communications from your own domain through Storyraise, two things matter: that the mail arrives, and that it meets the rules for commercial and nonprofit bulk email.

Set up your domain first — see [Custom sending domain](custom-sending-domain.md).

## Authentication: SPF, DKIM, and DMARC

[Custom sending domain](custom-sending-domain.md) covers the SPF and DKIM records Storyraise needs. Two things that page doesn't say, and that commonly break a setup:

**A domain can only have one SPF record.** If your domain already publishes SPF for Google Workspace or Microsoft 365, you must *merge* Storyraise's include into the existing record, not add a second TXT record. Two SPF records is a hard failure — mail from both senders starts failing checks.

**If you publish DMARC, alignment matters.** If your organization has a DMARC policy at `p=quarantine` or `p=reject`, mail sent through Storyraise must align on SPF or DKIM to pass. Sending from a subdomain that inherits your organizational DMARC policy is the usual arrangement. Check your policy before your first send rather than after, and consider monitoring DMARC reports around a large send.

If you don't publish DMARC at all today, sending from a dedicated subdomain keeps this send stream separate from your main corporate mail — which is the point of using a subdomain.

<!-- TEAM REVIEW: DMARC appears nowhere in the knowledge base. Confirm the
     recommended DMARC posture for a Storyraise sending subdomain and add the
     record to the DNS table in custom-sending-domain.md, alongside SPF and DKIM.
     Also confirm whether the MX record on the sending subdomain affects an
     organization's existing mail routing — customers ask, and the honest answer
     ("no, records are on the subdomain") should be stated explicitly. -->

## Unsubscribe

Every bulk donor communication needs a working way out. Include an unsubscribe footer in donor updates — see [Custom sending domain](custom-sending-domain.md).

<!-- TEAM REVIEW: "make sure donor updates include an unsubscribe footer" is
     currently the entire treatment of unsubscribe in the knowledge base, and it
     places the obligation on the customer without describing a mechanism. Before
     this page is complete we need to know:
       1. Is there a suppression list, and does Storyraise honour it automatically
          on subsequent sends?
       2. Is a List-Unsubscribe header added?
       3. Is there an unsubscribe link merge tag or footer block, or must the
          author build one?
       4. What happens to bounces and spam complaints — are those addresses
          suppressed?
     If the answer to any of these is "the customer handles it", say so plainly
     here so organizations can decide whether to send from Storyraise at all. -->

## What the law requires

Not legal advice, but the requirements that catch nonprofits out most often:

- **A working unsubscribe** that is honoured promptly — ten business days under CAN-SPAM, and immediately in practice.
- **A physical postal address** for your organization in the message.
- **Accurate headers and subject lines.** The From name, From address, and subject must not mislead about who is writing or what the message is.
- **No sending to someone who has opted out**, including via a freshly imported list. Re-importing a list does not reset an opt-out. See [Data governance and CRM flags](../crm-and-data/data-governance.md).

Requirements differ outside the US — GDPR and PECR in Europe, CASL in Canada — and are generally stricter about prior consent. If you mail internationally, check with whoever advises your organization.

## From name, From address, and Reply-to

- **From name:** your organization's name as donors know it, not an individual they don't recognize.
- **From address:** on your verified sending domain. Consistency across sends builds sender reputation; changing it frequently damages it.
- **Reply-to:** a monitored mailbox. Donors reply to stewardship email far more than to marketing email, and a reply that bounces or vanishes is a worse outcome than a lower open rate.

## Protecting deliverability

- **Send to people who know you.** The single biggest driver of deliverability is engagement. A clean list of engaged donors outperforms a large stale one.
- **Clean out hard bounces.** Repeatedly mailing dead addresses damages your sending reputation.
- **Warm up a new domain.** A brand-new sending subdomain that suddenly sends 40,000 messages looks exactly like a compromised domain. Start with smaller, engaged segments.
- **Test before the real send.** See [Email distribution](../distribution-and-engagement/email-distribution.md).
- **Watch what happens after.** Note that Storyraise does not currently provide email open and click tracking, so deliverability signals will come from your own domain monitoring rather than from Storyraise reporting.

## Related

- [Custom sending domain](custom-sending-domain.md) — DNS setup
- [Email distribution](../distribution-and-engagement/email-distribution.md) — sending a report
- [SMS distribution](../distribution-and-engagement/sms-distribution.md) — consent rules for text
