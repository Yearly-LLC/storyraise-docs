---
title: Font pairs
section: Building Reports
status: draft
keywords: font pair, fonts, heading font, body font, primary font, secondary font, typography, google fonts, upload font, custom font, ttf, otf, woff, woff2, font files, default fonts, your fonts, make default
last_reviewed: 2026-10-12
---

# Font pairs

A font pair is a heading font and a body font that belong together. Save one or more pairs in your brand kit, mark one as the default, and every new report starts in those fonts.

You'll find them on the **Brand** tab of the brand kit, under **Font pairs**.

![Two font pair cards: Classic (Fraunces headings, Karla body), marked Default, and Modern (Poppins headings, Inter body), each showing a heading and paragraph in its fonts](/assets/img/howto/brandkit_font_pairs.png)

Each card shows a heading and a short paragraph in the pair's own fonts, so you can compare pairs at a glance.

> **Coming from primary and secondary fonts?** Font pairs replace the old primary and secondary brand fonts. If your organization had set them, they were turned into a pair called **Your fonts** and made the default the first time an Owner, Admin, or Editor opened the brand kit. Nothing changes in your existing reports.

## Your first pair

If you haven't saved a pair yet, the section suggests one. If you've uploaded font files, the suggestion comes from them. Otherwise it's a classic serif-and-sans combination.

![An empty Font pairs section suggesting "A pair to start from": Playfair Display for headings and Lato for body, with Choose other fonts and Save this pair buttons](/assets/img/howto/brandkit_pair_empty.png)

Click **Save this pair** to take it as is, or **Choose other fonts** to change it first.

## Create or edit a pair

Click **New pair**, or choose **Edit** from a pair's **⋮** menu.

![The New font pair editor: Headings set to Fraunces Bold 700 and Body text set to Karla Regular 400, with a preview in the default palette and a Name field reading Fraunces + Karla](/assets/img/howto/brandkit_pair_modal.png)

1. Under **Headings**, click the font name to choose a family.
2. Pick a style from the menu under it. Storyraise starts you on a sensible weight — bold for headings, regular for body text — and only lists the weights that family actually has.
3. Do the same under **Body text**.
4. Check the preview on the right. It shows the pair in your default palette.
5. The **Name** fills itself in (for example, "Fraunces + Karla") until you type your own, up to 60 characters.
6. Tick **Use for new reports** to make it your default pair, then click **Save pair**. The default is preselected under **Fonts** whenever someone creates a report or opens a template. Your first pair becomes the default automatically.

### Finding a font

The font list shows your uploaded fonts first, then every Google font from A to Z, each written in its own typeface. Type in **Search all fonts…** to narrow it down.

![The font picker open over the editor: a search box, then a Google fonts list where each name is followed by "Your Gift in Action" in that font](/assets/img/howto/brandkit_font_picker.png)

Use the **↑** and **↓** keys to try each font in the preview without committing. Press **Esc** to go back to the font you had.

## Manage your pairs

Open the **⋮** menu on a pair:

- **Edit** — change the fonts, styles, or name.
- **Make default** — new reports start with this pair. You can also change the default from **Change** at the top of the brand kit.
- **Delete** — asks **Delete this pair?** on the card. Click **Delete** to confirm or **Keep** to cancel.

The first pair you save becomes the default automatically. If you delete the default, the oldest remaining pair takes over. Changing or deleting a pair doesn't change existing reports.

## Upload your own fonts

If your brand font isn't on Google Fonts, upload the font files.

1. At the bottom of the Font pairs section, click **Upload font files**.
2. Choose one or more **.ttf**, **.otf**, **.woff**, or **.woff2** files. You can select a whole family's files at once.
3. Click **Font files** to expand the list and check that each file appears under the right family name.
4. Click **New pair** (or **Edit** on an existing pair) and pick your uploaded font. Uploaded fonts are listed above the Google fonts.

Storyraise groups the files by the family name stored inside each font, not by file name. "Brand-Bold.otf" and "brand_regular.ttf" end up together if they're the same family, with one chip per style. Uploaded fonts then appear at the top of the font list in the pair editor. In the builder's font lists they're also listed first, by file name.

The list also helps you tidy up:

- **Exact copies.** If you've uploaded the same file twice, the family says so, and **Hide copies** hides the extras from the brand kit's font picker. Nothing is deleted.
- **No family name.** Some files don't name their family. They're grouped under **No family name** until you click **Name family** and give them one.

### Removing a font file

Click the **×** on a style's chip. The confirmation tells you exactly what will go:

- The file is deleted, and it's cleared from your brand defaults.
- **Any font pair that uses that font family is deleted too**, even if you're only removing one of its styles. The dialog lists those pairs by name before you confirm.

> **Warning:** This is the one brand kit change that can reach existing reports. Reports load uploaded fonts from your uploads, so a report that uses a removed font can fall back to a different font. Upload the replacement and switch those reports to it before you remove the old file.

## Fonts in the builder

A report gets its fonts when it's created: the pair you choose in the **Fonts** cards becomes that report's heading and body fonts (see [Starting a report on brand](brand-kit-and-new-reports.md)). After that, the report's fonts are set in the builder:

- **⋯ → Styles** sets the report-wide **Heading Font** and **Body Font**. Your uploaded fonts are listed first.
- Each text element's own font, weight, and size can be adjusted in its settings — see [Fonts and colors](fonts-and-colors.md).

Brand kit pairs aren't listed in the builder, so to give an existing report your pair's fonts, set **Heading Font** and **Body Font** to match it.

## Tips

- **Pair contrast with calm.** A distinctive heading font next to a quiet, very readable body font almost always works.
- **Keep body text simple.** Script and display faces look great in a big heading and are tiring to read in a paragraph.
- **One default, a few alternates.** A second pair for appeals or event invitations is useful. Ten pairs mean nobody knows which to pick.

## Related

- [Brand kit](brand-kit.md)
- [Report palettes](report-palettes.md)
- [Starting a report on brand](brand-kit-and-new-reports.md)
- [Fonts and colors](fonts-and-colors.md)
