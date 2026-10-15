---
title: Single sign-on (SSO)
section: Account & Settings
status: draft
keywords: sso, single sign on, saml, oidc, okta, azure ad, entra, google workspace, identity provider, idp, provisioning, enterprise login, domain
last_reviewed: 2026-10-15
---

# Single sign-on (SSO)

Single sign-on lets your team reach Storyraise through your own identity provider, so access follows the accounts your IT team already manages instead of a separate Storyraise password.

Storyraise supports SAML and OIDC, which covers the common providers — Okta, Microsoft Entra ID, Google Workspace, and others.

## How signing in works

SSO is matched on your **email domain**, so there's no separate sign-in page to remember.

1. Go to the Storyraise sign-in page as usual and enter your work email.
2. If your domain is set up for SSO, you're handed to your identity provider to sign in there.
3. Your provider sends you back and Storyraise opens.

Once SSO is on for a domain, everyone with an email address at that domain signs in through your identity provider — including teammates who used a password or Google before. People at domains that aren't set up for SSO sign in with a password or with Google, exactly as before. Turning SSO on for your organization doesn't change anything for anyone outside it.

## Joining automatically

The first time someone signs in through SSO, Storyraise creates their account and adds them to your organization. There's no invitation to send and no separate onboarding step — if your identity provider lets them through, they're in, unless you've removed them from your team (see **Removing someone** below).

New SSO members join as **Editors** by default, which lets them build and edit but keeps billing, organization settings, and team management out of reach. If you'd like new members to start with a different role, ask us when we set up SSO. Change anyone's role afterwards from your team settings. See [User roles and permissions](../getting-started/user-roles-and-permissions.md).

<!-- TEAM REVIEW: default role is Editor unless o/{slug}.sso_default_role_id is set (functions/sso.js:40,172); it's set by staff via scripts/activate-org-sso.js, not in the UI. "Ask us" wording assumes staff will set it on request. Removal (verified 2026-10-15, PR #162): rbac_remove_member writes o/{slug}/removed_members/{uid}; the SSO grant respects it and sends the user to auth.storyraise.com?error=sso_removed; a re-invite clears it. -->

## Removing someone

To take someone's access away, remove them from your Storyraise team (see [Managing your team](managing-your-team.md)). The removal sticks: they aren't added back the next time they sign in through SSO. Instead they see *"Your access to this organization was removed."* (If they also belong to another Storyraise organization, they're signed in to that one.)

It's still good practice to remove them in your identity provider as well, so their account is closed everywhere at once.

To bring someone back, invite them again. Accepting the invitation restores their access with the role you invited them with.

## Setting it up

SSO is set up with Storyraise rather than switched on from your settings page. We need the connection details from your identity provider and the email domains that should route through it, and we configure both ends.

<!-- TEAM REVIEW: confirm how a customer requests SSO (support email, account manager, sales?) and name it here. Also confirm whether SSO is limited to particular plans. -->

## Related

- [Profile and security](profile-and-security.md)
- [Managing your team](managing-your-team.md)
- [User roles and permissions](../getting-started/user-roles-and-permissions.md)
- [Organization settings](organization-settings.md)
