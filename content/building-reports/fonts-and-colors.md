---
title: Fonts and colors
section: Building Reports
status: draft
keywords: fonts, typography, google fonts, heading font, body font, weight, colors, color picker, hex, brand colors, report palette, presets, contrast
last_reviewed: 2026-10-12
---

# Fonts and colors

Typography and color do most of the visual work in a report. This page covers how to choose and apply both.

## Fonts

### The font library

Storyraise's font picker is backed by the Google Fonts library — hundreds of professionally designed typefaces. Search by name and preview each font live before choosing.

### Your brand fonts

Save your brand's heading and body fonts as a [font pair](font-pairs.md) in the brand kit. Your default pair is preselected whenever someone creates a report, so the whole team starts in the same two typefaces without hunting through the library. You can also upload your own font files there. Uploaded fonts are listed first in every font picker.

To change a whole report's fonts after it's created, open **⋯ → Styles** in the builder and set **Heading Font** and **Body Font**.

### Per-element typography

Each text element can also be tuned individually: size, weight, color, alignment, line height, and letter spacing. Use this for fine-tuning — lean on your brand fonts for the big decisions.

The **Weight** control names each weight rather than numbering it — Light, Regular, Medium, Semibold, Bold — and only offers the weights the font family actually has. If a weight you expect isn't in the list, that family doesn't publish it. Every weight a family does offer is loaded with the report, so a heading set in Bold renders in real Bold rather than a browser's thickened approximation of Regular.

### Choosing fonts that work

- Pair a distinctive heading font with a quiet, highly readable body font.
- If your brand guidelines name fonts that exist in Google Fonts, use those exact ones. If not, pick the closest match — e.g., Lato or Inter stand in well for Helvetica-family brands.
- Body text reads best at a comfortable size with generous line height; resist shrinking text to fit more in.

## Colors

### Where colors come from

When you change an element's color in the builder, its color picker opens. At the top, drag in the color area and hue bar, or type any hex value. Below that are three rows:

- **Report palette** — the five colors this report was built with (see [Report palettes](report-palettes.md)).
- **Your brand colors** — from your [brand kit](brand-kit.md). The **+** and **−** at the end of this row add the color you've picked to the brand kit, or remove a brand color, for the whole team.
- **Presets** — a grid of Storyraise's built-in colors.

![The builder's color picker: a color area, hue bar and hex field, then Report palette, Your brand colors with + and − buttons, and the preset grid](/assets/img/howto/brandkit_builder_picker.png)

### What you can color

- **Section and block backgrounds** — the biggest lever for visual variety. Alternating background colors between sections gives a report rhythm.
- **Text** — headings and body text color per element.
- **Elements** — buttons, infographics, counters, and dividers take color settings too.

You can also restyle a whole block at once instead of coloring each element. Select the block and choose **Primary** (a dark section) or **Secondary** (a light section) under **Set Block Style**. To recolor the whole report, switch palettes under **⋯ → Styles → More color palettes**.

### Color tips

- **Contrast is king.** Dark text on light backgrounds (or the reverse) keeps your report readable for everyone — see [Accessibility considerations](accessibility.md).
- **Use your brightest color sparingly.** Save your brightest brand color for buttons, links, and key stats so it draws the eye where it matters.
- **Check on mobile.** Colors that look subtle on a big screen can disappear on a phone — preview both. See [Mobile optimization](mobile-optimization.md).

## Related

- [Brand kit](brand-kit.md)
- [Report palettes](report-palettes.md)
- [Font pairs](font-pairs.md)
- [Accessibility considerations](accessibility.md)
