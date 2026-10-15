---
title: Your profile and security
section: Account & Settings
status: draft
keywords: mfa, 2fa, two-step verification, sms, text message, password reset, login, sign in, session timeout, idle, inactivity, signed out, sso
last_reviewed: 2026-10-15
---

# Your profile and security

This page covers your personal account — your name and sign-in details — and how to secure it with two-step verification.

## Your info

Open **Account** and stay on the **General** tab. Under **Your Info** you can:

- **Your Name** — edit it and click **Save name**. This is how you appear to your teammates.
- **Update email** — change the address you sign in with.
- **Update password** — set a new password.
- **Default organization** — if you belong to more than one organization, choose where you land when you sign in (or **Ask me each time**).

## Resetting a forgotten password

If you can't sign in, click **Forgot password?** on the sign-in page, enter your email, and click **Send reset email**. You'll see *"Check your inbox for a reset link."* Follow the link in that email to set a new password.

If your organization uses [single sign-on](single-sign-on.md), you sign in through your identity provider instead, so password resets are handled there.

## Verify your email

Before you can turn on two-step verification, your email address must be verified. If it isn't yet, the MFA section shows *"You must verify your email before enabling multi-factor authentication."* Click **Verify Email**, then click the link in the email Storyraise sends you and return to your settings.

## Two-step verification (MFA)

Two-step verification adds a second check at sign-in, so a stolen password alone can't get into your account. Storyraise uses a code sent to your phone by text message (SMS).

To turn it on, open **Account** → **General** and find **Multi-factor Authentication (MFA)**:

1. Under **Your Mobile Phone Number**, enter your number in international format (e.g. `+15551234567`).
2. Click **Enroll in SMS MFA**.
3. Confirm your password when asked (or sign in with Google again, if that's how you sign in).
4. Enter the 6-digit code you receive by text to confirm.

Once enrolled, the section shows the last four digits of your number. Use **Update Phone Number** if you switch phones, or **Turn off two-factor** to remove it.

## Signing in with two-step verification

Once you're enrolled, sign in as usual with your password or with Google. Storyraise then shows **Check your phone** and texts a 6-digit code to the number ending in the digits shown. Enter the code and click **Verify** to finish signing in. If the text doesn't arrive, click **Send a new code**.

Two-step verification is set per person: each teammate turns it on for their own account, and admins can't require it for the whole organization. If your organization uses [single sign-on](single-sign-on.md), you sign in through your identity provider, and any second step is handled there.

## Session timeout

Storyraise signs you out after **15 minutes** of inactivity, so an unattended machine doesn't leave your reports and constituent data open.

Two minutes before that you get a warning with a countdown, and any activity clears it — nothing in the builder is lost without you being told first. Activity counts across every Storyraise tab you have open, so working in one tab won't get you signed out by another sitting idle.

## Tips

- **Turn on two-step verification.** It takes a minute, and it keeps your account — and your donors' data — safe even if your password leaks. Encourage everyone on your team to do the same.
- **Update your number before you switch phones.** Only one phone can be enrolled. If you lose access to it, contact [our support team](https://storyraise.com/support).

## Related

- [Setting up your account](setting-up-your-account.md)
- [Managing your team](managing-your-team.md)
- [Single sign-on (SSO)](single-sign-on.md)
