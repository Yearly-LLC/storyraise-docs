---
title: Mapping fields
section: Donor Data & CRM
status: draft
last_reviewed: 2026-10-15
---

# Mapping fields

Storyraise decides which fields come across in a few places — mostly automatically, with a short mapping step where your data's shape is up to you.

## How fields work today

- **CSV imports** show a **Map your columns** step after you upload: choose which column holds **Email** (required), **First name**, and **Last name** — Storyraise suggests matches from your headers. Every other column becomes a custom field named after its column header. See [Importing constituent data](importing-constituent-data.md).
- **Slate** uses the same **Map your columns** step for the columns of your Slate query, and every other column comes across as a custom field.
- **Salesforce** brings name and email, plus any extra Contact fields you pick under **Bring extra fields across** at connect time.
- **Every other connection** (including Raiser's Edge NXT and Bloomerang) brings name and email only, along with the source system's own record id — profile fields such as address or phone are not imported onto the constituent. Bring other data in with **Add data**, which syncs it into a collection: see [Syncing data to collections](syncing-data-to-collections.md).
- **Data Mapping** (in the **Tools** tab) is for spreadsheets that need more than column matching — several files, a gift log, one row per gift. Drop in your files and Sammy, the Storyraise assistant, sets up the constituents and tables your report needs; nothing is saved until you say so.

Every imported field is available as a merge tag for personalization. Open any constituent from your constituent list to see exactly which fields they have and what each is called.

### Tips for clean fields

- Keep CSV column headers short and consistent (`Giving Level`, not `2025 GIVING LEVEL (updated)`), since headers become merge tag names.
- Use the same headers every time you re-upload, so values update the same fields instead of creating new ones.

---

<!-- TEAM REVIEW — internal outline for when the mapping UI ships:
- What the mapping step looks like during import (match source columns → Storyraise fields)
- Standard field catalog (name, email, address, phone, giving fields?)
- Renaming/merging fields after import
- How remapping affects existing merge tags in personalized reports
- Per-CRM default mappings (Blackbaud, Bloomerang)
-->
