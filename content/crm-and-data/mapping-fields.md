---
title: Mapping fields
section: Donor Data & CRM
status: stub
last_reviewed: 2026-10-13
---

# Mapping fields

> **Coming soon** — a visual field-mapping step is on our roadmap. Today, Storyraise imports your fields automatically using the rules described below.

## How fields work today

You don't need to map anything manually:

- **CSV imports** use your column headers as field names. **First Name**, **Last Name**, and **Email** are recognized as the core identity fields; every other column becomes a custom field with the column header as its name.
- **CRM syncs** bring over the fields that connection provides, using the CRM's own field names. What that includes varies by CRM — Raiser's Edge NXT brings name and email only (no custom fields), while Salesforce brings name and email plus any extra fields you pick at connect time. Nested CRM fields (like address parts) are flattened into individual fields.

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
