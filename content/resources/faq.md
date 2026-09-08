---
title: Frequently asked questions
keywords: pdf, print, board, questions, help, troubleshooting
section: Best Practices & Reference
status: draft
last_reviewed: 2026-09-04
---

# Frequently asked questions

Quick answers to the questions we hear most. Each links to a fuller guide.

## Reports

**Do my readers need a Storyraise account?**
No. Published reports are regular web pages — readers just open the link on any device. No login, app, or download.

**Can I edit a report after publishing?**
Yes. Keep editing in the builder; your changes stay private until you click **Republish**. Readers always see the last published version. See [Publishing and sharing](../getting-started/publishing-and-sharing.md).

**What does my report's link look like?**
`https://your-organization.yearly.report/your-report` — based on your organization and the report's title.

**Can I put a report on my own website?**
Yes — the Share menu provides embed code (standard and fullscreen iframe variants). See [Sharing reports](../distribution-and-engagement/sharing-reports.md). Embedding somewhere with accessibility requirements? See [Accessibility at Storyraise](accessibility.md).

**Is Storyraise accessible / does it meet WCAG?**
Reports include built-in accessibility features, and how you build a report affects its accessibility too. See [Accessibility at Storyraise](accessibility.md) for what's built in, authoring guidance, and how to request a formal accessibility statement or VPAT.

**Can I get a PDF of my report?**
Yes. **Get PDF** in the Share menu provides a PDF of a published report. Each block becomes its own page in the export — see [Sharing reports](../distribution-and-engagement/sharing-reports.md).

**The builder keeps logging me out, or a report won't load images and fonts on our network. Why?**
This is almost always a strict firewall or content-inspection proxy — common on school, hospital, and corporate networks — blocking the services Storyraise relies on. Test it in 30 seconds by opening the link on your phone over cellular: if it works there, it's the network. See [Network requirements and troubleshooting](network-requirements.md) for the exact allowlist to give your IT team.

## Constituents and personalization

**Which CRMs does Storyraise connect to?**
A lot of them — through the [Connections tab](../crm-and-data/connections-overview.md): Raiser's Edge NXT, Bloomerang, Salesforce, Virtuous, CiviCRM, Slate, Ellucian, Little Green Light, DonorPerfect, and Neon CRM, plus giving platforms (Givebutter, Donorbox, Fundraise Up) and Mailchimp. Anything else works via CSV export/import. See [Supported integrations](../crm-and-data/supported-integrations.md).

**How does personalization work?**
Add merge tags like `@@first_name@@` to your report, then share each constituent's personalized link (their email appended as `?for=`). Their data fills in when they open it. See [Personalized links](../distribution-and-engagement/personalized-links.md).

**Why is a merge tag showing up blank?**
That constituent is missing the field. Check their record in your Constituents list and fill the gap in your CRM or CSV, then re-sync. See [Troubleshooting sync issues](../crm-and-data/troubleshooting-sync-issues.md).

**Does Storyraise change data in my CRM?**
Not unless you ask it to. Every integration is read-only by default — Storyraise pulls constituent records in and doesn't write back. The one exception is [Salesforce](../crm-and-data/integrations/salesforce.md), which offers optional engagement write-back: when you enable it, Storyraise can log a completed Activity (Task) on a Contact or update custom fields you map. It stays off until you configure it.

## Analytics

**Why are my numbers lower than last year?**
They're more accurate. The old counter included repeat page loads from the same person; the new one counts people. Nothing about your performance changed. See [Analytics overview](../distribution-and-engagement/analytics-overview.md).

**Why does my older report look empty?**
It was published before the new engine and only ever recorded a running total. Open **The Story** tab, which is written for exactly this case. See [Analytics for older reports](../distribution-and-engagement/analytics-for-older-reports.md), and contact support if you'd like us to look at recovering more.

**Can I see exactly who opened my report?**
Only for constituents who opened a personalized link — they appear by name. Visitors using the public link are counted but stay anonymous. See [Personalized links](../distribution-and-engagement/personalized-links.md).

**Do my own team's views count in report metrics?**
No. Views from your organization's team members are automatically excluded — even when staff open a constituent's personalized link to check it. If teammates are still showing up, add their addresses or your whole domain under **Account**. See [Analytics exclusion](../distribution-and-engagement/analytics-exclusion.md).

**I opened my own report to test it and nothing happened.**
That's correct — your own views aren't recorded.

**How fresh is the data?**
A report's Analytics tab is near-live. Home tab cards refresh overnight, covering activity through the previous night.

**What do the stars mean?**
How much attention someone gave *this report* compared with everyone else who read it. One star is above-average reading time; two stars means they also read half of it; three stars means they also took an action. See [Understanding report metrics](../distribution-and-engagement/understanding-report-metrics.md).

## Account and team

**Can my colleagues work on reports with me?**
Yes — invite them to your organization with an invite link. Sections lock while a teammate edits them, so you won't overwrite each other. See [User roles and permissions](../getting-started/user-roles-and-permissions.md).

**Who can see my drafts and data?**
Only members of your organization. Publishing exposes the report itself at its public link — never your dashboard, drafts, or constituent data.

## Still have a question?

[Contact our support team](https://storyraise.com/support) — we're happy to help.
