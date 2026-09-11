# Storyraise Analytics page tooling

Everything that produces [`/storyraise-analytics/`](../../storyraise-analytics/): the interactive demo (a read-only replica of the product's Analytics page), its numbered tour markers, and the narrated walkthrough video (HyperFrames + ElevenLabs).

The served files live in `storyraise-analytics/`. This folder is the source and is never installed by CI. The docs build only reads `content/`.

## Setup

```bash
cd tools/storyraise-analytics
npm ci --cache .cache/npm   # the global ~/.npm cache on Vince's Mac has root-owned files
```

- **ffmpeg:** HyperFrames needs FFmpeg 7 with ffprobe. Homebrew's ffmpeg hangs on this machine, so put static arm64 builds in `.bin/` (gitignored) and add it to PATH for video commands: `export PATH="$PWD/.bin:$PATH"`.
- **Builder repo:** the replica is captured from the builder repo at `config.json → builder.path`, at the SHA recorded there.
- **ElevenLabs key:** read at runtime from `ELEVENLABS_API_KEY` via `node --env-file=<file>`. It is never copied into this repo. The key in use lacks `music_generation` permission.

## Pipeline

| Step | Command | Writes |
|---|---|---|
| Freeze data | `node scripts/fetch-fixture.mjs [--refresh]` | `fixtures/insights-summary.json` (renamed to the fictional org) |
| The Story text | `node scripts/generate-narrative.mjs --yes` | `fixtures/narrative.json` (one model call, no database write) |
| Capture | `node replica/capture-replica.mjs` | `.cache/replica/` (DOM per state, app screenshots, map image) |
| Build demo | `node replica/build-replica.mjs` | `storyraise-analytics/demo/{index.html, replica.css, fonts, img}` |
| Map data | `node replica/simplify-geo.mjs` | `storyraise-analytics/demo/data/world.geo.json` |
| Sample PDF | `node replica/build-sample-pdf.mjs` | `storyraise-analytics/demo/sample-summary.pdf` |
| Narration | `node --env-file=… video/tools/tts.mjs generate [--only s04]` | `video/audio/vo/` (cached per scene by content hash) |
| Voice cleanup | `node video/tools/clean-voice.mjs [--force]` | `video/audio/vo/*.clean.mp3`: noise-reduced takes the timeline prefers. The voice EQ, compressor, and limiter live in `video/tools/voice-chain.mjs` on the voiceover bus. |
| Timeline | `node video/tools/build-timeline.mjs` | `video/timeline.json` (scene windows, cue times, word timings) |
| Captions | `node video/tools/build-captions.mjs` | `storyraise-analytics/media/*.vtt` |
| Camera targets | `node video/tools/measure-targets.mjs` | `video/targets.json` |
| Compositions | `node video/tools/build-compositions.mjs` | `video/index.html`, `video/compositions/ui.html`, `video/assets/` |
| Music bed | `node video/tools/mix-music.mjs [--under 10] [--carve]` | A constant level 10 LU under the voice, with fades and a fixed voice-room EQ. `--carve` switches to the ducking voiceover carve, which Vince rejected because the music rose and fell. Run after every compositions build. Needs `video/audio/music.mp3`. |
| Check | `cd video && npx hyperframes lint . && npx hyperframes snapshot . --at 5,40,80` | lint findings, `video/snapshots/` |
| Render | `cd video && npx hyperframes render . --quality high --crf 20 --frames-cache-dir off -o renders/storyraise-analytics-tour.mp4` | `video/renders/` |
| Publish media | `node video/tools/post-render.mjs [--poster-at 7]` | `storyraise-analytics/media/` (MP4 normalized to -16 LUFS; poster and OG card from the frame at 7s) |
| Landing page | `node scripts/build-landing.mjs` | metric cards, transcript, and structured data in `storyraise-analytics/index.html` |
| Verify copy | `node scripts/verify-copy.mjs` | UI labels exist, KB links resolve, no em dashes or British spellings |
| Verify demo | `node scripts/verify-tour.mjs` | all 14 markers and stops at 4 sizes x 2 themes, the `?step=` deep link, and chapter chips seeking (in installed Chrome, for H.264) |
| Preview | `node scripts/serve.mjs` | serves the repo root at `http://127.0.0.1:5070/storyraise-analytics/` with byte ranges |

After any change under `content/`, run `npm run build` at the repo root and commit the generated `docs/` with it, as CI requires.

**Low internal disk.** HyperFrames refuses to render with under about 1 GB free, checking both the temp directory and the output folder. On Vince's Mac, render to the external drive and point the temp directory there too:

```bash
X="/Volumes/External Storage 2TB/storyraise-render"; mkdir -p "$X/tmp" "$X/renders"
TMPDIR="$X/tmp/" npx hyperframes render . --quality high --crf 20 --frames-cache-dir "$X/tmp/frames" -o "$X/renders/storyraise-analytics-tour.mp4"
node video/tools/post-render.mjs "$X/renders/storyraise-analytics-tour.mp4"   # normalizes to -16 LUFS, copies into media/
```

## How the pieces fit

- **The replica is captured, not rebuilt.** The real dashboard renders locally against the frozen summary with its auth redirect disabled. `build-replica.mjs` keeps only the analytics content, trims the product CSS with PurgeCSS, and adds `data-tour` anchors. `demo/replica.js` restores the safe interactions and exposes `window.SRReplica` for the tour.
- **The tour** (`storyraise-analytics/analytics.js`) runs on the landing page, outside the scaled iframe, so popovers stay readable. At 760px and narrower the demo section and the hero buttons are hidden (Vince's call), and the lazy iframe never downloads. Copy lives in `storyraise-analytics/annotations.json`, and each claim cites the product code it was checked against.
- **The video.** Narration sets the clock: `build-timeline.mjs` turns ElevenLabs character timings into scene lengths and `[[cue:name]]` times. The UI scenes put the replica markup inside a HyperFrames composition under a GSAP camera, whose moves are computed from `targets.json`, so nothing measures the DOM while rendering.

## Traps

- **Root class:** the dashboard CSS sets `html { font-size: 13px }` and `html.dashboard { font-size: 15px }`. Anything reusing `replica.css` needs `class="dashboard"` on `<html>`.
- **PurgeCSS extractor:** it needs the Tailwind-aware extractor, or every `md:`/`lg:` class is removed.
- **mapshaper:** it reads the dashboard's `world.geo.json` as zero records, which is why `simplify-geo.mjs` exists.
- **Blocked port:** Chrome refuses port 5061. Local servers here use 5070.
- **Seeking needs byte ranges:** `python3 -m http.server` answers every request with the whole file, so a chapter chip restarts the video from 0. Preview with `scripts/serve.mjs`, which behaves like GitHub Pages. The video is `preload="none"`, so `analytics.js` loads metadata before it sets `currentTime`.
- **Rings in the video:** the dashboard's cards and charts create their own stacking contexts, so `.ui-ring` needs a high `z-index` to draw above the element it outlines.
- **HyperFrames:** a `fromTo` whose start state is visible renders before its cue, so use `set` + `to`. Product CSS animations must be disabled inside compositions (they run on wall-clock time). Moving product DOM breaks its child-selector CSS.
- **The Story:** opening The Story on a report with no cached narrative writes to production RTDB and calls the model. Use `generate-narrative.mjs`, never the live page.
