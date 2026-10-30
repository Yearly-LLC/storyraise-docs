---
title: Scenes and personalization
section: Storyraise Video
status: draft
last_reviewed: 2026-10-30
keywords: scenes, edit scenes, merge tags, first name, personalize, constituent field, layout, entrance, look, rewrite with ai, friend
---

# Scenes and personalization

Scenes are the words that appear over your video as you speak. Add a constituent's name and each person sees their own name on screen.

<!-- TEAM REVIEW: verified against report-builder main (bbe5229c) with the new editor on for every
     org, "donor" wording changed to "constituent" in the app. Two parts of Edit scenes have their
     own flags: Sound (music, has_feature.video_music) and Footage's Add menu (cutaways and extra
     clips, has_feature.video_broll / video_clips). They're mentioned in one line each below;
     cut those lines if the rollout leaves those flags off. -->

## Edit scenes

When you finish recording, Storyraise writes a few scenes for you — timed text overlays in your template's style. The second step, **Edit scenes**, says **We added a scene for you. Open a part to change it, or add a constituent's name.** It has four parts, each with a short summary next to its name:

- **Footage** — your recording. Drag the teal handles to trim the start and end. If your account has cutaways or extra clips, the **Add** menu adds them here.
- **Scenes** — the words over your video, on a timeline.
- **Sound** — background music, if your account has it, with **Volume** and **Quieter while you talk**.
- **Look** — the overall style.

Click **Next: Edit captions** when you're done.

## Editing a scene

Under **Scenes**, each scene is a block on the timeline showing when it plays (for example, **0:04 to 0:08**). Click a block to select it; drag its edges to change when it starts or ends. Undo and redo sit beside the timeline.

**Simple** (the default) shows four things for the selected scene:

- **Words** — the text, with a style menu (such as **Big title**) and bold and italic. A line under it shows what one constituent will see, for example **James will see:** Thanks, James Taylor.
- **Layout** — where the text sits, such as **Full overlay**.
- **Entrance** — how it arrives, such as **Rise**.
- **Size** — how big the text is.

**More for this scene** holds the rest: **Colors**, **Font**, **Picture** (**Add a picture**, **Insert icon**), **Rewrite with AI** (describe a change, such as "shorter, warmer"), **Timing** (**Starts at** and **Ends at**), **Entrance speed** (**Quick**, **Normal**, **Slow**), and **Remove this scene**. Switch to **Advanced** to see every control at once.

The **⋯** menu beside the timeline adds and remakes scenes. To add one, play the video to the moment you want, open the menu, and click **Add scene at** — the option carries the current time, so the new scene lands where you're paused. The same menu has **Duplicate scene**, and **Remake all scenes** when you want a fresh start.

## Look

**Look** sets the style for every scene at once: **Brand** (from your Brand Kit), **Editorial**, **Bold kinetic**, or **Warm documentary**. **Warmer film look** adds richer color and a soft vignette to your recording while scenes keep your brand colors. **Update from Brand Kit** picks up brand changes, and **Save as your team's look** makes this look your team's starting point.

## Personalizing with constituent fields

This is what sets Storyraise Video apart. In **Words**, click **Insert a constituent field** and pick a field — **First name**, for example. It shows in the text as a chip, and each constituent sees their own value:

> Thanks, **First name**!

becomes "Thanks, Maria!" for Maria and "Thanks, James!" for James. Any field on your constituents can be used, such as last name, giving level, or program name. Fields that hold a person's own email address or phone number aren't offered.

The **add a constituent's name** link at the top of the step opens **Personalize with constituent data**, a searchable list of your fields with **Copy** and **Insert** for each, and **More fields** for the rest. Under the hood, fields are merge tags in the `@@field_name@@` format, the same as [personalized report links](../distribution-and-engagement/personalized-links.md).

**Who sees what:**

- **On each constituent's own page**, fields fill in from their record. Fields fill in for the people on the video's recipient list (see [Sending, sharing, and downloading](sending-and-recipients.md)), matched by email.
- **On the same link for everyone, and in a downloaded file**, there's no one to fill in. A first name reads as "friend", and other fields are left out along with the comma or space before them. Above the stage, **Names: "friend"** reminds you which version you're looking at.

Use **Preview as** on **Your page** to check a particular person's version before you send.

## Tips

- **Put the name on screen early.** Seeing their own name in the first scene tells the viewer instantly that this was made for them.
- **Keep overlay text short.** Scenes punctuate your spoken words — a few words land; a paragraph competes with you.
- **Check your data first.** Someone missing a field a scene uses gets "friend" or a gap where their details should be. Preview a few people before sending — see [Sending, sharing, and downloading](sending-and-recipients.md).

## Next

[Sending, sharing, and downloading](sending-and-recipients.md) — choose who gets the video, check each person's page, and send.
