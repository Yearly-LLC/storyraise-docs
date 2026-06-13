---
title: Troubleshooting sync issues
section: CRM & Data Connections
status: draft
last_reviewed: 2026-06-12
---

# Troubleshooting sync issues

Most sync problems come down to one of a few causes. Work through the section that matches what you're seeing.

## "My Blackbaud connection stopped working"

Blackbaud authorizations expire periodically. Storyraise refreshes them automatically behind the scenes, but if a sync fails with an authorization error:

1. Open the **Constituents** area and go to the **Blackbaud** tab.
2. Click **Connect** to re-authorize with your Blackbaud account.
3. Re-select your constituent list and sync again.

Make sure you authorize with a Blackbaud account that has access to the constituent lists you want to sync.

## "Bloomerang says my API key is invalid"

- Double-check you copied the entire key with no leading or trailing spaces. Keys look like `aaead1d4-7075-57df-ec7f-11e717c7bdd1`.
- API keys belong to a Bloomerang user. If that user was deactivated or their key was regenerated, the old key stops working — create or copy a fresh key in Bloomerang and try again. Bloomerang's guide: [Where can I find my Bloomerang API key?](https://support.bloomerang.co/s/article/13000076351#new)

## "Some constituents didn't import"

The most common cause is a **missing email address**. Storyraise identifies each constituent by email, so records without one are skipped.

- In your CRM, fill in email addresses where you can, then re-sync.
- For CSV uploads, check that your file has a properly spelled **Email** header and that each row has a value in it.

## "I have duplicate constituents"

Storyraise matches records by email address, so duplicates usually mean the same person exists under two different emails (in your CRM, or between your CRM and a CSV upload). Consolidate to one email in the source data and re-sync.

## "A constituent's information looks outdated"

Syncs run when you trigger them — they don't update automatically yet. Re-run the sync to pull the latest data; see [Data refreshes](data-refreshes.md).

## "My CSV won't upload"

- Save the file as **.csv** (not .xlsx or .numbers). Every spreadsheet app has an "Export as CSV" or "Save as CSV" option.
- Check the required headers are present: **First Name**, **Last Name**, **Email**.
- If your data contains commas (like `"Smith, Jr."`), make sure your spreadsheet app is doing the export — it will quote fields correctly. Avoid hand-editing CSVs in a plain text editor.
- When in doubt, start from the **Constituents Template (CSV)** available in the **CSV File** tab.

## "Merge tags show up empty in a personalized report"

The constituent is missing that field. Check the constituent's record to see which fields they have; fill gaps in your CRM or CSV and re-import. Also note that deleting a field from constituents will blank out any merge tags that used it.

## Still stuck?

Contact support and include: which CRM (or CSV), roughly how many constituents you expected vs. got, and what error message you saw, if any.

<!-- TEAM REVIEW: insert the actual support channel/email we want customers to use. -->
