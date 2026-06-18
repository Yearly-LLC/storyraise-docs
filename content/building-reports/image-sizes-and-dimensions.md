---
title: Image sizes and dimensions
section: Building Reports
status: draft
keywords: image size, dimensions, aspect ratio, resolution, crop, pixels, photo size
last_reviewed: 2026-06-12
---

# Image sizes and dimensions

The right-shaped image makes a block look designed; the wrong-shaped one fights its layout. This guide lists the aspect ratio each block type expects, so you can choose and crop photos with confidence.

## How images behave in reports

A few things to know before the numbers:

- **Reports are responsive.** Many blocks crop images differently on desktop and mobile — that's why the table below has two ratio columns. An image that works in both crops keeps its subject near the center.
- **Backgrounds fill their space.** Background images scale to cover the whole block, cropping the edges as the window changes shape.
- **Upload big — Storyraise optimizes.** Images are automatically resized and compressed for fast delivery, so upload high-resolution originals rather than pre-shrinking them. There's no practical benefit to uploading small files, and large originals stay sharp on big screens.

## Aspect ratios by block type

| Block | Layout | Desktop | Mobile | Recommended minimum | Notes |
|---|---|---|---|---|---|
| Intro | — | 16:9 | 8:9 | 1920 × 1080 | Responsive; varies with window size. Center your subject for best results. |
| Letter | Image Left | 8:9 | 3:4 | 1280 × 1440 | Image beside text. Desktop responsive; varies by content length and window size. |
| Letter | Image Right | 12:16 | 12:16 | 1200 × 1600 | Image beside text, mirrored. |
| Letter | Centered · Portrait | 3:4 | 3:4 | 1200 × 1600 | Portrait image centered above the text. |
| Letter | Centered · Square | 1:1 | 1:1 | 1200 × 1200 | Square image centered above the text. |
| Letter | Centered · Circle | 1:1 | 1:1 | 1200 × 1200 | Circular crop of a square image; keep your subject centered. |
| Story | Image Left | 8:9 | 3:4 | 1280 × 1440 | Image beside text. Desktop responsive; varies by content length and window size. |
| Story | Image Right | 8:9 | 3:4 | 1280 × 1440 | Image beside text, mirrored. Desktop responsive. |
| Story | Full-Width Overlay | 16:6 | 16:6 | 1920 × 720 | A wide, cinematic banner with text overlaid. |
| Video | — | 16:9 | 16:9 | — | Standard widescreen video. |
| Highlight | — | 1:1 | 1:1 | 1200 × 1200 | |
| People | — | 1:1 | 1:1 | 1200 × 1200 | Square portraits; faces centered. |
| Testimonial | — | 1:1 | 1:1 | 1200 × 1200 | |

The layout names above (**Image Left**, **Centered · Square**, **Full-Width Overlay**, etc.) match the layout picker in the report builder. Each block type with multiple layouts shows these in its **Set Block Style & Layout** panel.

<!-- TEAM REVIEW: layout names come from the builder's block_layouts registry (public/js/app.js). Aspect ratios for most rows are from the team's spec sheet; the Letter "Centered · Portrait/Square/Circle" ratios were set to match the crop-shape names (Portrait 3:4, Square 1:1, Circle 1:1) rather than the original sheet values. The "Recommended minimum" pixel sizes are derived from the ratios and the app's CDN delivery widths (content imagery is served up to 1600px wide). Confirm before publishing. -->

## Gallery images

The **Gallery** section comes in two layouts — **Grid** and **Slideshow**. Tiles default to **square (1:1)**, and you can choose a different shape per gallery: portrait options (9:16, 3:5, 2:3, 3:4, 4:5) or landscape options (16:9, 5:3, 3:2, 4:3, 5:4). Because every image in the gallery is displayed at the shape you pick, choose photos that crop well to it, and aim for at least **1200px on the long edge**.

<!-- TEAM REVIEW: gallery layouts (Grid/Slideshow) and ratio list sourced from the gallery section's settings in code — confirm the customer-facing options. -->

## Background images

Almost every block type accepts a **background image** — including the ones not listed in the table above (Prose, Stats, Infographics, Donor List, Donate, Thank-You Note). For backgrounds:

- Use **16:9** at **1920 × 1080 or larger**.
- Backgrounds are cropped to fill the block, and the visible area shifts with window size and content length — keep the important part of the image **centered**, and avoid backgrounds where critical detail sits near an edge.
- Busy backgrounds compete with text; favor images with a quiet area where your headline lands, or use a darker photo so overlaid text stays readable.

## Section thumbnails

Each section can have a thumbnail image that appears in the published report's **navigation menu**. Use **16:9** — a simple, recognizable crop reads best at small sizes.

## Logos

Logos come from your [brand kit](brand-kit.md) rather than per-section uploads:

- Upload **SVG** if you have it — it stays crisp at every size. Otherwise use a **high-resolution PNG with a transparent background**.
- Add a **reversed (white) version** too; it's what works over photos and dark section colors.
- Avoid logos with baked-in white boxes — transparency is what lets a logo sit cleanly on any background.

## Quick tips

- **Center your subjects.** Desktop and mobile crops differ, and the center is the safe zone in both.
- **Check mobile preview before publishing.** A crop that flatters on desktop can decapitate a portrait on a phone — see [Mobile optimization](mobile-optimization.md).
- **JPG and PNG both work.** Use JPG for photos and PNG for graphics with sharp edges or transparency; delivery is optimized automatically either way.
- **When in doubt, go bigger.** An oversized image is resized for you; an undersized one looks soft on large screens.

## Related

- [Images and videos](images-and-videos.md) — uploading, editing, and the image library
- [Brand kit](brand-kit.md) — logos, brand photos, and colors
