---
title: Creating infographics
section: Building Reports
status: draft
keywords: infographic, infographics, visualization, chart, graph, data, antv, pie, donut, bar, column, line, word cloud, timeline, funnel, sequence, progress
last_reviewed: 2026-10-15
---

# Creating infographics

An **Infographic** turns your numbers, lists, and milestones into a clean, on-brand graphic — a pie chart of where funding comes from, a timeline of the year, a word cloud of what supporters said. You build it from data you type in, pick a template, and style it to match your brand, all without leaving the report builder.

> **Note:** Infographics were previously called **Visualizations**. Only the name changed — existing reports keep working, and everything below applies to graphics you built under the old name.

## What you can build

Every infographic is created from a **template**. Templates are grouped into four families, and you can switch between them with the tabs at the top of the editor:

- **Chart** — pie, donut, bar, column, and line charts for comparing values over categories or time.
- **List** — visual lists such as progress rings, checklists, and badge cards for highlighting a set of related points.
- **Sequence** — timelines, funnels, roadmaps, and step "snakes" for showing a process or a journey.
- **Word Cloud** — a standard or bubble cloud that sizes each word by how often (or how much) it matters.

![The Infographic Editor with the Chart templates panel: Pie, Donut, Bar, and Column chart templates](/assets/img/howto/choosing_viz01.png)

## Adding an infographic

1. In the builder, add an infographic — either drag in the **Infographics** block, or add an **Infographic** [element](../getting-started/common-terminology.md) from the **Insert** bar and choose **Insert before** or **Insert after**.
2. Select the new block. In the right-hand panel, under **Infographic Editor**, click **Add / Edit Infographic**.

<video controls preload="metadata" src="/assets/img/howto/finding-visualizations.mp4"></video>

## Inside the editor

Clicking **Add / Edit Infographic** opens the **Infographic Editor** — a three-panel window:

- **Templates** (left) — the template picker, with the **All / List / Sequence / Chart / Word Cloud** tabs and a thumbnail for each style.
- **The Preview** (center) — a live rendering that updates as you make changes.
- **Your Options** (right) — the settings for the selected template: fonts and colors, template-specific toggles, the **Title**, and the **Data** you're charting.

When you're happy with the preview, click **Done** to drop it into your report. Reopen the editor any time to make changes — click the block and press **Add / Edit Infographic** again.

![The full Infographic Editor: Templates on the left, a live pie-chart preview in the center, and options plus data on the right](/assets/img/howto/whole_modal_viz01.png)

## Entering your data

You type an infographic's data in directly, so you're never waiting on a connection. In the **Data** section of the options panel, each row is one data point with a **Label**, a **Value**, and its own **Color**. Use the row controls to shape your data:

- **Add** (**+**) a new row, or **remove** (**×**) one you don't need.
- **Reorder** rows with the up and down arrows — handy for putting months, quarters, or ranked items in the right order.

Give the whole graphic a heading with the **Title** field.

### Importing data from a CSV

Chart templates (pie, donut, bar, column, and line) can also take their rows from a spreadsheet. Above the data rows, click **Import CSV** and choose a `.csv` file; **See CSV format** shows an example. The importer reads the first two columns, a name and a number, and skips any row missing either. Importing **replaces** the rows already in the chart. On bar and line charts, a header row fills in the X- and Y-axis titles if you haven't set them yourself. List, Sequence, and Word Cloud templates are entered by hand.

### Personalizing a value

On chart templates, each data row also has optional **Label variable** and **Value variable** fields, so the graphic can read differently for each person who opens the report. Type a merge tag into one of them — the field offers the tags available to your report as you type — and the row uses it whenever the report is opened through a [personalized link](../distribution-and-engagement/personalized-links.md).

The static **Label** and **Value** are what everyone else sees, so fill them in as well and treat the variable as the personalized override.

<!-- TEAM REVIEW: needs a screenshot of a Data row with a merge tag in the Value field and the tag list showing. -->

## Styling to your brand

Infographics pick up your organization's look automatically, and you can fine-tune from there:

- **Font** — choose any font available to your report, including your brand fonts.
- **Colors** — every color picker shows **your brand colors** first, then your **report's palette**, so charts stay on-palette. Set a per-row color, or turn on **Make chart monotone** to render the whole chart in a single color.
- **Chart options** vary by type — for example, pie and donut charts offer **Show labels**, **Hide labels below (%)**, and **Show slice outline**; bar and line charts add **X-axis title**, **Y-axis title**, and value or axis **prefix/suffix** (for a `$` or `k`).

Storyraise also protects readability: if a text color would be invisible against the background, it's automatically nudged to a legible shade. For more on brand styling, see [Brand kit](brand-kit.md) and [Fonts and colors](fonts-and-colors.md).

> **Tip:** Fewer data points read better. A chart with five or six clear categories tells a stronger story than one crammed with twenty.

## The Infographics block

The **Infographics** block has a single layout: a heading and body text above an infographic. To show two infographics side by side, add a second **Infographic** element and drop it beside the first.

## In PDF and on mobile

Infographics render as crisp vector graphics, so they stay sharp when a report is exported to PDF. Two settings apply to the PDF only — **Vertical alignment** (top, center, or bottom on the page) and **Show page number** — and they live on the block's traits alongside the infographic.

On smaller screens, an infographic scales to the width of its column; you can also set the block's **Width (%)** to give it more or less room. See [Mobile optimization](mobile-optimization.md).

## Next: build one

Ready to try it? Follow the step-by-step [Build a line chart](build-a-line-chart.md) walkthrough to create your first infographic from scratch.
