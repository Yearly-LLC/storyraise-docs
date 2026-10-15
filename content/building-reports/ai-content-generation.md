---
title: AI content generation
section: Building Reports
status: draft
keywords: ai, gpt, generate, draft, write
last_reviewed: 2026-10-15
---

# AI content generation

Storyraise has AI built in to help with the hardest part of any report: the blank page. Use it to draft new blocks and to generate imagery — then make the results your own.

## Draft a block with AI

The **Compose** bar at the bottom of the canvas builds new blocks for the section you're working on. It shows when no element is selected.

**Describe a block**

1. Click into **or describe a block you want to make here...** — or pick one of the suggested prompts that appear.
2. Describe the block — for example, *"Our youth mentorship program matched 120 students with mentors this year, with 94% reporting improved confidence."*
3. Click **Add this block** (or press Enter). Storyraise drafts the block and adds it to the section.
4. Edit the result like any other block — adjust the words, swap images, restyle.

**Turn your own text into blocks**

Already have the copy? Click **Paste your content**, paste your text into the window, and click **Add to section**. Storyraise lays your content out as report blocks.

### Getting good drafts

- **Give it your numbers and names.** "We served 3,400 meals at our downtown shelter" produces a far better draft than "write about our food program."
- **One block per ask.** Describe a single topic; build the section block by block.
- **Treat it as a first draft.** The AI gets you from blank to rough; your voice and your details make it real. Always review before publishing.

## Generate images with AI

Select an image in your report and, in the right-hand panel, type what you want into **Description** (for example, *"a dog wearing an astronaut's helmet"*), then click **Generate Image**. Useful for illustrative and decorative imagery when you don't have a photo that fits.

A word of advice: for impact storytelling, real photos of your real work will always beat generated images. Use AI imagery for abstract or decorative spots, not in place of authentic photography.

## What AI can see

The AI works from what you type in your prompt and the context of your report. Prompts are processed through OpenAI's API. For questions about how AI providers handle your data, contact privacy@storyraise.com.

<!-- TEAM REVIEW: confirm we can make this privacy claim as written, and adjust to match our actual data policy (text and image generation go to OpenAI via gpt_chat_completion / gpt_image). Entry points verified 2026-10-15: the old "Describe & Draft a New Section" bar is unreachable (env.is_section_builder_visible is never set true, app.js:4014/4921 commented out); the Compose bar ("describe a block" / "Paste your content") and the image "Generate Image" control (builder/index.html ~1702-1750, gpt-image-1-mini) are ungated. -->
