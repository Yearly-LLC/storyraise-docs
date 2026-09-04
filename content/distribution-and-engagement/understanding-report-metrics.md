---
title: Understanding report metrics
section: Distribution & Engagement
status: draft
keywords: opens, unique visitors, return visitors, average time spent, section retention, reader flow, clicks, engagement score, stars, intent badges, heatmap, regions
last_reviewed: 2026-09-04
---

# Understanding report metrics

Once your report is published and shared, open it and select **Analytics** to see how it's performing. This page walks through every metric you'll find there — what it tells you, why it matters, and what to do about it.

<!-- TEAM REVIEW: this page documents the new Analytics UI (insights_ui branch, pending merge). Verify metric names and availability against the shipped UI before publishing. -->
<!-- TEAM REVIEW: the previous version of this page documented headline metrics "Constituents Reached", "Avg. Sections Viewed" and "Avg. Time per Section". None appear in the new copy, so they've been dropped in favour of Unique/Return Visitors and Average Time Spent. Confirm they're gone from the UI — if any survive, they need a section here. -->

## Two views: The Numbers and The Story

Analytics has two tabs:

- **The Numbers** — every metric, chart, and list, for when you want the detail. That's what the rest of this page covers.
- **The Story** — a plain-English PDF summary of your report's performance, including key takeaways, people worth contacting, and recommendations for next steps. Ready to read aloud in a staff meeting or export for your board.

## Opens

**What it tells you:** How much total reading activity your report generated. One reader can create more than one open by returning for another visit — Opens measures activity, not people.

**Why it matters:** Opens is the clearest read on whether your *distribution* worked. Email, social media, QR codes, direct mail — this is the number that tells you people arrived.

**What to do next:** Compare Opens with the size of the audience you reached. If activity is lower than expected, the report probably isn't the problem — revisit the subject line, the message, the timing, or the distribution plan.

## Unique and Return Visitors

**What it tells you:** **Unique Visitors** is how many distinct readers your report reached. **Return Visitors** is how many of them came back for another look.

**Why it matters:** A return visit is one of the strongest signals you get. Someone came back to finish reading, to revisit a story, to show it to a colleague, or to consider taking action.

**What to do next:** When you use [personalized links](personalized-links.md), you can identify returning constituents by name — and a returning constituent is a good reason for a timely email or phone call.

**Keep in mind:**

- **Visitors are identified by device.** One person reading on a phone and again on a laptop may count as two visitors; two people sharing one device may count as one.
- **Strict privacy settings and ad blockers** can affect how returning readers are recognized.
- **A visit is recorded after the reader leaves.** If someone closes their laptop mid-read or gets interrupted, that session may not be fully captured.
- **Don't panic at a low return rate on a short piece.** A one-page thank-you is *supposed* to be read once.

> **Tip:** Keep your own team out of these numbers. Signed-in teammates are excluded automatically, and you can add individual staff addresses or your whole email domain — see [Analytics exclusion](analytics-exclusion.md).

## Average Time Spent

**What it tells you:** Whether readers are spending meaningful time with your report or scanning it quickly. This is a reader's *total* time across all of their visits, not per visit.

**Why it matters:** The number only means something next to your report's length. If your report takes six minutes to read and the average reader spends 40 seconds, they're skimming headlines, not engaging.

**What to do next:** If readers move through quickly, front-load your impact, shorten the opening letter, and break up longer sections.

**Keep in mind:** More time is not always better. A long time on a form or donation page may signal confusion rather than enthusiasm. Read this metric alongside Percentage of Report Read, Return Visitors, and Reader Flow for a fuller picture.

<!-- TEAM REVIEW: "Percentage of Report Read" is referenced in the new copy but never defined. Confirm whether it appears as a named metric in the UI and how it's calculated. -->

## Section Retention and Reader Flow

**What it tells you:** How readers move through your report, which sections hold attention, and where visits end. Each square is a section (bigger means more readers), ribbons show the flow to the next section, and the red edge marks where visits stopped.

**Why it matters:** You can see where your storytelling is working — and where readers lose interest. If half your readers leave after section three, section three is where to tighten.

**What to do next:** Use those patterns to improve the order, length, and placement of content in your next report. A strong section buried late may deserve a more prominent spot.

## Where the Clicks Go

**What it tells you:** Whether readers took action, and what kind — grouped into **Donate**, **Get Involved**, **Contact**, **Watch**, **Social**, and **Documents**.

