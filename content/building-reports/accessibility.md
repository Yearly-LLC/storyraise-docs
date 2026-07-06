---
title: Accessibility considerations
section: Building Reports
status: draft
keywords: accessibility, alt text, media description, contrast, overlay, wcag, screen reader
last_reviewed: 2026-06-24
---

# Accessibility considerations

An accessible report reaches your whole audience — including readers with low vision, color blindness, motor differences, or those using screen readers. Most accessibility wins come from choices you make while building. Here's what matters most. (For Storyraise's built-in accessibility features, embedding, and conformance, see [Accessibility at Storyraise](../resources/accessibility.md).)

## Color and contrast

- **Keep text contrast high.** Dark text on light backgrounds (or light on dark) should be comfortably readable.
- **Add an overlay behind text on photos.** When you place text over an image, use the block's **Overlay Color** control to darken (or lighten) the image behind the text. Increase the overlay opacity until the text is comfortably legible — busy or bright photos need more. Storyraise doesn't measure the contrast ratio for you, so trust your eyes and test on a phone as well as a laptop.
- **Don't rely on color alone.** If a chart distinguishes categories only by hue, readers with color blindness may lose the thread. Use labels and values alongside color.

## Typography

- **Favor readable sizes.** Resist shrinking body text to fit more in — if a section feels cramped, split it instead.
- **Use real headings.** Structure each section with a clear heading hierarchy rather than enlarged body text; it helps every reader scan, and assistive technology navigate.
- **Watch line length and spacing.** Generous line height and moderate line lengths make long passages far easier to read.

## Media

- **Don't put essential text inside images.** Text baked into an image can't be resized, translated, or read by a screen reader. Put key facts in real text elements.
- **Caption your videos.** YouTube and Vimeo both support captions — enable them on the source video so embedded players inherit them.
- **Keep motion gentle.** Animated counters and media animations add life, but heavy motion can be disorienting; use it as seasoning, not structure.

## Structure and navigation

- **Descriptive section titles** double as navigation labels — "Financial Summary" tells a screen-reader user where a link goes; "More" doesn't.
- **Meaningful button text.** "Read Maria's story" beats "Click here."
- **Logical reading order.** Mobile preview shows you the linearized order of side-by-side content — make sure it makes sense read top to bottom. See [Mobile optimization](mobile-optimization.md).

## Image alt text

Give your images a text description so screen-reader users know what they show. Select an image and fill in **Media Description (alt)** with a short, specific description.

- **Describe the content and its purpose**, not the file. "Volunteers sorting food donations at the spring drive" beats "IMG_2043."
- **Keep it concise** — a sentence or so. Screen readers read it aloud.
- **Skip "image of"** — assistive tech already announces that it's an image.
- **Decorative images** (a texture or divider that adds nothing to the meaning) can have an empty description — leave it blank so screen readers skip them.

**Important — full-bleed background imagery.** Storyraise reports use two kinds of images: standalone images placed in your content, and large full-bleed images that sit *behind* a section's text. For standalone images, the Media Description becomes proper screen-reader alt text. For full-bleed background images, treat the description as a helpful label but **not** a full substitute — so, as below, make sure anything essential in a background photo also appears in real text on the page. When in doubt, keep key information in text, not baked into an image.

## A quick pre-publish check

1. Squint test: can you still distinguish sections and read headings with your eyes half-closed?
2. Grayscale test: does the report still communicate if you imagine it without color?
3. Read your section titles alone — do they tell the report's story?
4. Alt-text pass: does every meaningful image have a **Media Description**, and is essential info in real text rather than only in a photo?
