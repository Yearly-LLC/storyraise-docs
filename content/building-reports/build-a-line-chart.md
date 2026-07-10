---
title: Build a line chart
section: Building Reports
status: draft
keywords: line chart, chart, graph, visualization, axis, monotone, data points, antv, tutorial, walkthrough
last_reviewed: 2026-07-10
---

# Build a line chart

This walkthrough builds a line chart from scratch — the "Community Engagement Growth" example — so you can see every part of the [Visualization](creating-visualizations.md) editor in action: choosing a template, styling it to your brand, and editing the data. It takes about five minutes.

<video controls preload="metadata" src="/assets/img/howto/editing-line-chart.mp4"></video>

## 1. Add a visualization and pick the Line Chart template

Add a **Visualization** to your report, select it, and click **Add / Edit Visualization** to open the editor. In the **Templates** panel on the left, open the **Chart** tab and choose **Line Chart**.

![The Line Chart template thumbnail in the picker](/assets/img/howto/choosing_chart_viz.png)

The chart starts with sample data so you always have something to shape — a title, six months of values, and a colored line.

![The starting line chart with default sample data](/assets/img/howto/editing_line01.png)

## 2. Set the font and color

In **Your Options** on the right, set the **Font** (here, Poppins) and the **Font color** — your brand colors lead the swatches, so the chart stays on-palette.

![Font set to Poppins and font color changed](/assets/img/howto/editing_line02.png)

## 3. Simplify the line

The default line uses a different color per point with a soft area fill beneath it. For a cleaner look, turn on **Make chart monotone** (then pick a **Monotone color**) so the whole line is one color, and check **Hide area fill** to remove the shading.

![Make chart monotone and Hide area fill enabled, giving a single-color line](/assets/img/howto/editing_line03.png)

## 4. Label the axes

Line charts can carry axis labels. Add an **X-axis title** (**Month**) and a **Y-axis title** (**Users**), and set an **Axis suffix** (**k**) so the scale reads 100k, 200k, and so on.

![Axis suffix and X/Y axis titles added to the chart](/assets/img/howto/editing_line04.png)

## 5. Edit your data points

Scroll to the **Data** section. Each row has a **Label**, a **Value**, and a **Color**. Click into any field to change it — here the first point's label becomes **January** and its value **280**. The preview updates as you type.

![Editing a data point's label and value in the Data section](/assets/img/howto/editing_line05.png)

## 6. Remove a data point

To drop a point, click the **×** on its row.

![The remove (×) button on a data row](/assets/img/howto/editing_line06.png)

The chart re-draws without it — the line now begins at the next month.

![The chart after removing the first data point](/assets/img/howto/editing_line07.png)

## 7. Add a data point

To extend the series, click the **+** on a row to add a new one below it, then fill in its **Label** and **Value**.

![The add (+) button on a data row](/assets/img/howto/editing_line08.png)

![The chart extended with a new data point](/assets/img/howto/editing_line09.png)

## 8. Put the points in order

New and edited points keep the order of your list, so a month can land out of sequence on the axis. Use the up (**▲**) and down (**▼**) arrows on each row to move it into place.

![Using the reorder arrows to fix an out-of-order month](/assets/img/howto/editing_line10.png)

With the rows in order, the chart reads cleanly from left to right.

![The finished line chart with months in order](/assets/img/howto/editing_line11.png)

## 9. Finish

Click **Done** to place the chart in your report. You can reopen the editor any time — select the block and press **Add / Edit Visualization** again to adjust the data or styling.

> **Tip:** The same editor builds every chart type. Try the **Pie**, **Bar**, or **Column** templates with your own data — the data rows, colors, and title work exactly the same way.

For the bigger picture — the other template families, brand styling, and PDF behavior — see [Creating visualizations](creating-visualizations.md).
