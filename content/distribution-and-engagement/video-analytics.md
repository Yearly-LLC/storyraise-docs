---
title: Video analytics
section: Sharing & Analytics
status: draft
last_reviewed: 2026-10-30
keywords: video results, who watched, watched half, call next, log call, my constituents, team this week, campaigns, gifts, video views, video metrics
---

# Video analytics

See who watched each video and how far they got, who to call next, what your team sent this week, and what each campaign led to.

<!-- TEAM REVIEW: rewritten 2026-10-30 (was a "Coming soon" stub) against report-builder main
     (a657c6ec, #266 constituent wording): the dashboard's Results page
     (#/{org}/video/{id}/results), My constituents, Team this week and Campaigns views
     (public/index.html, js/video-team.js, js/video-recipient-status.js). Campaigns and Nudge are on
     for every org with Video. Deliberately not documented: the weekly digest email (stays off)
     and Log call writing to the CRM. Campaign gift counts need Donor Signals. -->

Video analytics live in the dashboard under **Videos**, in four views: **Videos**, **My constituents**, **Team this week**, and **Campaigns**. Every number counts the same way: **Watched half** means a constituent saw at least half of the video.

## Results for one video

Open a video's results from its card on the Videos list (**See who watched**, or the **⋯** menu), from **Full results** in the editor's **Results** step, or from **Results** next to anyone in My constituents. The other videos are listed down the left so you can move between them.

![The Results page for Help Fill Pantry Shelves This Winter, tagged Holiday Appeal 2026: 6 constituent plays, 2 other views, 5 of 10 constituents watched half, 4 to call next and 1 called; a Where viewers stopped chart; a Call next list with each person's percent watched; a prompt to send to the 2 constituents who haven't been sent it; and a row for Priya Valentine, Opened, with Log call and Record a follow-up](/assets/img/howto/video_results.png)

The numbers at the top:

- **Constituent plays** — plays by people you sent it to.
- **Other views (you, team, link)** — your own previews, teammates, and the same-for-everyone link.
- **Constituents you sent it to watched half** — for example, 4 of 10.
- **To call next** — and how many you've called.

Under them:

- **Social** — views from each social post's own link, by platform. Storyraise counts views from a post, never who viewed.
- **Where viewers stopped** — how many viewers (anyone, not only constituents) were still watching from start to end.
- **Call next** — constituents who watched at least half and haven't had a call. A call this week is the best time to talk; their phone number is right there.
- If some people on the video haven't been sent it yet, a line says how many, with a button to send it to them through Storyraise Send.

Then one row per person, with a bar for how much they watched and their status:

| Status | Meaning |
|---|---|
| **Not sent** | On the video, but nothing has gone to them. |
| **Shared (not confirmed)** | Their link was copied or drafted, but not confirmed sent. |
| **Sent** | Sent, not opened yet. |
| **Opened** | Opened their link, not watched yet. |
| **Watched some** / **Watched half** / **Watched most** / **Watched it all** | How far they got: a quarter, half, three quarters, or the end. |
| **Clicked** | Pressed your page's button (give, story, or report). |
| **Replied** | Pressed the Reply button. |
| **Called** | A call was logged after the video. |

From a row you can call (on a phone or a computer that can place calls), click **Log call** and pick **How did it go?** — **Reached**, **Left a voicemail**, or **No answer** — or click **Record a follow-up** to open a new thank-you for them. **Open in editor** and **Refresh** are at the top of the page.

The editor's own **Results** step shows the same thing in brief: the views, how far people watched, and each person's status, with **Copy link** next to each name. Until the video has been sent to anyone, it says **Not sent to constituents yet**, and the views shown are your own link and previews.

## My constituents

**My constituents** lists everyone you've sent a quick thank-you and what they did with it — status, how much they watched, and which video. Counts across the top show how many to call next, watched half, called, and sent but not opened. Sort by **Most recent**, **Call next first**, or **Name**. Owners and Admins can switch between **My thank-yous** and **Everyone's**.

## Team this week

Owners and Admins see **Team this week**: videos sent and watched by each teammate, Monday to Sunday.

![Team this week: a four-week chart of Sent and Constituents who watched half, and a table with columns Teammate, Sent, Watched half, Called, Videos made and 4 weeks](/assets/img/howto/video_team.png)

- A chart of the last four weeks shows **Sent** and **Constituents who watched half**.
- The table lists each **Teammate** with **Sent**, **Watched half**, **Called**, **Videos made**, and a four-week trend. Someone with nothing sent this week is marked **No sends this week**.
- Click a name to see that person's week, their videos, and everyone they've sent a video.

### Nudge a teammate

Next to a teammate's name, click **Nudge** to email them their **Who to thank** list: constituents who watched half and haven't had a call, and new gifts nobody has thanked. Confirm with **Send nudge** (or **Cancel**). You can nudge each teammate once a day — afterward their row says **Nudged today** — and the email respects their email settings. The same button (**Nudge** and their first name) is on a teammate's own page.

Earlier weeks update every morning. If nobody has sent a video in four weeks, the view says so instead of showing an empty chart.

## Campaigns

Tag videos with a campaign to see what each one did: who watched, who you called, and gifts that followed.

1. Open **Campaigns**, type a name under **New campaign name**, and click **Add campaign**.
2. Tag a video from its Results page (**Campaign**, or **New campaign…** to add one there), from **Count toward a campaign (optional)** when you share it, or from **Campaign** when you start a quick thank-you.

![Campaigns: a New campaign name field and Add campaign, and a row for Holiday Appeal 2026 with 2 videos, 11 sent, 6 of 11 watched half, 1 called, and Gifts within 30 days reading Next update](/assets/img/howto/video_campaigns.png)

Each campaign shows its **Videos**, **Sent**, **Watched half**, **Called**, and **Gifts within 30 days**. Gifts come from [Donor Signals](/donor-signals/): a gift counts when the constituent watched at least half of one of the campaign's videos and gave within 30 days after. A gift after videos from two campaigns counts once, for the most recent one. Gifts are added up every morning, so a new campaign reads **Next update** until then. **How gifts are counted** on the page says the same.

## On Home

If your organization has Storyraise Video, Home has a video card. Before anything is sent, it suggests people to thank and a button to start. After that, **Videos this week.** shows plays in the last seven days, how many constituents watched at least half, your top video, and **Watched this week** — each person with **Call** and **Record a follow-up**.

## Related

- [Managing your videos](../storyraise-video/managing-your-videos.md) — the Videos list
- [Sending, sharing, and downloading](../storyraise-video/sending-and-recipients.md)
- [Understanding report metrics](understanding-report-metrics.md) — the same ideas, for reports
