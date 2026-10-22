---
title: Analytics exclusion
section: Sharing & Analytics
status: draft
keywords: exclude, exclusion, internal views, team views, team link, nr, no record, board, partner, proofing, sending to my team
last_reviewed: 2026-10-22
---

# Analytics exclusion

Your report analytics should reflect your real audience, the constituents you're trying to reach, and not your own team clicking through to proofread. To keep internal visits out of your numbers, share the report with a **team link**.

## The team link

A team link is your report's normal link with `/nr` on the end:

```
https://your-org.yearly.report/your-report/nr
```

Visits through a team link are never counted. It opens the same published report, so anyone can use it to read, check, or present the report, including board members, partners, and consultants who don't use Storyraise.

A team link covers only its own report. If you follow a link from it to another of your reports, that visit is recorded as usual.

## Where to find it

Storyraise puts the team link next to everywhere you copy a report link. It's labeled **Team link** with an **Excluded from analytics** tag:

- **Share** in the builder, under **Team link**. Click **Copy team link**.
- **Report settings** in the builder.
- **The *Your report is live!* page** that opens after you publish. Its **View report** button also opens the report without counting your visit.
- **View Link** in a published report's menu on the dashboard. It opens the team link, so checking your own report from the dashboard is never counted.

Links Storyraise posts to your team, such as **Report Published** notices in Slack, are team links too.

## Personalized team links

Sometimes a teammate needs to see a report as a particular constituent sees it. Wherever Storyraise builds a [personalized link](personalized-links.md), it offers a tickbox: **Sending to my team, so their visits won't count**. You'll find it in:

- **Share** on a personalized report, under the platform link.
- **Send in an email** in a published report's dashboard menu.
- **Get personalized link** on the *Your report is live!* page.

Tick it and the link gains `/nr`. **Leave it unticked for any link going to your constituents or audience**, or their visits won't be counted either.

To build one by hand, put `/nr` right after the report name and before `?for=`:

```
# ✅ Correct: /nr comes straight after the report name
https://your-org.yearly.report/your-report/nr?for=maria@example.com

# ❌ Incorrect: /nr after ?for= is read as part of the email, and the visit is counted
https://your-org.yearly.report/your-report?for=maria@example.com/nr
```

[Preview as a Constituent](proofing-personalized-reports.md) under **Tools** already opens reports this way, so proofing there is never counted.

## Related

- [Analytics overview](analytics-overview.md): where your numbers live and how fresh they are.
- [Tracking engagement](tracking-engagement.md): what's recorded on every published report.
- [Personalized links](personalized-links.md): the `?for=` parameter and how it identifies readers.
- [Proofing a personalized report](proofing-personalized-reports.md): checking a report before a big send.
