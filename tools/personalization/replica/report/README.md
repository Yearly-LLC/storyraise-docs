# Report screens: builder, web preview, Share

Builds three read-only demo screens in `personalization/demo/` from the real product:

| Screen | States | Tour anchors |
|---|---|---|
| `preview.html` (+ `report.css`) | `emily`, `james`, `lookup` | `previewing-as`, `greeting`, `letter-line`, `level-section`, `lookup` (lookup only) |
| `builder.html` (+ `builder.css`, `canvas.css`) | `gold` (default), `silver`, `bronze`, `tags` | `publish-btn`, `use-data`; `show-when`, `sw-variable`, `sw-condition`, `sw-value` (not in `tags`); canvas: `merge-tags`, `template-line`, `gold-section`, `silver-section`, `bronze-section` |
| `share.html` (shares `builder.css`) | `platform` (default), `link`, `team` | `share-btn`, `publish-btn` (the published toolbar: Share + Republish), `send-card`; `platform`, `get-link` (platform); `copy-link`, `team-toggle` (link, team) |

**Captured from** `/Applications/MAMP/htdocs/yearly-v3/builder-share-fix`, branch `fix/share-team-checkbox`, at origin/main `11e8a512` plus that branch's uncommitted `public/builder/index.html` fix. The fix stops `.modal .form-item input` from drawing the "Sending to my team" checkbox as a full-width bar. `seed.mjs` exports `BUILDER_PATH`, and `capture.json` records `builderSource` (path, branch, sha, dirty files). Repoint `BUILDER_PATH` to the main checkout once the fix merges. The verify script checks that the box is at most 24px and its label sits on one line inside the modal.

The Intro page's `@@letter@@` paragraph (`#izt0l`) is a template sentence written with variables. `fixtures/report-intro.json` has it, and `seed.mjs` swaps it into the cached project_data. Share is captured from a second, published copy of the report (`REPORT_ID_PUB`), and the builder from the unpublished one.

```bash
export SR_CHROMIUM=~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell
node replica/report/capture-report.mjs   # live product → .cache/replica/report/capture.json + app-shots/
node replica/report/build-report.mjs     # capture → personalization/demo/
node replica/report/verify-report.mjs    # boxes within 2px, all live text, no off-page requests, no errors
```

## How the capture stays off production

`fake-firebase.js` replaces the Firebase 7 SDK (served in place of `firebase-app.js`; the other SDK files are emptied). It is an in-memory RTDB + Firestore + auth seeded by `seed.mjs` from the frozen fixtures, and it records writes in `window.__SR_FAKE_WRITES` without sending them anywhere. Cloud Functions are stubbed in `harness.mjs`: `report_constituent` answers `?for=` from the fixture, `get_org_email_config` says the domain is verified, everything else returns `{}`. Trackers and `app.storyraise.com` are aborted. The live demo report is never opened.

The product's own code renders every state. report.js does the merge-tag replacement and runs the Show When conditions for each recipient. The capture fails unless Emily sees only Bronze and James only Gold. The builder's Vue fills Use Data > Show When from the selected section, and the Share modal's own "Get report link" makes the Mailchimp link.

## Runtime (`screen.js`, inlined)

- `window.SRScreen = { name, states, setState(name) → Promise, getState, ready(), getTarget(id), getTargets(), getTargetRect(id), scrollToTarget(id, block), onChange(fn) }`.
- `getTargetRect` returns viewport coordinates in the screen document, including anchors that live on the builder canvas, which is a `srcdoc` iframe. The rect is clipped to the canvas; `.unclipped` has the raw box.
- On every state change it posts `{sr:'state', screen, state}` to the parent. Preview/Publish in the builder and Cancel in Share post `{sr:'navigate', screen}`. Opened on its own, the page navigates instead.
- `?state=<name>` picks the initial state.

## Canvas at other widths

Each canvas template records the selected block (`data-scroll-to`) and its captured offset from the canvas top. `screen.js` scrolls to that block at any frame width rather than to the captured pixel offset; at 1200 or 1024 wide the sections are taller and a fixed offset lands in the wrong section. GrapesJS's selection badge and toolbar, and the product's in-canvas `#sr-badge-host`, were placed for the 1001px capture width, so they are hidden whenever the canvas is a different width. The verify script checks at 1200 and 1024 that each state's own section is in view.

## Traps

- CSSOM `cssText` drops shorthands written with `var()`: they serialize as empty longhands, which lost every builder field border. Linked sheets come from source, and inline sheets use their own text unless rules were inserted at runtime.
- `report-base.css` `@import`s Tailwind and daisyUI. Imports are inlined before purging.
- PurgeCSS needs html/body wrappers on fragments, or the report's `html{font-size:14px}` goes. It also needs attribute-aware extraction to keep `[data-layout=…]` rules.
- Hidden markup is pruned per state (display none, closed drawers and modals, datalists). That takes the builder from 150 KB to 16 KB per state.
- `#publish-modal` is not unique in the builder; scope to `#my-modal-2 + .modal`.
