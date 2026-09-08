---
title: Tracking engagement
section: Sharing & Analytics
status: draft
last_reviewed: 2026-09-04
---

# Tracking engagement

Every published Storyraise report quietly keeps score: who opened it, what they read, and what they did next. There's nothing to configure — tracking is built in from the moment you publish. This page explains what's recorded and how to get the most signal from it.

## What gets tracked

When someone views your published report, Storyraise records:

- **Opens** — each visit to the report, including return visits.
- **Unique and return visitors** — Storyraise separates *how many people* read from *how much reading happened*, so a reader who opens the report four times counts as one visitor with four opens.
- **Sections viewed** — which sections of the report each visitor reached, and the path they took between them.
- **Time spent** — how long visitors engage, totalled across all their visits.
- **Link clicks** — taps on donation buttons, event links, social links, and any other link in your report, grouped by what they mean: Donate, Get Involved, Contact, Watch, Social, and Documents.
- **Location** — the visitor's approximate region and city (never a precise address).
- **Device** — mobile or desktop, so you know how your audience actually reads.
- **Visit timing** — when people read, bucketed by weekday and time of day in your organization's timezone.

All of this feeds the **Analytics** tab of each published report — see [Understanding report metrics](understanding-report-metrics.md).

## Anonymous visitors vs. constituents

By default, a visitor is anonymous — you'll see the visit, its location, and reading behavior, but not a name.

The upgrade comes from [personalized links](personalized-links.md): when a constituent opens their `?for=` link, the visit is attributed to them by name. That's what powers the Most Engaged Constituents list, the star-rated Engagement Score, and Who's Been Reading on your Home tab — and it's why personalized links are worth the small extra effort for any mailing where you care who engaged.

Storyraise also recognizes return visits from the same device, so a constituent who opens their link on Tuesday and comes back Friday counts as one engaged person, not two strangers.

> **A forwarded personalized link is attributed to the original recipient.** If a board member forwards their link to a colleague, that colleague's reading shows up under the board member's name. Treat named engagement as a conversation starter, not proof of who did what.

## What the numbers can and can't see

Engagement tracking is good, not omniscient. A few things are worth knowing before you read too much into a single number:

- **Visitors are identified by device.** One person reading on a phone and again on a laptop may count as two visitors; two people sharing one device may count as one.
- **Privacy settings and ad blockers** can prevent Storyraise from recognizing a returning reader, so some return visits will be counted as new ones.
- **A visit is recorded once the reader leaves.** If someone closes their laptop mid-read or is interrupted, that session may not be fully captured — and someone reading right now won't appear yet.
- **Location is approximate.** Internet providers, mobile networks, corporate networks, and VPNs all affect city-level accuracy. Read regions, not cities.

None of this undermines the picture. It just means patterns across weeks are more trustworthy than any single day's figure.

## Your team doesn't pollute the numbers

Views from your own organization's team members are automatically recognized and excluded from report analytics — even when a staff member opens a constituent's personalized link to check it. Preview, proofread, and share internally as much as you like; your metrics reflect your real audience.

Need to share a published report internally with people *outside* your app team — a board member, a partner, a consultant? See [Analytics exclusion](analytics-exclusion.md) for how automatic exclusion works and how to exclude specific emails or domains.

## Engagement signals

Beyond raw views, Storyraise classifies what readers *do* into intent signals — actions like **Clicked Donation CTA**, **Clicked Event RSVP**, **Clicked Volunteer**, **Watched YouTube**, **Visited Facebook**, and **Revisited Report**. These signals feed each constituent's engagement score, helping you spot the people who didn't just read, but acted. See [Understanding report metrics](understanding-report-metrics.md).

Intent signals are awarded on their own merits, not on top of a reading-time threshold — a reader who spent ten seconds in the report but clicked your donation button still earns a Donation badge. A meaningful action is never hidden behind a time bar.

<!-- TEAM REVIEW: intent signals and time-spent metrics are part of the new Analytics UI (insights_ui branch, pending merge). Confirm availability before publishing. -->

## Getting better data

- **Use personalized links for mailings.** Anonymous links tell you *how many*; personalized links tell you *who*.
- **Give readers something to click.** Donation buttons, RSVP links, and video embeds turn passive reads into measurable intent.
- **Keep constituent emails current.** Attribution is matched through your constituent records — see [Importing constituent data](../crm-and-data/importing-constituent-data.md).

## What readers should know

Tracking is for understanding engagement, not surveillance: no precise locations are collected, and analytics are only visible to your organization. If your organization publishes a privacy policy covering communications, report engagement tracking is worth a line there.

## Related

- [Analytics overview](analytics-overview.md) — where to find all of this, and how fresh it is.
- [Understanding report metrics](understanding-report-metrics.md) — what each metric means.
- [Analytics exclusion](analytics-exclusion.md) — keeping internal views out of your numbers.
- [Acting on analytics](acting-on-analytics.md) — what to do with what you learn.
