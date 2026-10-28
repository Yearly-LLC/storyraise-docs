# Report screens: builder + web preview (Collect stories)

These files are copied from `tools/personalization/replica/report` and are not shared with it; that README has the full method and its traps. This file lists what is different here.

| Screen | States | Tour anchors |
|---|---|---|
| `preview.html` (+ `report.css`) | `all`, `unfiltered`, `emily` (default), `james` | `previewing-as`, `fund-update` (not in `unfiltered`), `story-cards`, `card-1`, `card-1-head`, `card-2`, `card-2-head` (no card 2 in `all`); `story-1`/`story-2` are aliases of `card-1`/`card-2` |
| `builder.html` (+ `builder.css`, `canvas.css`) | `repeater` (default), `card`, `photo`, `insert` | `repeater-block`, `card-tags` in all; `use-data` (not `insert`); `repeater`: `repeat-collection`, `repeat-when`, `rw-column`, `rw-condition`, `rw-value`, `sort-limit`; `photo`: `override-media`, `photo-var`, `card-image`; `insert`: `repeater-insert` |
| `profile.html` (+ `dashboard.css`) | | copied unchanged from `personalization/demo/` (built by `tools/personalization/replica/dashboard`) |

```bash
export SR_CHROMIUM=~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell
node replica/report/capture-report.mjs   # port 5181 (Chrome refuses 5060/5061; 5067-5068 are taken)
node replica/report/build-report.mjs
node replica/report/verify-report.mjs    # port 5064
```

- **Anchors are marked on the live page.** `data-tour` goes on a single element and `data-tour-part` on each piece of a joined anchor (`repeat-when`, `sort-limit`, `story-cards`). `SRScreen.getTargetRect` returns the union of the pieces.
- **Builder states.** `card` selects the story block (`#ik1rq`), so the selection badge sits on the card's edge. `photo` is the same block on Use Data, where Override Media > "Use Media from a Variable" reads `@@student_photo@@`; the fixture already sets `data-misc-bg-img-override`. `insert` has nothing selected and shows the right-hand Blocks list scrolled to "Repeater block". Scrolled panels carry `data-sr-scroll-top`, which `screen.js` applies again as the thumbnails load. The thumbnails are PNG data URIs in the product and are written out to `img/rep-*.png`.
- **Seed.** The repeaters point at fictional collection ids (`-HLScholarshipStories`, `-HLScholarshipFunds`), because the builder prints the id under the collection title. Each collection is seeded at RTDB `collections/{id}` = `{project_data:{title}, responses}`.
- **Without `?for=`, report.js never expands a repeater.** `get_block_data_from_collection` runs only once a constituent is loaded, so the reader shows the templates with their `@@tags@@`; that is the `all` state. The "remove when the value is blank or unresolved" rule (`data-empty-mode`, default `remove`) applies only after a recipient is loaded and lacks the field.
- **`unfiltered`** is a second seeded copy of the page (`REPORT_ID_ALL`). The stories repeater is lifted out of the per-fund wrapper and set to `fund_id` contains `F`, which every row matches. The reader removes a repeater with a blank value, so there is no way to write "no filter" in the markup. It is rendered with Emily loaded so the repeater expands, and the bar reads "Previewing as Emily Wilson".
