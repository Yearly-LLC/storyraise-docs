---
title: Form field types
section: Storyraise Collect
status: draft
last_reviewed: 2026-10-15
---

# Form field types

Storyraise Collect gives you a full toolkit of fields, so your form can ask for exactly what you need — a quick quote, a long story, a photo, a date, a choice from a list.

## Question fields

- **Short text** — a single line: a name, a title, a city.
- **Long text** — a paragraph or more: a story, a reflection, a testimonial.
- **Email** — an email address.
- **Phone** — a phone number.
- **Choose one** — pick a single option (radio buttons).
- **Choose many** — pick several options (checkboxes).
- **Dropdown list** — pick one from a longer list, in a compact menu.
- **Number** — a numeric answer.
- **Date** — a date, with a date picker.
- **File upload** — a photo, a video, an audio clip, or a PDF, up to 200 MB per file. Other documents (Word, Excel, PowerPoint, plain text) can't be uploaded, so ask for a PDF instead.

## Layout fields

These don't ask a question — they shape and explain your form:

- **Heading** — a section title.
- **Paragraph** — descriptive text or instructions.
- **New Section** — a divider that breaks a longer form into [steps](multi-step-forms.md).

## Field settings

Each field can be configured with:

- A **label** (the question), **placeholder**, and **description** (helper text).
- **Required** — make an answer mandatory.
- A **default value** and a custom **error message**.
- For **Choose one / Choose many / Dropdown**, the list of **options** (one per line).
- For **File upload**, **Allowed File Types** (Any file, Images only, Videos only, or Documents only).

<!-- TEAM REVIEW: two product issues found 2026-10-15 in the storyraise-collect branch (deployed app).
     (1) The respondent's file picker never receives the field's `accept` value: upload_media_anonymous
         in public/js.js opens #file_uploader without setting .accept, so Allowed File Types does not
         restrict what a respondent can pick.
     (2) storage.rules (deployed 2026-07-13) only allows anonymous form uploads under 200 MB with a
         content type of image/*, video/*, audio/* or application/pdf, but the "Documents only" preset
         lists .doc/.docx/.xls/.xlsx/.ppt/.pptx/.txt, which the rules reject ("Error storing file").
     Decide whether to fix the app/rules or keep this page's "ask for a PDF" guidance. -->

## Tips

- **Ask for the least you need.** Every extra field lowers completion. A great story plus a name beats a ten-field interrogation.
- **Use Long text for stories, Short text for facts.** Matching the field to the answer sets expectations and improves what you get back.
- **Label clearly, explain briefly.** A one-line description under a tricky question saves you cleanup later.
- **Mark only the essentials required.** Over-requiring fields makes people abandon the form.

## Next

- [Multi-step forms](multi-step-forms.md) — break longer forms into manageable steps
- [Managing responses](managing-responses.md) — work with what you collect
