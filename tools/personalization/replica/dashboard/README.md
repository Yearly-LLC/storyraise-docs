# Dashboard screens: Constituents and the constituent profile

Two static, read-only screens of the personalization demo, captured from the real dashboard
(`builder/public/index.html` + `js/app-dashboard.js` at `config.json → builder.sha`).

| Screen | States | Tour anchors (`data-tour`) |
|---|---|---|
| `personalization/demo/constituents.html` | `list`, `add-csv`, `map` | `add`, `rows`, `csv`, `upload`, `map-core`, `map-custom`, `import` |
| `personalization/demo/profile.html` | `profile` (Emily Wilson's drawer) | `profile-head`, `variables` (+ `data-tour-also` on the Variable/Value header), `tag-donor-level`, `add-variable` |

Both share `demo/dashboard.css`, `demo/fonts/material-symbols-outlined-dash.woff2` and `demo/img/dash-*`.

## Commands

```bash
cd tools/personalization
node replica/dashboard/capture.mjs   # → .cache/replica/dashboard/{capture.json, app-shots/}
node replica/dashboard/build.mjs     # → personalization/demo/{constituents,profile}.html, dashboard.css
node replica/dashboard/verify.mjs    # parity + click-through; built shots in .cache/replica/dashboard/built-shots/
```

Ports: 5051 for the capture (5050 is the builder/preview capture's, so both can run at
once), 5076 for the check. Chromium: `SR_CHROMIUM`, defaulting to the cached headless shell 1234.

## What is stubbed

- **No reads or writes reach Firebase.** Every request to Firestore, RTDB, Cloud Functions and
  Identity Toolkit is aborted; HubSpot, GTM, GA, tracking and the idle timeout are too. The auth
  redirect line in `app-dashboard.js` is patched out (the capture throws if that line changes).
- **State is injected** on `#dashboard.__vue__`: a Harbor Lights admin, `subscription.type:
  'precision'`, and the six donors in `fixtures/constituents.json` on the legacy in-memory list
  (`constituents_meta = null`, so the paged index path stays off). The fetchers
  (`fetch_constituents`, `fetch_signals`, …) are replaced with no-ops.
- **The CSV step** runs the product's own `open_import_mapping` on
  `fixtures/harbor-lights-constituents.csv`, parsed with the page's Papa; the column
  auto-match is the product's `suggest_field_mapping`.
- The sidebar is hidden, and builder-style.css's `left: 16rem` offset on `[data-dashboard-main]`
  undone, on the live page too, so the parity shots compare like with like.

## Runtime

`replica/dashboard/screen.js` is inlined into each screen. It exposes
`window.SRScreen = { name, states, setState, getState, getTarget, getTargetAlso, getTargets }`
and posts `{sr:'state', screen, state}` to the parent on every change (plus `ready: true` on
load). Controls that move: Add constituents (list ⇄ add-csv), Upload CSV (→ map), Cancel and
Esc (→ list), a click on the dimmed list (→ list). Emily's row and Done Editing ask the host for
the other screen with `{sr:'navigate', from, screen}`; standalone, they change `location`.
Everything else is `data-inert` and shows "This is a read-only demo."

## Traps

- **`current_constituent` must reset to `false`, not `null`.** The drawer's template calls
  `Object.entries(current_constituent)`; `null` throws inside Vue's render, and from then on
  the page silently stops patching (the dimmed list behind the add card never appeared).
- **futura-pt** (the drawer's name line) is Typekit, served only to the product's domains. The
  build gives it a local Futura → Avenir Next → sans stack, which is what customers see on macOS.
