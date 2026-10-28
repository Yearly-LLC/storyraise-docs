---
title: Embedding a Collect form
section: Building Reports
status: draft
keywords: collect form, embed form, form in report, survey in report, story collection, gather stories, inline form, button form, modal, iframe, respond in report
last_reviewed: 2026-10-15
---

# Embedding a Collect form

You can put one of your [Storyraise Collect](../storyraise-collect/what-is-storyraise-collect.md) forms directly into a report, so readers can respond without leaving the page they're reading.

It's the natural pairing for a report that asks for something: tell a story, sign up, share a photo. The ask sits right where the case for it was just made.

## Adding the form

1. Build the form first in [Storyraise Collect](../storyraise-collect/creating-a-collection.md). The element embeds a form you already have; it doesn't create one.
2. In the builder, open the **Insert** bar and choose **Form** (labeled **Collect Form** when you hover it).
3. In the settings panel, pick your form under **Select a Form**.
4. Choose how it should appear under **Show As**.

If you haven't built a form yet the panel says so and offers a **Create a form** link straight into Collect. Once you have forms, the same spot becomes **Manage your forms**.

<!-- TEAM REVIEW: the element is meant to require Storyraise Collect (gated_element_products,
     builder app.js:20373), but that map sits inside Vue `methods` (app.js:2737), so Vue 2 replaces it
     with a no-op and the gate never fires: any org can insert the element today. The fix is on an
     unmerged branch (memory project_video_report_handoff.md). Once the gate works, add a note that
     the element is dimmed with "Contact us for access" for orgs without Collect. Needs Vince. -->

<!-- TEAM REVIEW: needs a screenshot of the Collect Form settings panel with a form selected and the Show As dropdown open. -->

## Two ways to show it

**The form, in the report** puts the form in the page, sized to the height you set, scrolling inside its own frame. Readers see the first question without clicking anything, which is the higher-response option and the right default when responding is the point of the section.

**A button that opens the form** puts a button in the page and opens the form in a window over the report. Choose this when the form is a secondary ask and you don't want it competing with the story, or when the form is long enough that embedding it would dominate the section.

> **Tip:** If you're not sure, embed it. A form a reader can see is answered far more often than one behind a click.

## Styling it

For an embedded form, set **Form Height**, **Width**, **Justification**, and **Corner Radius** to fit it into the page.

For a button, you get the full set of button controls — text, font, size, roundness, padding, and margins. The button takes its fill and text color from the same place the report's other buttons do, so it matches without you setting anything.

## What readers can do

Readers answer an embedded form exactly as they would on the form's own page. **File upload** questions open the reader's file picker, so they can add a photo, video, or document without leaving the report — and on most phones, take a new photo or video with the camera. The form has no built-in recorder.

## Where responses go

Responses land in the same place as any other response to that form: open the form in Collect and read them under [managing responses](../storyraise-collect/managing-responses.md). It makes no difference to the form whether the answer came through a report or through a link you sent.

Because the same form can be embedded in more than one report, keep one form per thing you're asking for rather than one per report. You get all the answers in one place.

## Related

- [What is Storyraise Collect](../storyraise-collect/what-is-storyraise-collect.md)
- [Creating a collection](../storyraise-collect/creating-a-collection.md)
- [Managing responses](../storyraise-collect/managing-responses.md)
- [Sharing your form](../storyraise-collect/sharing-your-form.md)
- [Editing content](editing-content.md)
