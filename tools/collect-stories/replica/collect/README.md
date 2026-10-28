# Collect screens: new collection, form editor, form link, public form, responses

Five read-only demo screens in `collect-stories/demo/`, captured from the real Collect app:
the `storyraise-collect` branch, checked out read-only as a git worktree at
`/Applications/MAMP/htdocs/yearly-v3/builder-collect-demo` (52a70275). Nothing in that
worktree is edited; its `public/` is served as is.

| Screen | States | Tour anchors (`data-tour`) |
|---|---|---|
| `collect-new.html` | `list`, `types` | `start-new` (list); `types`, `type-thanks` (types) |
| `collect-editor.html` | `form`, `fund` (fund code), `field` (note), `upload` (photo) | `add-fields`, `f-short`, `f-long`, `f-upload`, `get-link` (form); `field-editor`, `save-variable`, `fund-field` (fund); `field-editor`, `save-variable` (field); `field-editor`, `allowed-types` (upload); the three palette buttons in every state |
| `collect-link.html` | `link` | `standard-link`, `copy-link` |
| `collect-form.html` | `filled` (Sophia Ramirez), `photo` (scrolled to the upload) | `form-head`, `f-note`, `f-photo`, `submit` (filled); `f-photo`, `submit` (photo) |
| `collect-grid.html` | `grid`, `drawer` (Sophia, tagged to Emily Wilson) | `grid`, `toolbar`, `row-1`, `col-fund` (header + cells, via `data-tour-also`); plus `drawer`, `assign` |

`collect.css` serves the four app screens; the public form has its own `form.css` (its page
styles differ from the editor's). Fonts are `fonts/col-*`, the org logo `img/col-*`.

```bash
cd tools/collect-stories
export SR_CHROMIUM=~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell
node replica/collect/fetch-photos.mjs     # once: fixture photos into .cache/replica/collect/img
node replica/collect/capture-collect.mjs  # live app → .cache/replica/collect/capture.json + app-shots/
node replica/collect/build-collect.mjs    # → collect-stories/demo/collect-*.html, collect.css, form.css
node replica/collect/verify-collect.mjs   # boxes within 2px, all live text, no off-page requests or errors, click-through
```

Ports: 5067 capture, 5068 verify (5069 free for throwaway probes).

## How the capture stays off production

- **Firebase is fake.** Collect bundles the modular SDK into `main.js`, so it cannot be swapped at a
  script tag. `harness.mjs` patches `main.js` as it is served: the webpack registry entries for
  `firebase/{app,auth,database,firestore,storage}` are replaced by `fake-modular.js`, a modular API
  over the in-memory `fake-firebase.js` (copied from the personalization kit) seeded by `seed.mjs`.
  The public form's Firebase 7 script tags get the same fake. Writes are recorded in
  `window.__SR_FAKE_WRITES` and go nowhere.
- **Functions are stubbed:** `collect_load` answers from the seed; anything else returns `{}`.
- **Media** lives on a fictional `files.harborlights.example`, answered locally. The brand fonts and
  the Storyraise mark the app loads from Storage are served from local copies; every other
  Firebase, Google API, Storage and tracker request is aborted.

## Seed choices (fixture → product shape)

- The fixture's fund field is a dropdown of labels like "F002 STEM Research Endowment", but a dropdown
  stores the label, while the stories and the report's Repeat When hold the bare code. The seed
  makes it a short-text "Your scholarship fund code" (placeholder F004) so the collected value is
  what the repeater matches.
- `hobbies_interests` is dropped from the stories: it is not on the form, and the editor would
  otherwise show "1 new data field found".
- Each story gets `constituents: []` first, which is how tagged rows open in the drawer
  ("Assign to... → Constituents"). The drawer state tags Sophia to Emily Wilson (her fund, F004).
- Story keys are ordered fund_id, student_name, major, class_year, ...: the grid's column order is the
  data's key order (Constituents always first). The capture then widens those four columns, as a
  person dragging the column edges would; auto-size cut the headers to "f…" and "student_…", and the
  view options that change that are commented out in this build.
- A third collection with no type stands in for the moment after **Start new collection**, so the
  editor opens on "What do you want to collect?".

## Traps

- **daisyUI 5 ships CSS nesting.** PurgeCSS judges each rule alone, so every nested `&...` rule was
  dropped (the drawer's collapse never opened). `build-collect.mjs` flattens nesting first,
  distributing parent and child selector lists (an `:is(h1,…,h6)` wrapper got the whole rule purged
  because the page has no `h1`), and splits lists on top-level commas only.
- **daisyUI 5 greys out `[aria-disabled=true]`.** The inert controls carry `data-inert` only; the
  toast is `aria-live`.
- **A hash change on the same page keeps the app's router state.** Each route is loaded from
  `about:blank`.
- An action `<label for=…>` must lose its `for`, or it drives the inert control behind it.
- The public form scrolls inside the app, not the window. The capture marks every inner scroller
  with `data-sr-scroll-top`, and screen.js restores it when a state mounts.
- Icon ligatures are part of `textContent`: match labels on their visible words only.