**Why it matters:** Reading shows attention. Clicking shows intent.

**What to do next:** Let the click category guide the follow-up. A Donate click may call for a fundraising conversation; a Get Involved click is an opening to share upcoming ways to participate. See [Acting on analytics](acting-on-analytics.md).

## When and Where They Visit

**What it tells you:** When people read your report — shown in your organization's timezone — and the approximate geographic areas the engagement came from. The **Visits Over Time** trend chart follows the same range.

**Why it matters:** Timing patterns help you choose stronger send times, and geographic patterns can uncover unexpected pockets of interest: alumni, relocated donors, a board member's extended network. Your audience may surprise you — weekday evenings and Sunday afternoons are common reading periods, even though they sit outside traditional email-marketing guidance.

Sessions are bucketed by weekday and time of day, so "Evening" means evening where *you* are:

| Band | Hours |
| :- | :- |
| Morning | 6 to 11am |
| Midday | 11am to 3pm |
| Afternoon | 3 to 6pm |
| Evening | 6pm to midnight |
| Overnight | Midnight to 6am |

The window starts at the report's first publish.

**What to do next:** Look for patterns across several weeks or months rather than reacting to one day. Use timing trends to schedule future sends, and geographic clusters to identify opportunities for regional events, local volunteer groups, or targeted outreach.

**Keep in mind:** Location data is approximate. Internet providers, mobile networks, corporate networks, and VPNs all affect city-level accuracy, so focus on broader regional patterns rather than individual cities.

## Most Engaged Constituents (personalized reports only)

**What it tells you:** Which *named* readers stood out on this specific report, based on attention, depth, and action. Storyraise gives each a one- to three-star **Engagement Score** and may add intent badges for actions like clicking a donation link.

This list only appears when readers arrive through [personalized links](personalized-links.md). A report shared with a plain public link records all the same activity, but there are no names to attach it to — so no stars, no badges, and no constituent list.

**Why it matters:** These signals help you prioritize timely, personal outreach.

**What to do next:** Treat highly engaged readers as a stewardship call list — but use the score alongside what you already know about each constituent. Stars reflect engagement with *one report*, not a person's overall value or relationship with your organization.

### The Storyraise Engagement Score

A 0 to 3 star rating, applied to identified constituents only. The benchmark is the **median reading time among identified constituents on that report** — so the score is always relative to how everyone else read that same piece.

| Rating | Name | Earned when |
| :- | :- | :- |
| 0 stars | None | Below the median reading time for this report. Not a bad reader — just not a standout on this piece. |
| ★ | Attention | Total reading time is above the median for this report. |
| ★★ | Depth | Above median, *and* got through at least half the report. For a multi-section report that means at least half the sections opened; for a single-section report it's measured by sustained reading time. |
| ★★★ | Intent | Above median, at least half the report consumed, *and* a follow-up action such as a link click or a return visit. |

<!-- TEAM REVIEW: the copy doc leaves the 3-star tier unnamed. Using "Intent" per the previous version of this page. Confirm the label shown in the UI. -->

**Intent badges are awarded independently of stars.** A reader who spent ten seconds but clicked "Donate Now" still shows a Donation badge. That's deliberate: a meaningful action is never hidden behind a time threshold. Badges include **Clicked Donation CTA**, **Clicked Event RSVP**, **Clicked Volunteer**, **Watched YouTube**, and **Revisited Report**.

## Ask the AI assistant

Below the metrics, the AI assistant answers questions about your report's performance in plain language. Try:

- *"Which cities had the highest engagement?"*
- *"Which constituents viewed the most?"*
- *"What section got the most views?"*
- *"Give me a detailed summary of the report's performance."*

## A note on what the numbers don't include

Your own team's views are automatically excluded, so these metrics reflect your real audience — see [Analytics exclusion](analytics-exclusion.md).

If you're looking at a report first published before late May 2026, expect a smaller set of metrics: see [Analytics for older reports](analytics-for-older-reports.md).

## Related

- [Analytics overview](analytics-overview.md) — the Home tab, data freshness, and what changed.
- [Acting on analytics](acting-on-analytics.md) — turning these numbers into follow-up.
- [Tracking engagement](tracking-engagement.md) — what's recorded, and what the numbers can't see.
- [Personalized links](personalized-links.md) — how readers get names attached to their activity.
