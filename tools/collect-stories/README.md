# Connections and sync demo tooling

Everything that produces [`/connections-and-sync/`](../../connections-and-sync/): the interactive demo (a read-only replica of the product's Connections page, with Raiser's Edge NXT and Salesforce connected), its numbered tour markers, and the narrated walkthrough video (HyperFrames + ElevenLabs).

Copied from the Donor Signals kit (`tools/donor-signals`), which was copied from the Analytics kit. They are copies, not a shared library.

## What is different here

- **No live tenant.** No demo org has both CRMs connected, and a real one would put customer list names on a public page. `fixtures/connections.json` is fabricated for Harbor Lights Community Foundation; `replica/capture-replica.mjs` stubs `vm.fetch_connections` / `vm.fetch_constituents_meta` and injects it. Timestamps are hours-before-capture, so "synced 3 hours ago" is what renders.
- **States:** the page, the Raiser's Edge ⋯ menu (opened by class, `SRReplica.openMenu`), and six dialogs: `bb-list`, `sf-scope`, `wb-blackbaud`, `wb-salesforce`, and the `-sent` variants that show the product's result line. "Save & send now" in the demo opens the `-sent` variant.
- **outerHTML drops live form state.** The capture mirrors `checked` / `selected` / `value` into attributes before serializing, or every toggle and select ships in its default state.
- **Video dialogs are drawn large and pan.** `build-compositions.mjs` measures each ringed field inside each dialog (under replica.css) and pans the modal box to whatever the narration names.
- **Chromium:** Playwright 1.59 wants chromium 1217, which is not installed here. Every script honors `SR_CHROMIUM`:
  `export SR_CHROMIUM=~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`
