---
title: PDF and print
section: Sharing & Analytics
keywords: pdf, print, get pdf, board packet, board meeting, download, attachment, mail, printer
status: draft
last_reviewed: 2026-10-15
---

# PDF and print

Storyraise reports are built for the web, but plenty of situations still need a file: a board packet, an email attachment, a printed piece for an event, a grant appendix.

## Getting the PDF

Open the PDF view of your report in either of two ways:

- In the builder, open **Preview** and choose **Open PDF preview**. This works before you publish.
- After publishing, click **Get PDF** in the **Share** menu or on the **Your report is live!** page — see [Sharing reports](sharing-reports.md).

The PDF view shows your report laid out page by page. Choose **Landscape** or **Portrait**, click **Open Print Dialog**, and save it from your browser's print dialog: choose **Save to PDF** as the destination, pick the paper size, set margins to **None**, and turn on **Print Backgrounds**. The on-screen **Download Instructions** walk through the same settings.

> **The PDF shows your latest saved edits, not necessarily what's published.** If you've changed the report since publishing, the PDF includes those changes. Republish if you want the web version and the PDF to match.

For a personalized report, choose a constituent under **Previewing as** before you print, or you'll get the generic version.

## One block, one page

When a report exports, **each block becomes its own page** in the PDF.

That single rule is the whole trick to a good printed version. When you're planning something that will be printed, think of a block as a page:

- A block holding one big statement makes a strong page. A block holding three unrelated things makes a cluttered one.
- Very long blocks — a donor list with 400 names, a long story — will run past a single page. Split them into several blocks if you want control over where the breaks land.
- Blocks you added purely for web rhythm (a thin spacer, a decorative divider) become their own near-empty pages. Select the block and set **Show on...** to **Digital Only** to keep it out of the PDF, or set a print-only block to **PDF Only**.

## If print matters, make a print version

For small differences, the **Show on...** setting is enough: mark web-only blocks **Digital Only** and print-only blocks **PDF Only**, and one report serves both. When the print piece needs to differ a lot, duplicate the report and adapt the copy rather than trying to make one report perfect in both places:

1. Duplicate the report (from its menu in the dashboard, choose **Duplicate**).
2. Remove anything that only works on the web — polls, embedded forms, video, anything with a hover or a click.
3. Replace "click here to give" style calls to action with something a reader can act on from paper: a short URL, a QR code, a reply address.
4. Split or merge blocks so the page breaks fall where you want them.
5. Open the PDF view and save the PDF.

## Before you send it to a printer

- Open the PDF and read every page — the export is where spacing problems become visible.
- Check that images still look sharp at full page size. See [Image sizes and dimensions](../building-reports/image-sizes-and-dimensions.md).
- Check the donor list carefully. Names are the thing people notice.
- Anything interactive is inert on paper. Make sure nothing important lived only in a poll or a form.

## What a PDF doesn't do

- **No analytics.** A PDF that's emailed around tells you nothing about who read it. If you want to know that, share the link and use [tracking](tracking-engagement.md).
- **One person per PDF.** Merge tags render for whoever you chose under **Previewing as**, not per recipient. For a personalized PDF for every constituent, use **Batch PDF Export** under **Tools** (it downloads them all as a ZIP), or send [personalized links](personalized-links.md).
- **No updates.** A PDF is a snapshot. Republishing the report doesn't change a PDF someone already downloaded.

<!-- TEAM REVIEW: Whether the PDF is tagged for accessibility (reading order, alt text).
     The PDF is produced by the reader's own browser print dialog from the /print/ view,
     so tagging depends on the browser. A tagged PDF matters to any customer with a
     conformance obligation, and resources/accessibility.md is silent on the export.
     (Resolved 2026-10-15: Get PDF does not require publishing — /print/ reads the
     working copy at reports/{id}; dashboard report menu has "Duplicate".) -->

## Related

- [Sharing reports](sharing-reports.md) — every way to distribute a report
- [Publishing and sharing](../getting-started/publishing-and-sharing.md) — publishing, republishing, and search visibility
- [Editing content](../building-reports/editing-content.md) — how blocks work
