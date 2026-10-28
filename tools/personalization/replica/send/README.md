# Send screen: the drafted email and the send flow

One read-only demo screen, `personalization/demo/send.html`, captured from the deployed
Storyraise Send app: a read-only worktree of deploy-send's `stepper` branch at
`/Applications/MAMP/htdocs/yearly-v3/deploy-send-demo` (origin/stepper `13d5456`; the SHA is
recorded in `capture.json → sendSha`). Never edit or commit in that worktree.

| State | What it is | Tour anchors (`data-tour`) |
|---|---|---|
| `draft` (default) | The composer (`/?report-id=…`): the email Send drafts for the report | `email`, `view-button`, `review-send` |
| `preview` | `/send/` step 1, the "2026 Impact Report donors" list selected, previewing as Emily Wilson | `steps`, `email` (the preview iframe), `list-banner`, `preview-as` |
| `recipients` | Step 2, all six on the list selected | `steps`, `recipients` (Selected pane), `list` (the list chip) |
| `schedule` | Step 3 | `steps`, `schedule` ("Sending now to 6") |

The composer and the `/send/` flow are two pages with two stylesheets, so the screen ships
`send.css` (preview, recipients, schedule) and `send-editor.css` (draft); the runtime enables
one per state and puts that state's body attributes back (`body.send-page`, `data-no-tabs` …).
Images are `img/send-*`, fonts `fonts/send-*`.

```bash
export SR_CHROMIUM=~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell
node replica/send/capture.mjs   # live Send → .cache/replica/send/capture.json + app-shots/
node replica/send/build.mjs     # capture → personalization/demo/send.html, send.css, send-editor.css
node replica/send/verify.mjs    # boxes within 2px, all live text, no off-page requests, no errors, click-through
```

Ports: 5077 capture, 5078 check. `capture.mjs` needs `.cache/replica/report/page-source.json`
(the report's title, slug and cover, from the report capture).

## How the capture stays off production

`fake-firebase.js` (copied from `replica/report/`) replaces the Firebase 7.13.2 SDK with an
in-memory database seeded by `seed.mjs`: org `harbor-lights`, the six donors from
`fixtures/constituents.json` (each on list `impact-2026-donors`, "2026 Impact Report donors"),
user `u/demo-admin-harbor`, and `reports/-HLIMPACT2026demo` (title, slug, cover only). Writes
stay in `window.__SR_FAKE_WRITES`.

Cloud Functions are answered in `harness.mjs`: `get_constituents` from the fixture,
`get_org_email_config` as a verified `harborlights.example` domain (`hello@harborlights.example`),
`loadStorygramHistory` as "no history" so the composer drafts fresh, everything else
`{success:true}`. `preview_email_html` answers 503 on purpose: Send then draws the preview with
its own client renderer (`EmailRenderer`). Trackers, `auth.storyraise.com`, SendGrid and Lob are
aborted. Since the page is served from 127.0.0.1, Send itself routes functions to
`localhost:5001`, which the harness intercepts too.

Send's own code renders every state: the composer's `loadCustomReportTemplate` builds the draft,
`?list=` makes `SeedLoader._selectList` pick the six donors (and show the "6 recipients added
from …" banner), and the preview merges Emily's fields into "Hi Emily,".

## Traps

- **Body attributes matter.** The `/send/` CSS keys on `body.send-page` and
  `body[data-no-tabs]`; without them the header grows 18px. They are also purge content, or
  PurgeCSS drops those rules.
- **The preview stage is scrolled.** It centres a 1920px email by scrolling its container; the
  capture records `scrollLeft` as `data-sr-scroll`, and the runtime re-applies it after the
  stylesheet and the email frame load (before that nothing overflows).
- **The email is a sandboxed `srcdoc` iframe.** Scripts in it are stripped (they only log
  blocked-execution errors) and its links point at `#`.
- Send lowercases names from `_SR_full_name` in its lists ("emily wilson"); that is the product.
- Playwright treats `aria-disabled` controls as not clickable; the click-through forces it.