- **Product fix it needed:** the Salesforce scope picker had no CSS (report-builder PR #154). Captured from that branch's SHA.

The pipeline table below is the Donor Signals one; the same commands apply with `connections-and-sync` paths, minus `fetch-fixture` / `fetch-gallery` (no live data) and with `post-render.mjs … --poster-at 9`.

## Setup

```bash
cd tools/connections-and-sync
npm ci --cache .cache/npm   # the global ~/.npm cache on Vince's Mac has root-owned files
```

`node_modules` and `.bin` are symlinks into `tools/storyraise-analytics`, so an install there covers both. The internal disk has little room to spare.

- **ffmpeg:** HyperFrames needs FFmpeg 7 with ffprobe. Homebrew's ffmpeg on this machine is broken (`Symbol not found: _x265_api_get_215`) and fails the render at the encode step **after** a successful capture, so put static arm64 builds in `.bin/` (gitignored) and add it to PATH for every video command: `export PATH="$PWD/.bin:$PATH"`.
- **Builder repo:** the replica is captured from the builder repo at `config.json → builder.path`, at the SHA recorded there (`ad39ddb8`, the commit that shipped the tab).
- **Org:** `wrenfield-demo`, Storyraise's own demo org. Vince asked for it by name in place of the Analytics kit's Harbor Lights identity, so `config.json → rename` is empty and the page shows the real slug.
- **ElevenLabs key:** read at runtime from `ELEVENLABS_API_KEY` via `node --env-file=…`. It is never copied into this repo.
- **Renders:** on `/Volumes/External Storage 2TB/storyraise-render`. HyperFrames' preflight refuses the internal disk.

## Pipeline

| Step | Command | Writes |
|---|---|---|
| Freeze data | `node scripts/fetch-fixture.mjs` | `fixtures/donor-signals.json`, the staff-token payload with every email address scrubbed |
| Freeze the gallery | `node scripts/fetch-gallery.mjs` | `fixtures/templates-index.json`, the 15 templates the action cards fan out |
| Capture | `node replica/capture-replica.mjs` | `.cache/replica/` (12 tile x view fragments, 4 dialogs, app screenshots) |
| Build demo | `node replica/build-replica.mjs` | `connections-and-sync/demo/{index.html, replica.css, replica.js, fonts, img}` |
| Narration | `node --env-file=… video/tools/tts.mjs generate [--only s04]` | `video/audio/vo/` (cached per scene by content hash) |
| Voice cleanup | `node video/tools/clean-voice.mjs [--force]` | `video/audio/vo/*.clean.mp3` |
| Timeline | `node video/tools/build-timeline.mjs` | `video/timeline.json` |
| Captions | `node video/tools/build-captions.mjs` | `connections-and-sync/media/*.vtt` |
| Camera targets | `node video/tools/measure-targets.mjs` | `video/targets.json` |
| Compositions | `node video/tools/build-compositions.mjs` | `video/index.html`, `video/compositions/ui.html`, `video/assets/` |
| Music bed | `node video/tools/mix-music.mjs` | A constant level 10 LU under the voice. Run after every compositions build. |
| Check | `cd video && npx hyperframes lint . && npx hyperframes snapshot . --at 12,40,88,108` | lint findings, `video/snapshots/` |
| Render | see below | `$X/renders/connections-and-sync-tour.mp4` |
| Publish media | `node video/tools/post-render.mjs "$X/renders/connections-and-sync-tour.mp4" --poster-at 8.5` | `connections-and-sync/media/` (MP4 at -16 LUFS; poster and OG card from the title card at 8.5s) |
| Landing page | `node scripts/build-landing.mjs` | transcript and structured data in `connections-and-sync/index.html` |
| Verify copy | `node scripts/verify-copy.mjs` | UI labels exist, KB links resolve, no em dashes or British spellings |
| Verify demo | `node scripts/verify-replica.mjs` and `node scripts/verify-tour.mjs` | see **Verification** |
| Preview | `node scripts/serve.mjs` | serves the repo root at `http://127.0.0.1:5070/connections-and-sync/` with byte ranges |

```bash
X="/Volumes/External Storage 2TB/storyraise-render"
export PATH="$PWD/.bin:$PATH"
cd video && TMPDIR="$X/tmp/" npx hyperframes render . --quality high --crf 20 \
  --frames-cache-dir "$X/tmp/frames" -o "$X/renders/connections-and-sync-tour.mp4"
```

## Verification

`verify-replica.mjs` walks the built demo through all twelve group/view states and all four dialogs via `window.SRReplica`, and for each one:

- renders the captured fragment beside the live one, under the same stylesheet and at the capture viewport, and fails on any difference in rendered text;
- compares the card's and the modal's box against the live app's own screenshots in `.cache/replica/app-shots/`, within 2px;
- asserts the dialog backdrop is `position: fixed`;
- asserts the demo requests nothing off the page and logs no console error.

Comparing **rendered against rendered** is the point. A source comparison flags text the product hides (the group tiles carry a sub-label that `.sig-kpis-filter .sig-kpi-sub` never shows), and misses the failures that matter, both of which this page hit: a dialog that lost its styling and reflowed into the page, and icons switched off by a selector collision.

## What this build learned the hard way

- **Everything in the product's CSS is scoped `#dashboard [data-signals] …`.** Mount the dialog on `<body>`, or rename the element you cloned, and the markup renders as unstyled text. `replica.js` appends the dialog inside the signals section, and `build-compositions.mjs` wraps the video's dialog in the same scope.
- **The product ships unscoped `[data-route]` rules for another screen**, one of which is `display: none !important` on its icons. The replica's own hook is `data-sr-route` for that reason. Namespace any attribute the replica adds.
- **loudnorm's `linear=true` does not limit.** This mix sits about 17 dB peak to loudness, and -16 LUFS at -1.5 dBTP allows 14.5, so the published file clipped at +3.1 dBFS while the log still claimed the target. `post-render.mjs` now follows the gain with `alimiter`. The Analytics kit has the same gap and got away with it; check the published true peak, not the log line.
- **The title card is a house style**, set by the Analytics tour: the square mark centred over the title, an accent on the second word, three pills. The wordmark SVG lays out wider than the stage and slides off the left edge.
- Chapter chips need HTTP byte ranges (`serve.mjs`, not `python3 -m http.server`).
- Chrome blocks port 5061 and AirPlay holds 5000. This kit uses 5050 to capture, 5070 to preview, and 5072-5074 for the checks.
