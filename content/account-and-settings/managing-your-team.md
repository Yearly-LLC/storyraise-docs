---
title: Managing your team
section: Account & Settings
status: draft
keywords: invite, collaborators, members, roles, remove user, owner, admin, editor, viewer
last_reviewed: 2026-10-15
---

# Managing your team

Storyraise is built for teams. Invite colleagues into your organization so you can build reports together, divide up the work, and review each other's drafts — and give each person the right level of access with **roles**.

Everything on this page lives on the **Team** tab of **Account**.

> **Plan note:** Every plan can see who's on the team, change roles, and remove someone. Inviting new teammates (the invite link) and creating custom roles are included on the Platinum and Precision plans. To change your plan, see [Managing your subscription](managing-your-subscription.md).

## Roles at a glance

Every member has a role that controls what they can do:

- **Owner** — full access, including billing and the team.
- **Admin** — full access; can view billing but not change it.
- **Editor** — create and edit content; can see the team but not manage it.
- **Viewer** — read-only access to content.

You can also create **custom roles** with per-area access (under **Roles** → **+ New custom role**), or give one person different access with **Access…** in the **⋯** menu next to their name. For the full breakdown, see [User roles and permissions](../getting-started/user-roles-and-permissions.md).

## Invite a teammate

Under **Your Team**:

1. Find the **Invite Link** field. Below it, under *New members joining with this link start as*, pick the role new members should join with (the default is Editor).
2. Click **Copy link**.
3. Send the link to your colleague however you like — email, Slack, a message.

When they open the link, they'll see they've been invited to collaborate and can create their account (First Name, Last Name, Work Email, password — or **Sign up with Google**). Once they finish, they join your organization with the role you set and appear in your team list.

The invite link looks like `https://app.storyraise.com/invite/#/…` and is tied to your organization — anyone you share it with can join, so treat it like a shared key. If it's ever shared too widely, click **Regenerate** to invalidate the old link and create a new one.

<!-- TEAM REVIEW: per-email invites (send an invite to a specific address with a chosen role) are built but temporarily hidden while email delivery is being verified. Document that flow here once it's re-enabled. -->

## Change someone's role

In the **Your Team** list, each member shows a role selector. Pick a new role to change their access immediately. A couple of guardrails keep you safe:

- There's always at least one **Owner**.
- Only an **Owner** can change another Owner's role.
- To hand ownership to someone else, the current Owner opens the **⋯** menu next to that person and chooses **Make Owner**. The current Owner becomes an Admin.

## Remove a teammate

In the **Your Team** list, click **Remove** next to the member, then **Remove from this organization**. Removing someone revokes their access to your organization's reports and data right away.

If your organization uses [single sign-on](single-sign-on.md), the removal sticks: they aren't added back when they next sign in through SSO. It's still good practice to remove them in your identity provider too. To bring someone back, invite them again.

## Working together without stepping on each other

Teammates can build different reports simultaneously, or collaborate on the same one. To prevent overwrites, Storyraise **locks a section while someone is editing it** — you'll see when a colleague is in a section, and you can work in any other section meanwhile. See [Editing content](../building-reports/editing-content.md).

## Tips

- **Match the role to the need.** Give Viewer to stakeholders who only review, Editor to people building reports, and reserve Admin/Owner for those who manage the account.
- **Remove departing staff promptly** to keep your reports and constituent data secure.
- **Coordinate on big reports.** Section locking prevents collisions, but a quick "I've got the financials section" still saves confusion.

## Related

- [User roles and permissions](../getting-started/user-roles-and-permissions.md)
- [Setting up your account](setting-up-your-account.md)
