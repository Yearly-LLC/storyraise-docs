---
title: Sending, sharing, and downloading
section: Storyraise Video
status: draft
last_reviewed: 2026-10-30
keywords: send, share, send to constituents, storyraise send, copy link, copy for email, crm link, salesforce, blackbaud, gmail, outlook, download, mp4, reels, tiktok, linkedin, recipients
---

# Sending, sharing, and downloading

Send each constituent their own page through Storyraise Send, copy one link for everyone, use a personalized link in your CRM, or download a video file.

<!-- TEAM REVIEW: verified against report-builder main (a657c6ec, #266 constituent wording) with the
     new editor on for every org with Video. Sending hands off to Storyraise Send
     (send.storyraise.com?video-message-id={id}); Send builds the email as message text + thumbnail
     + "Watch Video" button. Send's SMS channel is limited to an allowlist of internal orgs, so this
     page doesn't mention text messages. video_send and video_render are on for every org with
     Video (confirmed 2026-10-30). -->

## Share

Click **Share** at the top of the editor. **Share your video** has three parts.

![The Share your video window: Send to constituents, with how many constituents are on the video, a Count toward a campaign (optional) menu set to Holiday Appeal 2026 and a Send to constituents button; Same link for everyone, with the link, Copy link and Copy for email; then Sending from Salesforce, Blackbaud or another CRM? and Other ways](/assets/img/howto/video_share.png)

### Send to constituents

Each constituent gets their own page with their name in it. The card tells you how many people are on the video; click **Send to constituents** to see them.

The **Send to constituents** list shows everyone on the video, each with a status such as **Not sent yet**:

- **Preview** opens that person's page in a new tab — their name in the scenes, their data in every field. Step through people with the arrows or search for someone. Preview a few, especially those with the least complete records.
- **Add constituents** adds more people: search your organization's constituents, tick them, and click **Add**.
- **Email them in Send** opens [Storyraise Send](../distribution-and-engagement/email-distribution.md) in a new tab with your video loaded. Each person gets an email with your message, your video's thumbnail, and a **Watch Video** button that opens their own page. Nothing goes out until you send it in Send.

![The Send to constituents list: each person with their email, a status such as Not sent yet, Sent, Viewed, Watched or Clicked, and a Preview button; Add constituents and Email them in Send at the bottom](/assets/img/howto/video_send_list.png)

You can also open this list from **Send to constituents** on the **Your page** step, and from **Results** when nobody has been sent the video yet.

**Count toward a campaign (optional)** on the card tags the video with a campaign. See [Video analytics](../distribution-and-engagement/video-analytics.md).

### Same link for everyone

One link that plays your video for anyone. There's no personalization: a first name reads as "friend", so check that a scene like "Thanks, **First name**!" still reads well.

- **Copy link** copies the link.
- **Copy for email** copies a preview that plays in the inbox, linked to your video — paste it straight into an email.
- **Design your page (optional)** opens your page in the report builder if you want more around your video.

### Sending from Salesforce, Blackbaud or another CRM?

Open this to get a personalized link for an email you send from your CRM or email platform. Under **Where will you send it from?**, pick the platform, then click **Copy link for** it (for example, **Copy link for Salesforce**). The link carries that platform's email merge field, so each contact opens their own page. **Show the tag** reveals the link so you can check it.

Only people on the video's recipient list get a personalized page; anyone else sees the general version. Check the part of the link between `?for=` and the next `/` — it must be the right merge field for your platform, or everyone will see the same version. Send yourself a test before you mail everyone.

### Other ways

- **Gmail** and **Outlook** open an email draft with your video in it.
- **Pick a list in Send** opens Storyraise Send so you can choose one of your lists there.
- **Pick constituents** suggests people from Donor Signals (up to 25 in one Send draft), each with their own link.

## Copy email link from the Videos list

You don't have to open the editor to share a recorded video. On the Videos list, open a video's **⋯** menu and click **Copy email link**. Click **Copy link** and paste it into your email; each person who opens it sees your video, and you see who watched.

![The Copy email link window: Copy link, Preview as a real recipient and Show link, then Personalize for each constituent (optional) with an Email tool menu set to Mailchimp](/assets/img/howto/video_copy_email_link.png)

- **Show link** reveals the link itself.
- **Personalize for each constituent (optional)** picks your email tool — **Mailchimp**, **Constant Contact**, or **Another email tool** — and adds its merge tag for the email address, so each person's visit counts as theirs. Constant Contact fills in `[[EmailAddress]]` for you; for another tool, type its merge tag (ask whoever sends your newsletter). With Mailchimp connected, Storyraise can build a draft campaign with the link in it; it never sends it.

## Download the video file

Click **Download** at the top of the editor (or on the **Your page** step) to make a video file you can post or keep. Everyone gets the same file, so first names show as "friend".

![The Download window: Everyone gets the same file. Names show as "friend." Shape choices Wide, 16:9 (selected), Phone, 9:16 and Square, 1:1; Captions: a separate .srt file with Change; Make my Wide video; and Made for each app (optional)](/assets/img/howto/video_download.png)

1. Pick a shape: **Wide, 16:9**, **Phone, 9:16**, or **Square, 1:1**.
2. Check the captions line (for example, burned in, word by word) and click **Change** to adjust it.
3. Click the make button, which names the shape (for example, **Make my Phone video**). It usually takes about a minute. You can close the window; Storyraise tells you when it's ready, with a button to download it.

**Made for each app (optional)** makes a version for each kind of post — **Reels, TikTok, Shorts** (Phone, up to 60 seconds), **Instagram and Facebook feed** (Square), and **LinkedIn and YouTube** (Wide, with captions as a separate .srt file). Click **Make** for one, **Customize** to adjust it, or **Make all versions**. **Cover picture and post words** gives you a cover frame, the words for each app, and a link for your post.

## What constituents experience

A clean, mobile-friendly page: your video with captions they can turn on or off, scenes with their name in them, and your words and button below. No account, app, or download needed.

## Related

- [Personalized links](../distribution-and-engagement/personalized-links.md) — the same personalization, for reports
- [Video analytics](../distribution-and-engagement/video-analytics.md) — who watched, and who to call next
- [Managing your videos](managing-your-videos.md) — the Videos list
