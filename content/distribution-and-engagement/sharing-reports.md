---
title: Sharing reports
section: Distribution & Engagement
status: draft
last_reviewed: 2026-06-12
---

# Sharing reports

Publishing puts your report on the web — sharing puts it in front of your audience. Storyraise gives you several ways to distribute a published report, all available from the **Share** options in the builder.

## The Share menu

Open your published report in the builder and click **Share**. From there you can:

- **Copy link** — your report's public web address, ready to paste anywhere.
- **Embed Code (standard)** — an iframe snippet that displays the report inside a page on your own website.
- **Embed Code (fullscreen)** — an iframe snippet that takes over the whole browser window, for kiosk displays or dedicated landing pages.
- **Get QR code** — a downloadable QR code that opens your report when scanned.
- **Get PDF** — a link to a PDF version of your report.

You can also grab the public link anytime from the dashboard: open a published report's menu and choose **View Link**.

## Sharing the link

Your report's link looks like:

```
https://your-organization.yearly.report/your-report
```

It works on every device with no login or app required, so it's safe to drop into:

- Email campaigns and newsletters
- Social media posts
- Your website's navigation or footer
- Text messages

For mailings to your constituents, consider [personalized links](personalized-links.md) instead of the plain link — each recipient gets a version addressed to them, and you'll see exactly who opened it.

## Embedding on your website

Paste the **standard** embed code into any page on your site:

```html
<iframe src="https://your-organization.yearly.report/your-report"
        scrolling="yes"
        style="width: 100%; aspect-ratio: 16/10; border: none;"></iframe>
```

The **fullscreen** variant pins the report over the entire viewport — use it on a dedicated page where the report *is* the content:

```html
<iframe src="https://your-organization.yearly.report/your-report"
        scrolling="yes"
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none; z-index: 9999;"></iframe>
```

## QR codes for print

**Get QR code** downloads a scannable code for your report — drop it onto mailers, event signage, table tents, or thank-you cards to bridge print and digital. For per-constituent QR codes at scale (each opening a personalized version of the report), use the QR code generator described in [Personalized links](personalized-links.md).

## Timing your share

Every visit counts toward your report's engagement data, but your own team's views are automatically excluded — so feel free to review and share internally before the big announcement. See [Tracking engagement](tracking-engagement.md).
