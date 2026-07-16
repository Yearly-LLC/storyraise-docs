---
title: Embedding in WordPress
section: Distribution & Engagement
status: draft
keywords: wordpress, embed, iframe, gutenberg, elementor, classic editor, custom html, block editor
last_reviewed: 2026-07-16
---

# Embedding in WordPress

WordPress is the most common place teams put a Storyraise report, and it takes about two minutes. Your published report is an ordinary web page, so you embed it the same way you'd embed a video — by pasting a snippet of code onto the page.

There's nothing to switch on or approve at our end. Published reports are public and embeddable by default, so you don't need to ask us to allowlist your domain.

If you'd rather not embed at all, [sharing the plain link](sharing-reports.md) works just as well — there's a note at the end of this guide on when that's the better choice.

## Step 1 — Copy your embed code

1. Publish your report. Storyraise opens the share screen straight after.
2. Click **Embed codes**.
3. Pick the version you want and click **Copy**:

**Standard** — the report sits inside one of your pages, with your header, footer, and other content around it:

```html
<iframe src="https://your-organization.yearly.report/your-report"
        scrolling="yes"
        style="width: 100%; aspect-ratio: 16/10; border: none;"></iframe>
```

**Fullscreen** — the report takes over the whole browser window. Best for a dedicated landing page or a kiosk screen, where the report *is* the page:

```html
<iframe src="https://your-organization.yearly.report/your-report"
        scrolling="yes"
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none; z-index: 9999;"></iframe>
```

You can reach the same screen later from the dashboard — open a published report's menu and choose **View Link**.

## Step 2 — Give it the full width of the page

This is the one thing worth getting right, so it's worth doing before you worry about anything else.

Your report sizes itself to **the width of the box you put it in**, not to your screen. Drop it into a typical blog column of around 700px and the whole report shrinks to fit — headings still look fine, but body text comes out roughly half size and becomes genuinely hard to read. Give it the full width of the page and it renders exactly as you designed it.

As a rule of thumb, aim for **at least 1000px of width**, and ideally around 1400px. Every editor below includes the step for this.

## Gutenberg (the block editor)

1. Open your page and click the **+** to add a block.
2. Search for **Custom HTML** and choose it.
3. Paste your embed code into the block.
4. **Set it to full width.** The Custom HTML block has no width control of its own, so either select the block, wrap it in a **Group** block, and set that Group's alignment to **Full width**; or switch the page to a full-width or blank template under **Page → Template**.
5. Click **Preview**, then **Publish**.

In the editor the block shows your code rather than the report — that's expected. Click **Preview** (or the block's **Preview** tab) to see the real thing.

## Elementor

1. Open the page and click **Edit with Elementor**.
2. Search the widget panel for **HTML** and drag the widget onto your page.
3. Paste your embed code into the **HTML Code** box.
4. **Set it to full width.** Select the parent Container or Section, and under **Layout** set **Content Width** to **Full Width** and **Width** to **Full**. Under **Advanced**, set left and right padding to `0`.
5. Click **Publish** or **Update**.

## Classic editor (the legacy visual editor)

1. Open your page in the editor.
2. Click the **Text** tab in the top-right corner — **not** the Visual tab. This step is the one people miss, and it's the reason most embeds fail here.
3. Paste your embed code where you want the report to appear.
4. Click **Publish** or **Update**.
5. **Don't switch back to the Visual tab.** The visual editor tidies up HTML it doesn't recognise and can strip or mangle your embed code. If you need to edit the page again, do it in the Text tab.

Width in the Classic editor is controlled by your theme rather than the editor. If the report looks cramped, choose a full-width or blank page template under **Page Attributes → Template**, or ask whoever maintains your theme for a full-width template.

## If something looks off

**The report is small and the text is hard to read.** It's in too narrow a column. Go back to the full-width step for your editor above — this fixes it almost every time.

**The embed code vanishes when you save.** Something is stripping the code before it's saved. Usually one of:

- **You're on WordPress.com rather than self-hosted WordPress.** Custom iframe embeds generally need a **Business** plan; lower plans strip them for security.
- **Your user role.** WordPress only lets Administrators and Editors post raw HTML. If you're an Author or Contributor, ask an admin to paste it. On multisite, this is restricted to Super Admins.
- **A security or caching plugin.** Jetpack, Wordfence, and some caching plugins filter iframes. Check their settings, or ask your web person to allow iframes from `yearly.report`.

**You want it taller or shorter.** Change `aspect-ratio: 16/10` to `16/9` for a wider, shorter frame, or replace it with a fixed height like `height: 800px`. The report scrolls inside its own frame either way.

**It works for you but not a colleague.** Almost always caching — ask them to hard-refresh, or clear your caching plugin.

## Accessibility

Add a `title` to the iframe so screen readers announce what it is:

```html
<iframe src="https://your-organization.yearly.report/your-report"
        title="2024 Annual Report"
        scrolling="yes"
        style="width: 100%; aspect-ratio: 16/10; border: none;"></iframe>
```

See [Accessibility at Storyraise](../resources/accessibility.md) if your site has accessibility requirements to meet.

## Prefer not to embed?

You don't have to. Linking straight to your report gives readers the same experience, works everywhere, and skips all of the above:

```
https://your-organization.yearly.report/your-report
```

A fullscreen embed and a plain link look nearly identical to a reader — so if the embed is fighting your theme, a link and a button are a perfectly good answer. For mailings, [personalized links](personalized-links.md) go one better and tell you who opened it.
