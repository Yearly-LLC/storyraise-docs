---
title: Analytics exclusion
section: Distribution & Engagement
status: draft
keywords: exclude, exclusion, internal views, team views, exclude email, exclude domain, board, partner, for parameter
last_reviewed: 2026-07-30
---

# Analytics exclusion

Your report analytics should reflect your real audience — the constituents you're trying to reach — not your own team clicking through to proofread. Storyraise keeps internal views out of your numbers in two ways:

- **Automatically** for your Storyraise team.
- **Manually** for anyone else you share a report with internally — a board member, a partner, a consultant — using the email exclusion feature.

## Your team is excluded automatically

Views from your organization's own team members are recognized and left out of your report analytics — whether the visit is anonymous or [identified by name](personalized-links.md). Preview, proofread, and share a published report around your team as much as you like; those visits won't touch your numbers. There's nothing to switch on.

### It's tied to the browser and device you sign in on

Storyraise recognizes a teammate by the browser and computer they use for `app.storyraise.com`. Automatic exclusion works **as long as they open the report on that same browser and machine.**

If a teammate opens the report on a different device, in a different browser, or in a private/incognito window, Storyraise can't tell it's them, and that view will be counted. For those cases — and for people who help with your reports but don't sign into Storyraise at all — use the manual exclusion below.

### Where to see who's covered

On the **Account** page, the **Exclude from Analytics** panel lists your signed-in teammates as already covered — you're always included in your own org. **Owners, Admins, and Editors** can see and edit this panel.

## Excluding people outside your app team

Sometimes you share a published report internally with people who aren't on your Storyraise team — a board member reviewing before it goes out, a colleague at a partner organization, an external consultant. Because they never sign into `app.storyraise.com`, automatic exclusion doesn't cover them, and their visits would otherwise count as real audience engagement.

The email exclusion feature handles this. It's **two steps**: add their email or domain to your exclusion list, then send them a report link tagged with that email.

### 1. Add the email or domain

On the **Account** page, open **Exclude from Analytics** and use **Add an email or domain**:

- **An email** — `colleague@partner.org` — excludes just that one person.
- **A domain wildcard** — `*@partner.org` — excludes everyone whose email is on that domain, including subdomains like `mail.partner.org`.

> **Use domain wildcards carefully.** `*@partner.org` drops *every* visitor with that domain. If any of your real audience shares it — for example, everyone at a university or a large company on the same domain — their views would be excluded from your analytics too. When in doubt, add individual emails instead.

**Owners, Admins, and Editors** can edit the list. Changes save immediately and apply to all of your published reports.

### 2. Send the report link with their email

Adding someone to the list isn't enough on its own — Storyraise can only match a visit to your list when it can see the visitor's email. It sees that email when the report link carries it in the `?for=` parameter. So when you share the report with an excluded person, send them a link with `?for=` followed by their email:

```
https://your-org.yearly.report/your-report?for=colleague@partner.org
```

This is the same `?for=` parameter used for [personalized links](personalized-links.md) — it does double duty here: it identifies the visitor so their email can be checked against your exclusion list. If the email (or its domain) is on the list, the visit is dropped.

#### Put `?for=` before any `#` in the link

Published report links can include a `#` fragment (for example, a link that jumps to a particular section). The `?for=` parameter **must come before that `#`.** Placed after it, the browser treats the email as part of the page anchor and never sends it to Storyraise — so the view gets counted anyway.

```
# ✅ Correct — the email is in the query string, before the #
https://your-org.yearly.report/your-report?for=colleague@partner.org

# ✅ Also correct — ?for= still comes before the #
https://your-org.yearly.report/your-report?for=colleague@partner.org#/p/3

# ❌ Incorrect — ?for= is after the #, so it's ignored and the view is counted
https://your-org.yearly.report/your-report#/p/3?for=colleague@partner.org
```

If you're unsure, the safest habit is to start from the plain report link and add `?for=<their email>` right after it, before doing anything else.

## Related

- [Tracking engagement](tracking-engagement.md) — what's recorded on every published report.
- [Personalized links](personalized-links.md) — the `?for=` parameter and how it identifies visitors.
- [Understanding report metrics](understanding-report-metrics.md) — reading the numbers your real audience generates.
