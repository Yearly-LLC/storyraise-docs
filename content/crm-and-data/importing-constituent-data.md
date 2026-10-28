---
title: Importing constituent data
section: Donor Data & CRM
status: draft
keywords: csv, upload, donors, import
last_reviewed: 2026-10-15
---

# Importing constituent data

You can bring constituents into Storyraise two ways: sync them from a [connected CRM](connecting-a-crm.md), or upload a CSV file. CSV import works with data exported from any system — or a spreadsheet you maintain by hand.

> **Tip:** Prefer to see it? [Watch the two-minute tour and explore the interactive demo](/personalization/): import donors, add variables and Show When content, then preview the report as two different donors.

## Importing from a CSV file

### 1. Prepare your file

Your CSV needs headers for **First Name**, **Last Name**, and **Email**. Email is the key field — Storyraise uses it to identify each constituent. A row with a name but no email address still imports: Storyraise keys that person on their name instead, so they can still get a personalized report (a printed one, for example). Rows with neither an email nor a name are skipped.

<!-- TEAM REVIEW: the "Map your columns" dialog still says "Rows without an email will be skipped" (public/index.html ~6578), but map_import_row (public/js/app-dashboard.js ~12251) gives name-only rows a placeholder address and imports them. The doc follows the code; the dialog copy should be corrected. -->

The easiest path:

1. In the **Constituents** area, click **Add constituents** and open the **CSV File** tab.
2. Download the **Constituents Template (CSV)**.
3. Open it in Excel, Google Sheets, or Numbers, and fill in your constituent data.

You can include additional columns beyond the required three — giving level, campaign, salutation, anything you like. Extra columns are imported as custom fields on each constituent and become available as merge tags for personalization.

### 2. Upload it

1. Back in the **CSV File** tab, click **Upload CSV** and select your file.
2. In **Map your columns**, choose which column holds **Email** (required), and which hold **First name** and **Last name**. Every other column is imported as a custom field.
3. Optionally, add the imported constituents to an existing list or a new one.
4. Click **Import constituents**.

### 3. Check the results

Your constituent list now shows the imported records, each tagged **CSV** so you can tell them apart from CRM-synced constituents. Open any constituent to review their fields.

## Importing from a CRM

If your CRM, giving platform, or email tool is one of the [supported integrations](supported-integrations.md), connect it and sync instead of exporting CSVs by hand — see [Connecting a CRM](connecting-a-crm.md). CRM-synced constituents are tagged with their source and keep the fields your CRM provides.

## How re-imports work

Constituents are identified by email address. If you upload a file containing an email that's already in your list, that constituent's record is updated rather than duplicated. This means you can safely re-upload an updated export to refresh your data.

<!-- TEAM REVIEW: confirm update-vs-duplicate behavior on re-upload, and what happens to fields that exist in Storyraise but are missing from the new file. -->

## What constituent data unlocks

- **Personalized reports** — merge tags like `@@first_name@@` fill in each constituent's own information.
- **Personalized QR codes and links** — each constituent gets a link to their own version of a report.
- **Analytics** — see which constituents opened your reports.

## Editing constituent data

From the constituent list, open any constituent to view their fields. For constituents imported by CSV, you can edit field values and add or remove fields directly in Storyraise. Fields synced from a CRM are read-only in Storyraise — update them in your CRM and re-sync.

> **Careful when deleting data:** if a personalized report relies on a field you remove, its merge tags will resolve to empty for affected constituents.
