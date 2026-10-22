---
title: Adding a quiz
section: Building Reports
status: draft
keywords: quiz, quizzes, poll/quiz, correct answer, right answer, quiz question, knowledge check, trivia, explanation, did you know, you got it, not quite, answering, show readers, quiz results, polls & quizzes
last_reviewed: 2026-10-22
---

# Adding a quiz

A quiz asks your readers a question, then tells each of them whether they got it right. It's the same element as a [poll](adding-a-poll.md), with one difference: you mark the correct answer.

<video controls preload="metadata" src="/assets/img/howto/making-a-quiz.mp4"></video>

## Making a quiz

1. In the builder, open the **Insert** bar and choose **Poll/Quiz**.
2. Click **Set up poll or quiz** on the new element, or **Edit Question & Options** in the sidebar.
3. At the top of the **Question & Answers** tab, choose **Quiz**.
4. Type your question and fill in the answers.
5. Click **Correct?** beside the right answer. It changes to **✓ Correct**.
6. Optionally, add an **Explanation** — up to 280 characters, shown to readers after they answer.
7. Click **Done**.

![The Quiz Editor with the correct answer marked and an explanation filled in](/assets/img/howto/quiz-editor-marked.png)

**Done** won't close a quiz until a correct answer is marked.

On a **Single choice** quiz, one answer is correct. To accept several correct answers, switch **Selection** to **Multiple choice** on the **Answering** tab and mark each one — a reader is right only when they pick exactly those.

## What readers see

Once a reader answers, they see **You got it!** or **Not quite. The answer is …**, with the correct answer ticked and your explanation below.

<video controls preload="metadata" src="/assets/img/howto/answering-a-quiz.mp4"></video>

Answers are only recorded on the **published** report — not in the builder or preview.

## Answering settings

On the **Answering** tab:

- **Changing answers** starts at **One response only**, so a reader can't keep answering until they're right.
- **Show readers** chooses what they get back: **Right or wrong, and the answer** (the default), the same **and how everyone answered**, or **Just a thank-you** if you'd rather score it privately.

![The Answering tab](/assets/img/howto/quiz-answering-tab.png)

To check the answered state before publishing, select the quiz and click **Preview Answer** in the sidebar. Nothing is saved.

## Seeing the results

Answers appear in the report's **Analytics**, on the **Polls & Quizzes** tab. When a report has both polls and quizzes, each card is labeled **Poll** or **Quiz**. A quiz card shows:

- **How many got it right** — for example *18 of 24 answered correctly*, with a ring showing the percentage.
- **The most common other answer** — the answer most readers reached for instead, and how many chose it. It's worth a sentence in your next update.
- **The correct answer, ticked** on the bars.

![A quiz card on the Polls & Quizzes tab, with the percentage ring and the correct answer ticked](/assets/img/howto/quiz-dashboard.png)

Grading happens when you open the tab, so if you change a quiz's correct answer, every response is graded again against the new one.

Click **Show who responded** to see each respondent, their answer, when they answered, and a **Result** of **Correct** or **Not quite**. A reader who opened a [personalized link](../distribution-and-engagement/personalized-links.md) is named; anyone else shows as **Anonymous**. Search by name or answer, or filter to **All**, **Correct**, or **Not quite**. The list loads 25 at a time.

![Searching quiz respondents, with the Not quite filter selected](/assets/img/howto/quiz-dashboard-search.png)

Use the filter as a follow-up list: the readers who answered *Not quite* are the ones who'll most appreciate hearing the full story.

**Download CSV** exports one row per answer, with the question, the answer, and the respondent's name and constituent ID, plus **Correct** (Yes or No) and **Correct Answer** columns.

## Related

- [Adding a poll](adding-a-poll.md)
- [Analytics overview](../distribution-and-engagement/analytics-overview.md)
