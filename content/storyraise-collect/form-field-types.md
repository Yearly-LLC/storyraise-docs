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
- **File upload** — a photo, a video, an audio clip, or a document, up to 200 MB per file. Documents can be PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), plain text (.txt), CSV, or RTF.

## Layout fields

These don't ask a question — they shape and explain your form:

- **Heading** — a section title.
- **Paragraph** — descriptive text or instructions.
- **New Section** — a divider that breaks a longer form into [steps](multi-step-forms.md).

## Field settings

Each field can be configured with:

- A **label** (the question), **placeholder**, and **description** (helper text).
- **Save to Variable** — the name the answer is saved under, written as `@@name@@`. Storyraise fills it in from the label as you type (lowercase, with underscores), and keeps every field's variable unique within the form. It's the key for that answer in the collection's responses, the column a CSV import matches to [pre-fill](sharing-your-form.md) the field, and the `@@tag@@` you use to show the answer in a report. Rename it if you like, but do it before responses arrive, since answers already collected stay under the old name.
- **Required** — make an answer mandatory.
- A **default value** and a custom **error message**.
- For **Choose one / Choose many / Dropdown**, the list of **options** (one per line).
- For **File upload**, **Allowed File Types** (Any file, Images only, Videos only, or Documents only). The setting filters the respondent's file picker, and the form checks each file before uploading it — a file of the wrong type, or one over 200 MB, gets a clear message saying what this question accepts, instead of a failed upload.

## Tips

- **Ask for the least you need.** Every extra field lowers completion. A great story plus a name beats a ten-field interrogation.
- **Use Long text for stories, Short text for facts.** Matching the field to the answer sets expectations and improves what you get back.
- **Label clearly, explain briefly.** A one-line description under a tricky question saves you cleanup later.
- **Mark only the essentials required.** Over-requiring fields makes people abandon the form.

## Next

- [Multi-step forms](multi-step-forms.md) — break longer forms into manageable steps
- [Managing responses](managing-responses.md) — work with what you collect
