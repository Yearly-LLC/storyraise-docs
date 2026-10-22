---
title: Adding a poll
section: Building Reports
status: draft
keywords: poll, polls, quiz, quizzes, poll/quiz, vote, voting, survey, question, multiple choice, single choice, results, tally, reader poll, ask readers, poll results, polls & quizzes, export votes, respondents, search respondents
last_reviewed: 2026-10-22
---

# Adding a poll

A poll asks your readers a question inside the report and shows the answers as a bar chart. It's the quickest way to turn a report from something people read into something they take part in.

Answers collect under **Poll Results** in that report's Analytics, where you can see them per person and export them.

Want readers to find out whether they were right? The same element can be a quiz — see [Adding a quiz](adding-a-quiz.md).

## Adding a poll

1. In the builder, open the **Insert** bar and choose **Poll/Quiz**.
2. Click the poll to open the **Poll Editor**.
3. On the **Question & Answers** tab, leave **Poll** selected at the top.
4. Type your question and fill in the answers.
5. Click **Done**.

![The Poll/Quiz button on the Insert bar](/assets/img/howto/poll-quiz-insert.png)

A new poll starts empty on purpose: no sample question, no sample answers. An unedited poll shows nothing at all to a reader, so a poll you forgot to finish can never reach a donor with placeholder wording in it.

You can also add a whole **Poll/Quiz** block from the block list (**Add a block**), which gives the poll a section of its own rather than sitting it inside another block.

![The Poll Editor in Poll mode, with a question and three answers filled in](/assets/img/howto/poll-editor-poll.png)

## Answers

A poll needs at least two answers and takes up to ten. Past ten the bars stop being readable stacked in a column, so the editor won't add more.

Each answer gets an accent color, seeded from a set that works together. You can change any of them.

> **Tip:** Keep answers short. Once any answer passes 32 characters, the **Automatic** layout moves every answer's text inside its bar instead of beside it. The editor warns you on the answer that triggers it.

## Settings

The Poll Editor has three tabs: **Question & Answers**, **Voting**, and **Appearance**. Use **Preview** in the editor's header to try the poll before you place it.

**How it behaves**

- **Question** — **Shown** or **Hidden**, at the bottom of the **Question & Answers** tab. Hide it when the surrounding copy already asks the question, so a reader isn't asked twice.
- **Selection** — **Single choice** for one answer per reader, **Multiple choice** to let them pick several.
- **Changing answers** — **Readers can change their answer**, or **One response only** to lock in a reader's first answer.
- **After voting** — **Show everyone the results** reveals the full tally once someone answers. **Confirm their answer only** shows them what they chose and keeps everyone else's answers to you.

**How it reads**

- **Show values as** — counts, percentages, or both.
- **Value position** — after the bar, inside it, or hidden.
- **Answers/Options text** (on the **Appearance** tab) — **Automatic** keeps short answers beside their bar and moves long ones inside it. You can also force **Beside the bar**, **Above the bar**, or **Inside the bar**.

Font, text color, bar height, roundness, and spacing are all on the **Appearance** tab, and brand kit colors appear in every color picker.

## What readers see

A reader picks an answer and the bars animate to the result straight away. Nothing waits on the network, so it feels instant even on a slow connection.

Votes are only recorded on the **published** report. Answering a poll while you're proofing in the builder, in preview, in print view, or in a PDF export does not count — a poll you clicked through while checking your work will never appear in your results.

## Seeing the results

Open the report's **Analytics** and choose the **Poll Results** tab. It appears on any report that contains a poll, and it's called **Polls & Quizzes** once the report has a quiz in it. The **Results → Analytics** link at the bottom of the editor's **Question & Answers** tab takes you straight there once the report is published.

For each poll you get the question, the tally per answer, and a list of who answered. A reader who opened a [personalized link](../distribution-and-engagement/personalized-links.md) is named; anyone else shows as **Anonymous**. Search the list by name or answer, or filter it to one answer. Use **Download CSV** on a poll to download its votes: one row per answer, with the question, the answer, and the respondent's name and constituent ID.

> **Note:** Because a personalized link identifies the reader, poll answers on a personalized report are attributable to a named constituent. Say so in the question if the answer is something people would expect to give anonymously.

## Turn it into a quiz

At the top of the **Question & Answers** tab, choose **Quiz** instead of **Poll**. You mark the correct answer, and each reader finds out whether they got it right, with an optional explanation to follow. See [Adding a quiz](adding-a-quiz.md).

## Related

- [Adding a quiz](adding-a-quiz.md)

- [Editing content](editing-content.md)
- [Adding sections](adding-sections.md)
- [Personalized links](../distribution-and-engagement/personalized-links.md)
- [Analytics overview](../distribution-and-engagement/analytics-overview.md)
