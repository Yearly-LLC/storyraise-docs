---
title: Multi-step forms
section: Storyraise Collect
status: draft
last_reviewed: 2026-09-08
---

# Multi-step forms

A long form on one page feels like a chore. Splitting it into steps makes it feel quick — and lets you collect repeating, one-to-many data cleanly.

## Breaking a form into steps

Add **New Section** dividers to your form, and Storyraise turns each section into its own step. Respondents see a **progress bar** ("Step 1 of 3"), can move **Back** and **Next** between steps, and can **Jump to…** a specific section. Their answers are saved as a draft as they go, so a closed tab doesn't lose their work.

Steps reduce the intimidation of a long form and let you group related questions — "About you," "Your story," "Photos" — into digestible chunks.

## Collecting one-to-many data

Sometimes one respondent needs to give you several sets of the same information — a program officer reporting on multiple funds, or a leader submitting several stories. Storyraise Collect supports this **grouped** structure: the respondent works through the repeating sections, and each is saved as its own response record, so your results table stays tidy and one row equals one item.

You don't build this by hand. It's set up from the data you import: when a CSV has **more than one row per recipient**, Storyraise notices and opens **Configure Import** — *"We detected multiple rows per recipient. Choose how to group them into form steps."*

Two choices there decide the shape of the form:

- **Recipient email column** — which column identifies the person, so their rows are gathered into one form.
- **Section label for each step** — which column names each step. Pick the column holding the fund, program, or story title and the respondent sees that as the step's heading. Choose **None** to leave the steps unlabelled.

Then **Import & Build** generates the form.

> **Tip:** Pick a section label column your respondent will recognize. "Rivera Scholarship Fund" as a step heading tells them exactly which set of answers they're on; "Row 3" doesn't.

## Tips

- **Order steps by effort.** Put easy fields first; momentum carries people into the harder ones.
- **Keep each step focused.** One topic per step is the whole point — resist cramming.
- **Name your sections clearly.** Section names label the steps and the Jump-to menu, so "Your Story" beats "Section 2."

## Related

- [Form field types](form-field-types.md)
- [Sharing your form](sharing-your-form.md)
