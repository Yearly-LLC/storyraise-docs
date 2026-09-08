---
title: PDF and print
section: Sharing & Analytics
keywords: pdf, print, get pdf, board packet, board meeting, download, attachment, mail, printer
status: draft
last_reviewed: 2026-09-08
---

# PDF and print

Storyraise reports are built for the web, but plenty of situations still need a file: a board packet, an email attachment, a printed piece for an event, a grant appendix.

## Getting the PDF

**Get PDF** in the Share menu produces a PDF of a report — see [Sharing reports](sharing-reports.md).

> **You have to publish first.** Get PDF works on a *published* report. If you're preparing something for a board meeting, publish it before the meeting — you can [hide it from search engines](../getting-started/publishing-and-sharing.md) so it isn't indexed while still having a link and a PDF.

## One block, one page

When a report exports, **each block becomes its own page** in the PDF.

That single rule is the whole trick to a good printed version. When you're planning something that will be printed, think of a block as a page:

- A block holding one big statement makes a strong page. A block holding three unrelated things makes a cluttered one.
- Very long blocks — a donor list with 400 names, a long story — will run past a single page. Split them into several blocks if you want control over where the breaks land.
- Blocks you added purely for web rhythm (a thin spacer, a decorative divider) become their own near-empty pages. Remove them from a print-bound version.

## If print matters, make a print version

The cleanest approach is usually to duplicate the report and adapt the copy rather than trying to make one report perfect in both places:

1. Duplicate the published report.
2. Remove anything that only works on the web — polls, embedded forms, video, anything with a hover or a click.
3. Replace "click here to give" style calls to action with something a reader can act on from paper: a short URL, a QR code, a reply address.
4. Split or merge blocks so the page breaks fall where you want them.
5. Publish, then Get PDF.

## Before you send it to a printer

- Open the PDF and read every page — the export is where spacing problems become visible.
- Check that images still look sharp at full page size. See [Image sizes and dimensions](../building-reports/image-sizes-and-dimensions.md).
- Check the donor list carefully. Names are the thing people notice.
- Anything interactive is inert on paper. Make sure nothing important lived only in a poll or a form.

## What a PDF doesn't do

- **No analytics.** A PDF that's emailed around tells you nothing about who read it. If you want to know that, share the link and use [tracking](tracking-engagement.md).
- **No personalization.** Merge tags render for whoever the export was made as, not per recipient. For each donor to see their own name, use [personalized links](personalized-links.md).
- **No updates.** A PDF is a snapshot. Republishing the report doesn't change a PDF someone already downloaded.

<!-- TEAM REVIEW: three things this page states from other pages rather than from
     verified behaviour — confirm each:
       1. That Get PDF requires a published report (implied by faq.md, never stated).
       2. Whether report duplication exists on the dashboard and its exact menu
          label — using-templates.md carries the same open question.
       3. Whether the PDF is tagged for accessibility (reading order, alt text).
          A tagged PDF matters to any customer with a conformance obligation, and
          resources/accessibility.md is silent on the export. -->

## Related

- [Sharing reports](sharing-reports.md) — every way to distribute a report
- [Publishing and sharing](../getting-started/publishing-and-sharing.md) — publishing, republishing, and search visibility
- [Editing content](../building-reports/editing-content.md) — how blocks work
