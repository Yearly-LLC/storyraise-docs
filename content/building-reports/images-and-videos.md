---
title: Images and videos
section: Building Reports
status: draft
last_reviewed: 2026-09-08
---

# Images and videos

Photos and video carry the emotional weight of a report. This page covers getting media in, making it look great, and keeping it fast.

## Adding images

There are a few ways to get an image into your report:

- **Upload from your device** — click an image element and choose a file, or drag and drop straight onto the uploader.
- **Your image library** — every upload joins your organization's library, so teammates can reuse photos without re-uploading. Brand kit **Logos** and **Images** panels are available right in the editing sidebar.
- **Generate with AI** — describe the image you want and let Storyraise create it. See [AI content generation](ai-content-generation.md).

Storyraise serves images through a CDN and optimizes them automatically, so you can upload high-resolution originals without slowing your report down. For the shape and size each block type expects, see [Image sizes and dimensions](image-sizes-and-dimensions.md).

## Image settings

Select an image to adjust:

- **Width and justification** — how much space it takes and where it sits
- **Fill space** — let the image expand to fill its container
- **Corner roundness** — square to fully rounded
- **Shadow and margins** — depth and breathing room

**What wins when two settings disagree.** A width you set explicitly beats **Fill space**, and a margin you set explicitly beats **Justification**. Both used to be the other way round, which made the width and margin controls look broken. Set a value and it holds.

**Margins can go negative.** Every margin control accepts a negative value, which is how you pull an element outward or overlap it with the one above. Padding can't — a negative padding isn't a real thing — and the shorthand margin on Gallery and Stats blocks stays at zero or above, because a negative value there breaks their grid.

## Editing images

Storyraise includes a built-in image editor — crop, rotate, apply filters, and annotate without leaving the builder or round-tripping through other software.

<!-- TEAM REVIEW: confirm how the image editor is opened (button name on selected image?) so we can give the exact click path. -->

## Adding video

1. Add a **Video** element (or a Video section for a full-page treatment).
2. Paste your video's URL — YouTube and Vimeo links work.
3. Pick an aspect ratio that fits your layout: widescreen 16:9, square 1:1, vertical 9:16, and several in between.

The video plays right inside your report. Host the file on YouTube or Vimeo (an unlisted video works fine if you don't want it discoverable there).

## Personalizing images and video

On the **Personalize** tab, **Override Media** swaps a piece of media out per reader, using a merge tag rather than a fixed file.

It works on images, on section backgrounds, and on video elements — for a video you can override both the file it plays and its poster frame. The static media you placed is what everyone else sees; the merge tag only takes over when the report is opened through a [personalized link](../distribution-and-engagement/personalized-links.md) and the tag resolves to a real URL.

That makes it possible to send one report where each donor sees a photo of the program they funded, or a thank-you video recorded for their region.

<!-- TEAM REVIEW: needs a screenshot of the Override Media card on the Personalize tab with a video selected. -->

## Audio and social media

Beyond images and video, you can embed:

- **Audio** — an audio player for interviews, messages, or ambient sound
- **Twitter and Facebook posts** — show real social proof inside the report
- **Anything embeddable** — the generic Embed element accepts other embeddable content

## Tips

- **Lead with people.** Faces outperform buildings and logos; choose photos of the people your work serves (with their permission).
- **One hero per section.** A single strong image beats a collage of small ones — use a Gallery section when you genuinely have a set.
- **Vertical video has a place.** The 9:16 ratio suits phone-shot footage and mobile readers.
