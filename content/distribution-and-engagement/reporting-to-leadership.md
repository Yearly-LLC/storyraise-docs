---
title: Reporting your numbers to leadership
section: Sharing & Analytics
keywords: export, board report, CMO, leadership, metrics, UTM, google analytics, GA4, data export, quarterly, comparison, benchmark
status: draft
last_reviewed: 2026-09-08
---

# Reporting your numbers to leadership

At some point someone asks for the numbers in a deck. This page covers what you can get out of Storyraise, what you can't, and how to build a defensible summary from what's available.

## What you can get out today

| You want | Available? | How |
|---|---|---|
| A narrative summary of a report's performance | **Yes** | **The Story** — a plain-English PDF summary. See [Analytics overview](analytics-overview.md) |
| Per-constituent engagement | **Yes, in the dashboard** | [Tracking engagement](tracking-engagement.md) |
| Poll results as data | **Yes** | CSV export from the poll — see [Adding a poll](../building-reports/adding-a-poll.md) |
| Form responses as data | **Yes** | CSV export from the collection — see [Managing responses](../storyraise-collect/managing-responses.md) |
| A raw analytics export (CSV of opens, sessions, engagement) | **No** | — |
| Email open and click rates | **No** | Not available; see [Email distribution](email-distribution.md) |
| Engagement written back to your CRM | **Salesforce only** | Optional write-back — see [Salesforce](../crm-and-data/integrations/salesforce.md) |

<!-- TEAM REVIEW: confirm the "No" rows. If any analytics export or API exists,
     it belongs at the top of this page — the absence of a data export is the
     single most common objection from marketing and advancement-services
     evaluators, and if it exists and is simply undocumented we are losing deals
     to a documentation gap. Also confirm whether UTM parameters can be appended
     to a report URL alongside ?for=, and whether a GA4 or GTM tag can be added
     to a published report; both are currently unanswered anywhere. -->

## Define your metrics before you present them

Numbers that aren't defined get challenged in the room. Two worth being precise about:

**Opens are activity, not people.** [Understanding report metrics](understanding-report-metrics.md) describes Opens as the clearest read on whether distribution worked — how many people arrived. It isn't a count of unique individuals, and visitors are identified by device, so one person on a phone and a laptop can appear twice.

**The Engagement Score is relative, not absolute.** It's benchmarked against the median reading time among identified constituents *on that report*. That makes it useful for ranking readers within one report and misleading if you compare it across reports or against last year — every report is scored against its own median. If you put it in a deck, say what it's relative to.

**Named engagement is a conversation starter, not proof.** A forwarded personalized link is attributed to the original recipient, so "Maria read it for six minutes" may mean Maria's colleague did. [Tracking engagement](tracking-engagement.md) is explicit about this, and it's better to say it yourself than have someone discover it later.

**Location is approximate.** Read regions, not cities.

## A quarterly summary that holds up

Built only from what's actually available:

1. **Reach** — Opens, with the caveat above stated once.
2. **Depth** — time spent and how far through the report people got, as a measure of whether the content held.
3. **Named engagement** — how many identified constituents engaged, and the list of who, for follow-up. This is the number that matters most to fundraising leadership and it's the one Storyraise is strongest on.
4. **Action** — clicks on your donate or contact calls to action.
5. **What you did about it** — who was followed up with and what happened. See [Acting on analytics](acting-on-analytics.md).

Point 5 is the one that changes the conversation. Most channel reporting stops at reach; this product's advantage is that it tells you which named people to call.

## What to say about channel attribution

Opens are not currently broken down by source, so you can't split "arrived from email" from "arrived from LinkedIn" inside Storyraise. If channel attribution matters to your leadership, either:

- Publish separate report links per channel so each has its own numbers, or
- Track the click side in the tools you already own — your email platform's click stats and your social scheduler's link stats — and treat Storyraise's numbers as what happened *after* the click.

## Related

- [Analytics overview](analytics-overview.md) — what the dashboard shows
- [Understanding report metrics](understanding-report-metrics.md) — what each number means
- [Acting on analytics](acting-on-analytics.md) — turning engagement into follow-up
- [Analytics exclusion](analytics-exclusion.md) — keeping your own team out of the numbers
