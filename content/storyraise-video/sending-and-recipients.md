---
title: Sending and recipients
section: Storyraise Video
status: draft
last_reviewed: 2026-10-15
---

# Sending and recipients

Your video is recorded and your scenes are personalized — now choose who receives it and send.

## Add recipients

Two ways to build your audience:

- **Select Recipients** — choose from your organization's constituents.
- **Upload a CSV** — use the standard recipient format (`first_name`, `last_name`, `email`, plus any custom fields you want available as merge tags). Download the **Constituents Template (CSV)** from the recipients step to start from the right columns.

You can add recipients when you create the video, or click **Skip for now** and add them later from **Preview & send** with **Add Recipients**.

Your recipients become the people each personalized video is generated for. The more complete their records, the better the personalization — see [Importing constituent data](../crm-and-data/importing-constituent-data.md).

## Preview each person's version

Click **Preview & send** to see your recipient list, then click **Preview** next to anyone to watch the exact video they'll receive — their name in the scenes, their data in every merge tag. The preview opens in a new tab, where you can step through recipients with the arrows or search for a specific person. Previewing a few people, especially those with the least-complete records, is the surest way to catch a blank merge tag before it goes out.

## Send

In **Preview & send**, click **Send Video Messages**. This opens [Storyraise Send](../distribution-and-engagement/email-distribution.md) in a new tab with your video already loaded: each recipient gets an email with your message, your video thumbnail, and a **Watch Video** button that opens their personal viewing page. There's no app or login for them — it just plays.

<!-- TEAM REVIEW: sending moved to Storyraise Send. The deployed video app (storyraise-video branch,
     public/compose/index.html ~1110-1126) comments out the old in-app send button and links
     "Send Video Messages" to https://send.storyraise.com?video-message-id={id}; Send (storyraise-mail
     stepper, public/send/modules/SourceLoaders.js buildVideoEmailBlocks) builds the email as message
     text + thumbnail + "Watch Video" button. email-distribution.md now describes Send as live (2026-10-15 audit);
     still confirm every Video customer can use Send. Send's SMS channel is limited to an allowlist of
     internal orgs (public/feature-flags.js), so this page deliberately doesn't mention text messages. -->

## Sending through your own platform

Prefer your existing email or CRM tool? Use **Get a link** to generate either:

- **Standard Link** — the same video for everyone (no personalization). Merge tags are left blank, so check that scenes like `Hi, @@first_name@@!` still read well without a name.
- **Dynamic Link** — type the platform you'll send from and click **Get Video Link For** it. Storyraise builds a personalized link with that platform's email merge field in it, so each contact opens their own version. Only people on the video's recipient list get a personalized version; anyone else sees the merge tags blank.

When you use a dynamic link, check the part of the URL between `?for=` and the next `/` — it must be the right merge variable from your email tool or CRM, or everyone will see the same version.

## What recipients experience

A clean, mobile-friendly viewing page: your personalized video with captions they can toggle, scene-by-scene navigation, and your message below it — logo, text, and any links you attached.

## Related

- [Personalized links](../distribution-and-engagement/personalized-links.md) — the same personalization, for reports
- [Video analytics](../distribution-and-engagement/video-analytics.md) — viewing metrics (coming soon)
