---
title: Single sign-on (SSO)
section: Account & Settings
status: draft
keywords: sso, single sign on, saml, oidc, okta, azure ad, entra, google workspace, identity provider, idp, provisioning, enterprise login, domain
last_reviewed: 2026-09-08
---

# Single sign-on (SSO)

Single sign-on lets your team reach Storyraise through your own identity provider, so access follows the accounts your IT team already manages instead of a separate Storyraise password.

Storyraise supports SAML and OIDC, which covers the common providers — Okta, Microsoft Entra ID, Google Workspace, and others.

## How signing in works

SSO is matched on your **email domain**, so there's no separate sign-in page to remember.

1. Go to the Storyraise sign-in page as usual and enter your work email.
2. If your domain is set up for SSO, you're handed to your identity provider to sign in there.
3. Your provider sends you back and Storyraise opens.

People at domains that aren't set up for SSO sign in with a password or with Google, exactly as before. Turning SSO on for your organization doesn't change anything for anyone outside it.

## Joining automatically

The first time someone signs in through SSO, Storyraise creates their account and adds them to your organization. There's no invitation to send and no separate onboarding step — if your identity provider lets them through, they're in.

New SSO members join as **Editors**, which lets them build and edit but keeps billing, organization settings, and team management out of reach. Change anyone's role afterwards from your team settings. See [User roles and permissions](../getting-started/user-roles-and-permissions.md).

> **Note:** Because access follows your identity provider, removing someone there is what stops them signing in. Removing them from your Storyraise team as well is what removes their access to your reports.

<!-- TEAM REVIEW: confirm the default role for a new SSO member should be documented as Editor, and whether it is configurable per organization. This is a real grant, so customers will ask. -->

## Setting it up

SSO is set up with Storyraise rather than switched on from your settings page. We need the connection details from your identity provider and the email domains that should route through it, and we configure both ends.

<!-- TEAM REVIEW: confirm how a customer requests SSO (support email, account manager, sales?) and name it here. Also confirm whether SSO is limited to particular plans. -->

## Related

- [Profile and security](profile-and-security.md)
- [Managing your team](managing-your-team.md)
- [User roles and permissions](../getting-started/user-roles-and-permissions.md)
- [Organization settings](organization-settings.md)
