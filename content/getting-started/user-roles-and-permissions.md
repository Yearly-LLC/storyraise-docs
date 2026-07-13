---
title: User roles and permissions
section: Getting Started
status: draft
keywords: roles, permissions, owner, admin, editor, viewer, custom roles, access, team, invite
last_reviewed: 2026-07-13
---

# User roles and permissions

Storyraise is organized around your **organization**: a shared workspace that holds your reports, videos, forms, constituent data, brand kit, and team. Everyone you invite joins your organization, and their **role** decides what they can see and do.

## How accounts and organizations relate

- Each person signs in with their own account.
- An account can belong to one or more organizations. If you belong to several, you can switch between them from the dashboard.
- Reports, videos, and data belong to the organization, not to individuals — anyone with the right role can pick up where a colleague left off.

## The four built-in roles

Every member has one role. In order of access:

| Role | Best for | What they can do |
|---|---|---|
| **Owner** | The person who runs the account | Full access to everything, including billing and team management. There's always at least one Owner. |
| **Admin** | Trusted team leads | Full access to everything and can *view* billing, but can't change the subscription. |
| **Editor** | People who build and edit | Create and edit reports, videos, forms, constituents, integrations, analytics, brand kit, and tools. Can *see* the team but not change it. No billing or org settings. |
| **Viewer** | Reviewers and stakeholders | Read-only access to content — they can look but not change anything, and can't manage the team or settings. |

## What each role can access

Access to each area is one of four levels: **— (none)**, **View**, **Edit**, or **Manage** (Manage includes creating, editing, and deleting).

| Area | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| Reports & templates | Manage | Manage | Edit | View |
| Videos | Manage | Manage | Edit | View |
| Collect forms | Manage | Manage | Edit | View |
| Constituents (CRM) | Manage | Manage | Edit | View |
| Connections (integrations) | Manage | Manage | Edit | View |
| Health & Actions | Manage | Manage | Edit | View |
| Analytics | Manage | Manage | Edit | View |
| Brand Kit | Manage | Manage | Edit | View |
| Tools | Manage | Manage | Edit | View |
| Team & roles | Manage | Manage | View | — |
| Billing | Manage | View | — | — |
| Organization settings | Manage | Manage | — | — |
| Activity log | Manage | Manage | — | — |

## Custom roles

Beyond the four built-in roles, Owners and Admins can create **custom roles** — pick a name and set the access level for each area individually. Custom roles are useful when someone needs, say, Edit access to Reports and Analytics but only View on Constituents. Assign a custom role to a member exactly like a built-in one.

## Fine-tuning one person's access

Need an exception for a single teammate without making a whole new role? You can set per-member **overrides** that raise or lower their access in specific areas on top of their role. (Overrides don't apply to Owners — an Owner always has full access, which protects you from accidentally locking everyone out.)

## Assigning roles and inviting people

You choose a person's role when you invite them, and you can change it any time from the team list. See [Managing your team](../account-and-settings/managing-your-team.md) for the step-by-step.

A few guardrails:

- There must always be at least one **Owner**.
- Only an **Owner** can grant or remove the Owner role.

<!-- TEAM REVIEW: role names/levels mirror the shipped RBAC model (Owner/Admin/Editor/Viewer; none/view/edit/manage across the 13 areas). Confirm the customer-facing area labels above match the final dashboard wording before publishing. -->

## Working together on reports

Teammates can build different reports at the same time, or work in the same report together. To prevent two people from overwriting each other, Storyraise locks a section while someone is editing it — you'll see when a teammate is in a section, and you can edit any other section in the meantime.

## What your readers see

People who view your published reports are **not** users — they don't need accounts, and they can't see your dashboard, drafts, or data. Publishing only exposes the report itself at its public link.

## Related

- [Managing your team](../account-and-settings/managing-your-team.md)
- [Setting up your account](../account-and-settings/setting-up-your-account.md)
