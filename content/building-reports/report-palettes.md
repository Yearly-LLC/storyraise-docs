---
title: Report palettes
section: Building Reports
status: draft
keywords: palette, report palette, color palette, buttons, dark sections, light sections, light accent, dark accent, template accents, contrast, AA, WCAG, passes AA, fails, palette ideas, suggested palette, default palette, make default, duplicate palette, styles, your palettes, primary, secondary, block style
last_reviewed: 2026-10-12
---

# Report palettes

A report palette sets the starting colors of your reports. It's a set of five colors that decides what color the buttons are, what the dark sections look like, and what the light sections look like. Your default palette is applied to every new report, and you can pick a different saved palette when you create one. Storyraise checks every palette for readability before you save it, so a report built on it is easy to read.

A palette's colors are its own, separate from your [brand colors](brand-kit.md). They can be brand colors, darker or lighter shades of them, or any other color you pick. Adding or removing a brand color doesn't change your palettes.

You'll find palettes on the **Brand** tab of the brand kit, under **Report palettes**.

![Report palettes: Harbor classic marked Default and Sunrise, both with "Text passes AA", next to an idea card "Idea: Orange on navy" with Customize and Save palette buttons](/assets/img/howto/brandkit_palettes.png)

Each card previews the palette on a small sample — a dark section with a **Give again** button, then a light section of stats with a **Give** button. The strip underneath shows all five colors. The chip under the name tells you whether it's readable: **Text passes AA** means both required contrast checks (below) pass.

> **What "AA" means:** AA is the standard level of the web accessibility guidelines (WCAG). A contrast ratio measures how different two colors are, from 1:1 (identical) to 21:1 (black on white). Text needs at least 4.5:1 to be comfortable to read.

## The five colors in a palette

| Color | Where it's used |
|---|---|
| **Buttons** | Every button in the report. The button's text color is chosen automatically — whichever of the lightest or darkest palette color reads better on it. |
| **Dark sections** | The background of dark sections, and the text color on light sections. In the builder, a block set to **Primary** uses this. |
| **Light sections** | The background of light sections, and the text color on dark sections. In the builder, a block set to **Secondary** uses this. |
| **Light accent** | Small decorative touches some templates use, such as shapes and generated backgrounds. |
| **Dark accent** | Small decorative touches some templates use, such as shapes and generated backgrounds. |

The two accents live under **Template accents** in the palette editor. Most of the time you only need to think about the first three.

## Start from an idea

You don't have to build a palette by hand. Storyraise suggests palettes that use only your brand colors (and darker or lighter versions of them), and every suggestion passes the contrast checks.

![Three palette ideas — Green on navy, Sky on navy and Navy sections — each marked Passes AA with a one-line description and Customize and Save palette buttons](/assets/img/howto/brandkit_ideas.png)

Ideas are named for what they do. "Green on navy" means green buttons on navy sections, and "Navy sections" keeps the sections in your exact navy and adjusts the buttons. The line under each idea tells you which colors it uses exactly and which it has darkened or lightened.

- **Save palette** saves the idea as it is.
- **Customize** opens it in the palette editor so you can change it first.

Before you have any palettes, you'll see up to three ideas. Afterwards, one idea stays on the page, labeled **Idea:**, in case you want another. Ideas only appear if at least one brand color isn't white, black, or gray.

## Create or edit a palette

Click **New palette**, or choose **Edit** from a palette's **⋮** menu. A new palette starts with colors taken from your brand colors, which you can then change. To start from a suggestion instead, click one of the chips under **Or start from an idea**, then adjust it.

