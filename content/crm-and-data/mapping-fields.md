---
title: Mapping fields
section: CRM & Data Connections
status: stub
last_reviewed: 2026-06-12
---

# Mapping fields

> **Coming soon** — a visual field-mapping step is on our roadmap. Today, Storyraise imports your fields automatically using the rules described below.

## How fields work today

You don't need to map anything manually:

- **CSV imports** use your column headers as field names. **First Name**, **Last Name**, and **Email** are recognized as the core identity fields; every other column becomes a custom field with the column header as its name.
- **CRM syncs** bring over the fields your CRM provides — including custom fields — using the CRM's own field names. Nested CRM fields (like address parts) are flattened into individual fields.

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
