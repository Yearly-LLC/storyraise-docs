---
title: Email compliance and deliverability
section: Account & Settings
keywords: dmarc, spf, dkim, unsubscribe, can-spam, deliverability, spam, bounce, suppression, from address, reply-to, sender reputation
status: draft
last_reviewed: 2026-10-15
---

# Email compliance and deliverability

If you send donor communications from your own domain through Storyraise, two things matter: that the mail arrives, and that it meets the rules for commercial and nonprofit bulk email.

Set up your domain first — see [Custom sending domain](custom-sending-domain.md).

## Authentication: SPF, DKIM, and DMARC

[Custom sending domain](custom-sending-domain.md) walks through the records Storyraise Send asks you to add: two DKIM records and an SPF (return address) record, all CNAMEs, plus a DMARC TXT record if your domain doesn't already have one. Two things that commonly trip people up:

**You don't need to edit your existing SPF record.** Storyraise's SPF record is a CNAME on its own host, not a change to the SPF TXT record your domain already publishes for Google Workspace or Microsoft 365. Add the records exactly as shown and leave your existing SPF alone. Because the records sit on their own hosts, they don't change how your existing email is routed.

**A domain can only have one DMARC record.** If your domain already publishes DMARC, keep it and skip the one Storyraise suggests — two DMARC records are treated as none. The setup checks for an existing record and marks it **Already set up**. If your policy is `p=quarantine` or `p=reject`, check before your first large send that the setup shows every record as verified. Sending works without DMARC, but Gmail and Yahoo may filter bulk mail from domains that don't publish one.

## Unsubscribe

Storyraise Send handles unsubscribes for you:

- **Every email includes an unsubscribe link.** The footer of each message has **Unsubscribe** and **Manage preferences** links.
- **Unsubscribes are honored automatically.** Once someone unsubscribes using those links, Storyraise doesn't email them from your organization again.
- **Bring your past opt-outs.** If you sent from the same address with another tool, import that tool's unsubscribe list during setup or later from the Email page in Send. See [Custom sending domain](custom-sending-domain.md). Importing it is your organization's responsibility.

<!-- TEAM REVIEW: still unconfirmed for this page: (1) whether a List-Unsubscribe header is sent (SendGrid ASM group is attached to every message: storyraise-mail stepper functions/index.js asmBlock ~241-330, 1514); (2) whether hard bounces and spam complaints are suppressed on later sends (SendGrid event webhook records bounce/spam_report, index.js ~4086, but no suppression logic was checked). Answer before stating either here. -->

## What the law requires

Not legal advice, but the requirements that catch nonprofits out most often:

- **A working unsubscribe** that is honoured promptly — ten business days under CAN-SPAM, and immediately in practice.
- **A physical postal address** for your organization in the message. Storyraise Send asks for a **Mailing address** before you send and adds it to the email footer.
- **Accurate headers and subject lines.** The From name, From address, and subject must not mislead about who is writing or what the message is.
- **No sending to someone who has opted out**, including via a freshly imported list. Re-importing a list does not reset an opt-out. See [Data governance and CRM flags](../crm-and-data/data-governance.md).

Requirements differ outside the US — GDPR and PECR in Europe, CASL in Canada — and are generally stricter about prior consent. If you mail internationally, check with whoever advises your organization.

## From name, From address, and Reply-to

- **From name:** your organization's name as donors know it, not an individual they don't recognize.
- **From address:** the existing address you verified in Send. Consistency across sends builds sender reputation; changing it frequently damages it.
- **Reply-to:** a monitored mailbox. Donors reply to stewardship email far more than to marketing email, and a reply that bounces or vanishes is a worse outcome than a lower open rate.

## Protecting deliverability

- **Send to people who know you.** The single biggest driver of deliverability is engagement. A clean list of engaged donors outperforms a large stale one.
- **Clean out hard bounces.** Repeatedly mailing dead addresses damages your sending reputation.
- **Start with an address that already sends.** Send uses an address your organization already sends from, because a brand-new address that suddenly sends 40,000 messages looks exactly like a compromised one. If you do start fresh, begin with smaller, engaged segments.
- **Test before the real send.** See [Email distribution](../distribution-and-engagement/email-distribution.md).
- **Watch what happens after.** Note that Storyraise does not currently provide email open and click tracking, so deliverability signals will come from your own domain monitoring rather than from Storyraise reporting.

## Related

- [Custom sending domain](custom-sending-domain.md) — DNS setup
- [Email distribution](../distribution-and-engagement/email-distribution.md) — sending a report
- [SMS distribution](../distribution-and-engagement/sms-distribution.md) — consent rules for text