![The New palette editor. On the left, color rows for Buttons, Dark sections and Light sections, with Buttons marked 3.5:1 Fails and a suggestion to use #00C366. On the right, a live preview of dark and light sections and four contrast checks](/assets/img/howto/brandkit_composer.jpg)

1. **Pick a color for each role.** Click **Buttons**, **Dark sections**, or **Light sections** on the left to open a color picker with your brand colors at the top. The preview on the right updates as you go, and the section you're editing is highlighted. Open **Template accents** to set the two accent colors.
2. **Watch the checks.** Each role shows its contrast ratio, and the four checks under the preview show how the palette does overall (see below).
3. **Use the suggestion if something fails.** When a check fails, a **Suggested for…** line offers the smallest lighter or darker change that fixes it. Click **Use** to apply it.

   ![Buttons at #00AA59 reads 3.5:1 Fails, with a "Suggested for Buttons" card offering #00C366 and a Use button](/assets/img/howto/brandkit_composer_before.png)

   After **Use**, every role passes:

   ![Buttons is now #00C366 and reads 4.6:1 Pass; Dark sections and Light sections read 10.7:1 Pass](/assets/img/howto/brandkit_composer_after.png)

4. **Name it.** Type a name (up to 60 characters). If you leave it blank, it's saved as "Untitled palette".
5. Tick **Use for new reports** to make it your default palette, then click **Save palette**. The default is preselected under **Colors** whenever someone creates a report or opens a template, and it's the palette shown under **New reports start with**. Your first palette becomes the default automatically.

If you have a default font pair, the preview uses it. Untick **Show in** *your fonts* (for example, **Show in Fraunces + Karla**) to see the colors on their own.

Nothing is saved until you click **Save palette**. Saving never changes existing reports.

## Contrast checks

Every palette is checked against the WCAG accessibility guidelines (see the note on "AA" near the top of this page). The four checks sit under the preview in the palette editor:

![Four checks: Text on dark sections 10.7:1 Pass, Button text 4.6:1 Pass, Buttons stand out on dark 4.6:1 Pass, Buttons stand out on light 2.3:1 Low](/assets/img/howto/brandkit_composer_checks.png)

| Check | Needs | If it fails |
|---|---|---|
| **Text on dark sections** | 4.5:1 | Required. You can't save until it passes |
| **Button text** | 4.5:1 | Required. You can't save until it passes |
| **Buttons stand out on dark** | 3:1 | Advisory, shown as **Low**. You can still save |
| **Buttons stand out on light** | 3:1 | Advisory, shown as **Low**. You can still save |

The "Text on dark sections" check also covers dark text on light sections, because it compares the same two colors.

A check shows its ratio and a result, such as **10.7:1 Pass**, **3.5:1 Fails**, or **2.3:1 Low**. If you click **Save palette** while a required check fails, Storyraise moves you to the failing check instead of saving.

> **Tip:** A "Low" on **Buttons stand out on light** is common with mid-tone brand colors and is usually fine. The button text is still readable; the button just blends a little more into a white section.

## Manage your palettes

Open the **⋮** menu on a palette card:

![The Sunrise palette card's menu with Edit, Make default, Duplicate and Delete](/assets/img/howto/brandkit_palette_menu.png)

- **Edit** — change the colors or rename it.
- **Make default** — new reports start with this palette. (It doesn't appear on the palette that's already the default.) You can also change the default from **Change** at the top of the brand kit.
- **Duplicate** — makes a copy named "*name* copy", a quick way to try a variation.
- **Delete** — removes it from the brand kit. Reports that already use those colors keep them, because every report holds its own copy.

The first palette you save becomes the default automatically. If you delete the default, the oldest remaining palette takes over.

## How a palette shows up in a report

When a report starts from a palette (see [Starting a report on brand](brand-kit-and-new-reports.md)), its colors become that report's own **Report palette**:

- When you color an element, its color picker shows a **Report palette** row with those five colors, followed by **Your brand colors** and then the presets.
- When you select a block (a section of the report), **Set Block Style** offers **Primary** (a dark section background with light text) and **Secondary** (a light section background with dark text). Switching between them is how you alternate dark and light sections.
- Buttons use the **Buttons** color, with text in whichever palette color reads better.

![The builder's color picker with a Report palette row, a Your brand colors row with + and − buttons, and the preset grid](/assets/img/howto/brandkit_builder_picker.png)

The **+** and **−** at the end of **Your brand colors** add the color you've picked to your brand kit, or remove the selected brand color. That change is saved to the brand kit straight away, for the whole team. Removing a brand color here removes it for everyone.

## Use a palette in a report you've already built

Changing a palette in the brand kit doesn't touch existing reports. To bring a palette into one:

1. Open the report in the builder.
2. Open **⋯ → Styles** (or **Manage styles** in the Blocks panel).
3. Under **Color Palette**, click **More color palettes**.
4. Pick a palette under **Your Palettes**. Your brand kit palettes are listed first, above the stock palettes under **Other Palettes**.

The whole report is recolored. Any typography you've already fine-tuned, such as font sizes, weights, and line heights, is kept. The report gets its own copy of the colors, so later edits in the report don't change the brand kit palette, and the other way round.

## Related

- [Brand kit](brand-kit.md)
- [Font pairs](font-pairs.md)
- [Starting a report on brand](brand-kit-and-new-reports.md)
- [Fonts and colors](fonts-and-colors.md)
- [Accessibility considerations](accessibility.md)
