---
title: Network requirements and troubleshooting
section: Resources
status: draft
last_reviewed: 2026-06-18
keywords: firewall, allowlist, whitelist, IT, network, blocked, not loading, images missing, fonts, logged out, proxy, VPN, school, corporate
---

# Network requirements and troubleshooting

Storyraise is a web application, and your published reports are web pages. Both rely on a handful of Google, Firebase, and Storyraise services loading in the browser. Most networks allow these without a second thought — but some **school, hospital, government, and corporate networks** run strict firewalls or content-inspection proxies that block them.

When that happens, the symptoms are specific and consistent:

- The builder loads slowly, freezes, or **logs you out unexpectedly** and makes you sign back in.
- A published report opens, but **images don't appear** and **fonts look wrong** (the text falls back to a plain system font).
- It works fine from home or on your phone, but not at the office or on campus.

If that sounds familiar, the report itself is fine — the network is filtering the services it needs. This guide helps you confirm that and gives your IT team exactly what to allow.

## First: confirm it's the network

Before involving anyone, run this 30-second test:

1. On your phone, turn **Wi-Fi off** so you're on cellular data.
2. Open the report link (or sign in to the builder).

If everything loads correctly on cellular but not on your work or school Wi-Fi, the cause is confirmed: your network is blocking Storyraise's services. Share the section below with your IT department.

## Allowlist for your IT team

Ask your IT team to allow the following domains through the firewall and any web filter — for the people who **build** reports *and* anyone who will **view** a published report.

```
# Sign-in and the app
auth.storyraise.com
yearly-bv3.firebaseapp.com
yearly-bv3.web.app
accounts.google.com
apis.google.com

# Core services (sign-in, live data, image hosting)
identitytoolkit.googleapis.com
securetoken.googleapis.com
firestore.googleapis.com
firebasestorage.googleapis.com
www.gstatic.com
us-central1-yearly-bv3.cloudfunctions.net
*.firebaseio.com

# Published reports, fonts, and images
*.yearly.report
fonts.googleapis.com
fonts.gstatic.com
yearlyreport.cloud
images.unsplash.com

# Front-end libraries
cdn.jsdelivr.net
unpkg.com
cdnjs.cloudflare.com
code.jquery.com
use.typekit.net
```

<!-- TEAM REVIEW: confirm we're comfortable publishing the project-specific domains (yearly-bv3.firebaseapp.com, the cloudfunctions.net host) in a public article. They're visible in any network trace, but flagging in case we'd rather list only wildcards. Also confirm the cloud-functions region/host stays us-central1. -->

## Important: allowing the domains may not be enough

This is the single most common reason IT troubleshooting "doesn't stick":

> If your network runs **SSL inspection** (also called deep packet inspection, TLS interception, or a content-filtering proxy), it can break Storyraise even when the domains above are technically allowed.

The builder keeps a **live connection** to `firestore.googleapis.com` to load and save your work, and refreshes your sign-in token through `securetoken.googleapis.com`. Inspection proxies frequently sever these connections mid-stream — which is exactly what produces the random freezes and surprise logouts. Ask your IT team to **exclude these domains from SSL/content inspection**, not just add them to an allow list.

## How IT can see exactly what's blocked

Your IT team can get a precise list of what your network is dropping:

1. Open the report or builder in Google Chrome on the affected network.
2. Press **F12** to open Developer Tools and click the **Network** tab.
3. Reload the page.
4. Any requests shown in **red** (failed or blocked) name the exact domains being filtered.

The **Console** tab (also under F12) often shows matching "blocked" or "failed to load" messages. A screenshot of either tab tells IT precisely what to fix.

## Symptom-to-cause quick reference

| What you see | Usually means |
| --- | --- |
| Builder freezes or logs you out repeatedly | `firestore.googleapis.com` / `securetoken.googleapis.com` blocked or SSL-inspected |
| Report opens but images are missing | `firebasestorage.googleapis.com` or `yearlyreport.cloud` blocked |
| Fonts look plain or wrong | `fonts.googleapis.com` / `fonts.gstatic.com` blocked |
| Can't sign in at all | `auth.storyraise.com`, `accounts.google.com`, or `identitytoolkit.googleapis.com` blocked |
| Works on cellular, not on Wi-Fi | Network firewall — apply the allowlist above |

## Before you share a report widely

If your own network filters these services, the people you send the report to may be on similar networks (especially other staff at the same organization). A couple of habits prevent surprises:

- **Spot-check the published link on cellular** before sending it out, to confirm it renders correctly when nothing is filtered.
- For an internal reviewer who's stuck behind a strict firewall, you can **export a PDF** of the report from the builder and send them the file directly while IT sorts out the network. See [PDF exports](../getting-started/pdf-exports.md).

## Still stuck?

If your IT team has applied the allowlist (and excluded the domains from SSL inspection) and you're still seeing problems, reach out to support with a screenshot of the Chrome **Network** tab from the affected network — it tells us exactly where the traffic is being stopped.
