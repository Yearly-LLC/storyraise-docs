---
title: Proofing a personalized report
section: Sharing & Analytics
keywords: proof, preview, test, check before sending, merge tag, blank field, salutation, major donor, stewardship, quality check
status: draft
last_reviewed: 2026-09-08
---

# Proofing a personalized report

Before a report that carries a donor's name — or their gift — goes out to a few hundred people, you want to see exactly what they'll see. This page is the check to run first.

The stakes are asymmetric. A typo in body copy is forgettable; a wrong salutation or a wrong amount in front of a major donor is a phone call from a board member.

## Open the report as a specific constituent

A personalized link renders the report as it will appear for one person:

```
https://your-organization.yearly.report/your-report?for=maria@example.com
```

Substitute a real constituent's email and open it. That's what they'll see. See [Personalized links](personalized-links.md) for how the links are built.

> **Check the `?for=` sits before any `#`.** If the URL has a section anchor, `?for=` must come before it or the personalization is silently dropped and everyone gets the same generic report. This is the most common mistake in a personalized send.

## Proof against the worst records, not the best

Testing with your own record proves very little — your data is complete. The failure modes live in the incomplete records:

- **A constituent with no first name.** What does the greeting look like?
- **A constituent missing whatever field you merged.** [Best practices](../resources/best-practices.md) warns that a missing field means an awkward blank — look at exactly how awkward.
- **A very long name or organization name.** Does it wrap or overflow?
- **Someone with an unusual character in their name** — an accent, an apostrophe, a hyphen.
- **The plain link with no `?for=` at all.** Someone will open it. Make sure it reads sensibly.

Pick four or five real records that break in different ways and open the report as each.

## Check the numbers, not just the names

If the report merges giving data — an amount, a level, a fund name, a date — proof that separately and harder:

- Is the amount formatted the way you'd write it in a letter, or is it raw?
- Is the date readable?
- Does the figure match what the donor believes they gave? A pledge, a matched gift, or a gift made by a family foundation can all read as surprising to the person named.

## Keep your proofing out of the numbers

Opening the report a dozen times while checking it will show up in analytics as engagement. Add yourself and your reviewers to the [analytics exclusion list](analytics-exclusion.md) before you start proofing, or your launch-day numbers will include your own team.

## A word on forwarding

A personalized link renders that constituent's merged data for anyone who opens it. If your report includes giving amounts or capacity-related fields, a forwarded link hands a third party private information about the original recipient.

Two practical rules:

- Don't merge sensitive financial detail into a report you expect to be forwarded or posted.
- Treat a personalized link as confidential correspondence, and say so when you send it.

See the privacy note in [Personalized links](personalized-links.md).

## The pre-send checklist

- [ ] Opened the report as at least four real constituents, including incomplete records
- [ ] Opened the plain link with no `?for=`
- [ ] Every merged number checked for formatting and accuracy
- [ ] `?for=` placed before any `#` in the URL you're actually sending
- [ ] Reviewers on the analytics exclusion list
- [ ] Read on a phone, not just a laptop
- [ ] Someone other than the author has read it

<!-- TEAM REVIEW: this page currently describes proofing by opening a live
     personalized URL, because that is the only method the knowledge base
     documents for reports. Storyraise Video has "Preview & send" per recipient;
     reports appear to have no equivalent preview-as-constituent view inside the
     builder. Confirm — if such a preview exists, it belongs at the top of this
     page and most of the above becomes a fallback. Also confirm whether a
     report must be published before a ?for= link renders, since that determines
     whether proofing requires a live public URL. -->

## Related

- [Personalized links](personalized-links.md) — building the links
- [Analytics exclusion](analytics-exclusion.md) — keeping internal views out
- [Email distribution](email-distribution.md) — sending the finished thing
