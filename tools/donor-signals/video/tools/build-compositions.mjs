// Assemble the HyperFrames project from the timeline, the replica, and measurements.
//
//   node video/tools/build-compositions.mjs
//
// Writes, under tools/storyraise-analytics/video/:
//   assets/      fonts, GSAP, logos, the map image, and replica.css (paths rewritten)
//   assets/timeline.js   window.SR_TIMELINE (scene windows, cues, words) and
//                        window.SR_UI (camera shots, highlight rings, labels, counters)
//   index.html   the root composition: backdrop, scene hosts, narration audio
//   compositions/ui.html the real Insights page (replica markup) under a GSAP camera
//
// Every position the camera needs comes from targets.json (measure-targets.mjs), so
// nothing measures the DOM while HyperFrames seeks.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, SITE_DIR, TOOLS_DIR, config, readJson } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const ASSETS = path.join(VIDEO, 'assets');
const timeline = readJson(path.join(VIDEO, 'timeline.json'));
const targets = readJson(path.join(VIDEO, 'targets.json'));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

// ---------------------------------------------------------------------------
// 1. Assets
// ---------------------------------------------------------------------------
for (const dir of ['fonts', 'img']) fs.mkdirSync(path.join(ASSETS, dir), { recursive: true });
const copy = (from, to) => fs.copyFileSync(from, path.join(ASSETS, to));

copy(path.join(TOOLS_DIR, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), 'gsap.min.js');
copy(path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-TextRegular.woff2'), 'fonts/PPFragment-TextRegular.woff2');
copy(path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-GlareExtraBold.woff2'), 'fonts/PPFragment-GlareExtraBold.woff2');
copy(path.join(SITE_DIR, 'demo', 'fonts', 'material-symbols-outlined.woff2'), 'fonts/material-symbols-outlined.woff2');
copy(path.join(config.builder.path, 'public', 'assets', 'logos', 'Storyraise — Logos_Storyraise Logo — Heavy Icon.svg'), 'logo-icon.svg');
copy(path.join(DOCS_ROOT, 'assets', 'logo-dark.svg'), 'logo-wordmark-dark.svg');
copy(path.join(TOOLS_DIR, '.cache', 'replica', 'map@2x.png'), 'img/map.png');

const poppinsMissing = [400, 500, 600].filter((w) => !fs.existsSync(path.join(ASSETS, 'fonts', `Poppins-${w}.woff2`)));
if (poppinsMissing.length) {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap', { headers: { 'User-Agent': UA } })).text();
    for (const block of css.split('/* ').filter((b) => b.startsWith('latin */'))) {
        const weight = Number(block.match(/font-weight:\s*(\d+)/)[1]);
        if (!poppinsMissing.includes(weight)) continue;
        const url = block.match(/url\((https:[^)]+\.woff2)\)/)[1];
        fs.writeFileSync(path.join(ASSETS, 'fonts', `Poppins-${weight}.woff2`), Buffer.from(await (await fetch(url)).arrayBuffer()));
    }
}

fs.writeFileSync(path.join(ASSETS, 'replica.css'),
    fs.readFileSync(path.join(SITE_DIR, 'demo', 'replica.css'), 'utf8').split('/assets/fonts/').join('fonts/'));

// ---------------------------------------------------------------------------
// 2. Scene windows
// ---------------------------------------------------------------------------
const S = Object.fromEntries(timeline.scenes.map((s) => [s.id, s]));
const cue = (id, name) => {
    const t = S[id].cues[name];
    if (t === undefined) throw new Error(`missing cue ${id}.${name}`);
    return t;
};
const end = (id) => S[id].start + S[id].duration;
const TAIL = 0.8;
const DURATION = round(timeline.duration + TAIL, 3);

const hosts = {
    s01: { start: S.s01.start, end: end('s01') },
    // Scenes switched off in vo-script.json are absent from the timeline.
    ...(S.s02 ? { s02: { start: S.s02.start, end: end('s02') } } : {}),
    // Home clears out before the Analytics window rises, rather than cross-fading two busy layouts.
    s03: { start: S.s03.start, end: cue('s03', 'open') + 0.1 },
    ui: { start: cue('s03', 'open') - 0.1, end: end('s10') },
    stars: { start: cue('s06', 'star1') - 0.45, end: end('s06') - 0.3 },
    s11: { start: S.s11.start, end: end('s11') },
    s12: { start: S.s12.start, end: DURATION },
};
for (const h of Object.values(hosts)) {
    h.start = round(h.start, 3);
    h.duration = round(h.end - h.start, 3);
}

// ---------------------------------------------------------------------------
// 3. Camera plan for the UI scene (page coordinates -> transforms)
// ---------------------------------------------------------------------------
const WIN = { left: 100, top: 80, width: 1720, height: 920, bar: 52 };
const VW = WIN.width;
const VH = WIN.height - WIN.bar;
const PAGE_W = targets.width;
const N = targets.numbers;
const ST = targets.story;
const BASE = VW / PAGE_W;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const union = (...rects) => {
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
};

function frame(rect, { fill = 0.85, max = 2.6, min = BASE, anchorX = 0.5, anchorY = 0.5, pad = 0, pageH = targets.pageHeight } = {}) {
    const r = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
    const scale = Math.max(min, Math.min(max, (VW * fill) / r.w, (VH * fill) / r.h));
    let x = VW * anchorX - (r.x + r.w / 2) * scale;
    let y = VH * anchorY - (r.y + r.h / 2) * scale;
    x = PAGE_W * scale <= VW ? (VW - PAGE_W * scale) / 2 : clamp(x, VW - PAGE_W * scale, 0);
    y = pageH * scale <= VH ? 0 : clamp(y, VH - pageH * scale, 0);
    return { x: round(x), y: round(y), scale: round(scale, 4) };
}

const top = frame({ x: 0, y: 0, w: PAGE_W, h: VH / BASE }, { fill: 1 });
const shots = [
    { t: hosts.ui.start, to: top },
    { t: S.s04.start + 0.1, to: frame(union(N.highlights, N.kpis), { fill: 0.96 }) },
    { t: cue('s04', 'opened') - 0.4, to: frame(union(N.kpiOpened, N.kpiReturns), { fill: 0.8, max: 2.4 }) },
    { t: cue('s04', 'views') - 0.4, to: frame(N.kpiViews, { fill: 0.6, max: 2.5, pad: 14 }) },
    { t: cue('s04', 'time') - 0.4, to: frame(N.kpiTime, { fill: 0.6, max: 2.5, pad: 14 }) },
    { t: cue('s05', 'chips') - 0.35, to: frame(union(N.highlights, N.kpis), { fill: 0.96 }) },
    { t: cue('s05', 'map') - 0.4, to: frame(N.map, { fill: 0.88, max: 2.2 }) },
    // Kept small and to the left: the star explainer card covers the right side of the window.
    { t: cue('s06', 'list') - 0.4, to: frame(N.engaged, { fill: 0.49, max: 1.55, anchorX: 0.27 }) },
    { t: S.s07.start + 0.05, to: frame(N.clicks, { fill: 0.94 }) },
    { t: S.s08.start + 0.05, to: frame(N.howTheyRead, { fill: 0.92, max: 2 }) },
    { t: cue('s08', 'retention') - 0.35, to: frame(N.retention, { fill: 0.95, min: 1.1 }) },
    { t: cue('s08', 'endcap') - 0.3, to: frame(union(N.retentionFirstNode, N.endcap), { fill: 0.7, max: 2.1, pad: 20 }) },
    { t: S.s09.start + 0.05, to: frame(N.heatmap, { fill: 0.95, min: 1.1 }) },
    { t: cue('s09', 'trend') - 0.35, to: frame(N.trend, { fill: 0.95, min: 1.1 }) },
    { t: S.s10.start + 0.05, to: top },
    { t: cue('s10', 'followup') - 0.35, to: frame({ x: ST.followUp.x, y: ST.followUp.y - 40, w: 900, h: 260 }, { fill: 0.9, max: 1.9, pageH: targets.storyHeight }) },
    { t: cue('s10', 'download') - 0.35, to: frame({ x: 30, y: ST.download.y - 140, w: 1140, h: 560 }, { fill: 0.96, pageH: targets.storyHeight }) },
].map((s) => ({ ...s, t: round(s.t, 3), dur: 1 }));
for (let i = 0; i < shots.length - 1; i++) {
    const gap = shots[i + 1].t - shots[i].t;
    if (gap < 0.25) throw new Error(`camera shots ${i} and ${i + 1} are ${gap.toFixed(2)}s apart; retime the cues`);
    shots[i].dur = round(Math.min(1, gap - 0.05), 3);
}

// Highlight rings live inside the page, so they ride the camera.
const RING_PAD = 8;
const ring = (id, rect, on, off) => ({ id, on: round(on, 3), off: round(off, 3), rect: { x: rect.x - RING_PAD, y: rect.y - RING_PAD, w: rect.w + RING_PAD * 2, h: rect.h + RING_PAD * 2 } });
const rings = [
    ring('ring-tab-numbers', N.tabNumbers, cue('s03', 'numbers'), cue('s03', 'story') - 0.05),
    ring('ring-tab-story', N.tabStory, cue('s03', 'story'), S.s04.start + 0.3),
    ring('ring-chips', N.highlights, cue('s05', 'chips'), cue('s05', 'map') - 0.3),
    ring('ring-stars', N.engagedStars, cue('s06', 'star1'), cue('s06', 'badges') - 0.1),
    ring('ring-badge', N.badge, cue('s06', 'badges'), end('s06') - 0.2),
    ring('ring-donate', N.donateRow, cue('s07', 'intent'), end('s07') - 0.2),
    ring('ring-endcap', union(N.retentionFirstNode, N.endcap), cue('s08', 'endcap'), end('s08') - 0.2),
    ring('ring-download', ST.download, cue('s10', 'download'), end('s10') - 0.25),
];

// Short on-screen names for what the voice is describing, in the product's own words.
const labelCues = [
    ['The Numbers', cue('s03', 'numbers')],
    ['The Story', cue('s03', 'story')],
    ['Constituents Opened', cue('s04', 'opened')],
    ['Constituent Returns', cue('s04', 'returns')],
    ['Views', cue('s04', 'views')],
    ['Avg. Time Spent', cue('s04', 'time')],
    ['Highlights', cue('s05', 'chips')],
    ["Where They're Reading", cue('s05', 'map')],
    ['Most Engaged Constituents', cue('s06', 'list')],
    ['Where The Clicks Go', cue('s07', 'donut')],
    ['Reading shows attention', cue('s07', 'attention')],
    ['Clicking shows intent', cue('s07', 'intent')],
    ['How They Read', cue('s08', 'sections')],
    ['Section Retention', cue('s08', 'retention')],
    ['Top Visit Times', cue('s09', 'heatmap')],
    ['Visits Over Time', cue('s09', 'trend')],
    ['The Story', cue('s10', 'storytab')],
    ['Worth a Follow-Up', cue('s10', 'followup')],
    ['Download this summary', cue('s10', 'download')],
];
const labels = labelCues.map(([text, on], i) => ({
    id: `label-${i}`,
    text,
    on: round(on, 3),
    // During the star explainer the overlay card does the talking.
    off: round(i < labelCues.length - 1 ? labelCues[i + 1][1] - 0.05 : end('s10') - 0.3, 3),
}));
// Hide the engaged-constituents label while the stars card is up.
labels.find((l) => l.text === 'Most Engaged Constituents').off = round(hosts.stars.start + 0.2, 3);

const counters = [
    { selector: '#ui-count-opened', to: 30, t: cue('s04', 'opened') },
    { selector: '#ui-count-returns', to: 8, t: cue('s04', 'returns') },
    { selector: '#ui-count-views', to: 249, t: cue('s04', 'views') },
].map((c) => ({ ...c, t: round(c.t, 3) }));

// Cursor clicks The Story tab while the camera shows the top of the page.
const tabShot = shots.find((s) => s.t === round(S.s10.start + 0.05, 3)).to;
const cursorTarget = {
    x: round(WIN.left + tabShot.x + (N.tabStory.x + N.tabStory.w / 2) * tabShot.scale),
    y: round(WIN.top + WIN.bar + tabShot.y + (N.tabStory.y + N.tabStory.h / 2) * tabShot.scale),
};

const ui = {
    start: hosts.ui.start,
    duration: hosts.ui.duration,
    shots,
    rings,
    labels,
    counters,
    time: round(cue('s04', 'time'), 3),
    donut: round(cue('s07', 'donut'), 3),
    heatmap: round(cue('s09', 'heatmap'), 3),
    trend: round(cue('s09', 'trend'), 3),
    storyClick: round(cue('s10', 'storytab'), 3),
    cursor: cursorTarget,
    // Relative to the tabs container, which the underline is positioned inside.
    underline: {
        from: { x: N.tabNumbers.x - N.tabs.x, w: N.tabNumbers.w },
        to: { x: N.tabStory.x - N.tabs.x, w: N.tabStory.w },
        y: N.tabNumbers.y - N.tabs.y + N.tabNumbers.h - 3,
    },
};

fs.writeFileSync(path.join(ASSETS, 'timeline.js'),
    '// Generated by video/tools/build-compositions.mjs. Do not edit.\n'
    + `window.SR_TIMELINE = ${JSON.stringify({ duration: DURATION, estimated: timeline.estimated, hosts, scenes: S })};\n`
    + `window.SR_UI = ${JSON.stringify(ui)};\n`);

// ---------------------------------------------------------------------------
// 4. The UI composition: replica markup prepared for the camera
// ---------------------------------------------------------------------------
const demoHtml = fs.readFileSync(path.join(SITE_DIR, 'demo', 'index.html'), 'utf8');
const startAt = demoHtml.indexOf('<div id="dashboard"');
const endAt = demoHtml.indexOf('<template data-range=');
if (startAt === -1 || endAt === -1) throw new Error('Could not find the dashboard markup in demo/index.html');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body>${demoHtml.slice(startAt, endAt)}</body></html>`);
const dashboard = await page.evaluate(() => {
    const root = document.querySelector('#dashboard');
    const fail = (m) => { throw new Error(m); };

    // Modals and the read-only toast have no part in the video.
    root.querySelectorAll('input.modal-toggle, .insights-modal').forEach((el) => el.remove());

    // Tabs: a single animated underline replaces the static active state.
    const tabs = root.querySelector('[data-insights-tabs]') || fail('tabs');
    tabs.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('tab-active'));
    tabs.querySelector('[data-tab="overview"]').id = 'ui-tab-numbers';
    tabs.querySelector('[data-tab="summary"]').id = 'ui-tab-story';

    // The Story stays where the product puts it (its CSS relies on child selectors)
    // and is lifted to sit exactly over The Numbers so the two can cross-fade.
    const pane = root.querySelector('[data-insights-pane="overview"]') || fail('pane');
    const story = (root.querySelector('[data-insights-narrative]') || fail('narrative')).closest('main');
    pane.id = 'ui-pane';
    story.id = 'ui-story';
    story.setAttribute('style', 'max-width: 100%;');
    story.parentNode.id = 'ui-form';

    // Count-up numbers.
    const tiles = root.querySelectorAll('[data-insights-overview="1"] > div');
    [['ui-count-opened', 0], ['ui-count-returns', 1], ['ui-count-views', 2]].forEach(([id, i]) => {
        const figure = tiles[i].querySelector('figure');
        const text = Array.from(figure.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.textContent)) || fail(`count ${id}`);
        const span = document.createElement('span');
        span.id = id;
        span.textContent = '0';
        figure.replaceChild(span, text);
    });
    const time = tiles[3].querySelector('figure > span') || fail('time value');
    time.id = 'ui-time';

    root.querySelector('.link-clicks__donut').id = 'ui-donut';
    const trendPaths = root.querySelectorAll('[data-visits-trend-wrap] svg path');
    trendPaths[0].closest('svg').id = 'ui-trend-svg';
    root.querySelectorAll('.heatmap__row').forEach((row) => {
        Array.from(row.children).forEach((cell, col) => cell.setAttribute('data-col', String(col)));
    });
    return root.outerHTML;
});
await browser.close();

const ringHtml = rings.map((r) => `<div class="ui-ring" id="${r.id}" style="left:${r.rect.x}px;top:${r.rect.y}px;width:${r.rect.w}px;height:${r.rect.h}px"></div>`).join('\n          ');
const labelHtml = labels.map((l) => `<div class="ui-label" id="${l.id}">${l.text.replace(/&/g, '&amp;')}</div>`).join('\n        ');
const underline = ui.underline;

const uiHtml = `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Generated by video/tools/build-compositions.mjs from storyraise-analytics/demo/index.html. Do not edit. -->
    <template id="ui-template">
      <style>
        #root { position: absolute; inset: 0; overflow: hidden; }
        /* The product's CSS animations and transitions run on wall-clock time, not the
           video's, so they would render differently on every seek. GSAP owns all motion. */
        #ui-page *, #ui-page *::before, #ui-page *::after { animation: none !important; transition: none !important; }
        .ui-window {
          position: absolute; left: ${WIN.left}px; top: ${WIN.top}px; width: ${WIN.width}px; height: ${WIN.height}px;
          border-radius: 22px; overflow: hidden; background: #232328;
          box-shadow: 0 50px 120px rgba(0, 0, 0, 0.6), 0 0 0 1.5px rgba(255, 255, 255, 0.08);
        }
        .ui-bar {
          position: absolute; left: 0; top: 0; width: ${WIN.width}px; height: ${WIN.bar}px; box-sizing: border-box;
          display: flex; align-items: center; padding: 0 22px; background: #2b2b33;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ui-dots { display: flex; gap: 9px; width: 180px; }
        .ui-dots i { display: block; width: 13px; height: 13px; border-radius: 50%; background: rgba(255, 255, 255, 0.16); }
        .ui-url {
          margin: 0 auto; transform: translateX(-90px); font: 400 19px/1 "Poppins", sans-serif; color: rgba(255, 255, 255, 0.66);
          background: rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 9px 22px;
        }
        .ui-viewport { position: absolute; left: 0; top: ${WIN.bar}px; width: ${VW}px; height: ${VH}px; overflow: hidden; background: #232328; }
        #ui-page { position: absolute; left: 0; top: 0; width: ${PAGE_W}px; transform-origin: 0 0; }
        #ui-form { position: relative; }
        #ui-time { display: inline-block; }
        #ui-story { position: absolute; left: 0; right: 0; top: ${N.pane.y - N.form.y}px; opacity: 0; visibility: hidden; }
        [data-insights-tabs] { position: relative; }
        #ui-tab-underline {
          position: absolute; left: ${underline.from.x}px; top: ${underline.y}px; width: ${underline.from.w}px; height: 3px;
          background: #4c9be8; transform-origin: 0 50%;
        }
        [data-worldmap-canvas] { background: url("assets/img/map.png") center / cover no-repeat !important; }
        /* Above the dashboard's own stacking (cards and charts set position and z-index),
           so a highlight is never painted behind the element it outlines. */
        .ui-ring {
          position: absolute; z-index: 1000; box-sizing: border-box; border: 3px solid #c79bf2; border-radius: 16px; pointer-events: none;
          box-shadow: 0 0 0 6px rgba(199, 155, 242, 0.16), 0 0 38px rgba(199, 155, 242, 0.4); opacity: 0; visibility: hidden;
        }
        .ui-label {
          position: absolute; left: 150px; top: 872px; white-space: nowrap; opacity: 0; visibility: hidden;
          font: 600 38px/1 "Poppins", sans-serif; color: #ffffff; background: rgba(17, 14, 23, 0.9);
          border-left: 6px solid #c79bf2; border-radius: 18px; padding: 20px 30px 20px 26px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
        }
        #ui-cursor { position: absolute; left: 0; top: 0; width: 46px; height: 46px; opacity: 0; visibility: hidden; }
        #ui-click {
          position: absolute; left: ${cursorTarget.x - 34}px; top: ${cursorTarget.y - 34}px; width: 68px; height: 68px; box-sizing: border-box;
          border: 3px solid #ffffff; border-radius: 50%; opacity: 0; visibility: hidden;
        }
        #ui-donut {
          -webkit-mask-image: conic-gradient(#000 calc(var(--sweep, 1) * 360deg), transparent 0);
          mask-image: conic-gradient(#000 calc(var(--sweep, 1) * 360deg), transparent 0);
        }
      </style>

      <div id="root" data-composition-id="ui" data-width="1920" data-height="1080">
        <div class="ui-window" id="ui-window">
          <div class="ui-bar">
            <span class="ui-dots"><i></i><i></i><i></i></span>
            <span class="ui-url">app.storyraise.com/#/harbor-lights/insights/2026-impact-report</span>
          </div>
          <div class="ui-viewport">
            <div id="ui-page">
          ${dashboard.replace('data-insights-tabs=""', 'data-insights-tabs=""').replace(/(<div[^>]*data-insights-tabs[^>]*>)/, '$1<div id="ui-tab-underline"></div>')}
          ${ringHtml}
            </div>
          </div>
        </div>
        ${labelHtml}
        <svg id="ui-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.5l15.5 9.2-6.9 1.5 3.9 7.3-2.9 1.5-3.9-7.3-5.2 4.8z" fill="#ffffff" stroke="#110e17" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <div id="ui-click"></div>
      </div>

      <script src="assets/gsap.min.js"></script>
      <script>
${fs.readFileSync(path.join(VIDEO, 'tools', 'ui-timeline.js'), 'utf8')}
      </script>
    </template>
  </body>
</html>
`;
fs.writeFileSync(path.join(VIDEO, 'compositions', 'ui.html'), uiHtml);

// ---------------------------------------------------------------------------
// 5. Root composition
// ---------------------------------------------------------------------------
const host = (id, track) => `  <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${hosts[id].start}" data-duration="${hosts[id].duration}" data-track-index="${track}" data-width="1920" data-height="1080"></div>`;
// Explicit lengths keep the clips' windows from reading as overlapping. Every clip
// joins the "voiceover" bus, which carries one voice chain for all of them.
const narration = timeline.scenes.filter((s) => s.audio).map((s) =>
    `  <audio id="vo-${s.id}" src="${s.audio}" data-start="${s.voStart}" data-duration="${round(s.voLength + 0.05, 3)}" data-track-index="20" data-audio-group="voiceover" data-volume="1"></audio>`);

// Voice chain lives in voice-chain.mjs so the music mix can measure the same thing.
const { VOICE_CHAIN } = await import('./voice-chain.mjs');
const chainAttr = (value) => JSON.stringify(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
if (narration.length) {
    narration.unshift(`  <hf-audio-group id="voiceover" data-label="Voiceover" data-volume="1" data-fx-chain="${chainAttr(VOICE_CHAIN)}"></hf-audio-group>`);
}
const musicFile = path.join(VIDEO, 'audio', 'music.mp3');
const music = fs.existsSync(musicFile)
    ? [`  <audio id="music-bed" src="audio/music.mp3" data-start="0" data-duration="${DURATION}" data-track-index="21" data-volume="0.16"></audio>`]
    : [];

const indexHtml = `<!doctype html>
<!-- Generated by video/tools/build-compositions.mjs. Do not edit; change the script, scenes, or builder instead. -->
<!-- class="dashboard" and data-theme="dark" match the dashboard's own <html>, which its CSS keys the 15px root size and dark theme off. -->
<html lang="en" class="dashboard" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <title>Storyraise Analytics tour</title>
  <link rel="stylesheet" href="assets/replica.css" />
  <link rel="stylesheet" href="assets/stage.css" />
  <script src="assets/gsap.min.js"></script>
  <script src="assets/timeline.js"></script>
</head>
<body>
<div id="root-stage" data-composition-id="root" data-width="1920" data-height="1080" data-start="0" data-duration="${DURATION}">
  <div id="stage-bg" class="clip stage-bg" data-start="0" data-duration="${DURATION}" data-track-index="0"></div>
${['s01', 's02', 's03', 'ui', 'stars', 's11', 's12'].filter((id) => hosts[id]).map((id, i) => host(id, i + 1)).join('\n')}
${[...narration, ...music].join('\n')}
  <script>
    window.__timelines["root"] = gsap.timeline({ paused: true });
  </script>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(VIDEO, 'index.html'), indexHtml);

console.log(`${timeline.estimated ? 'ESTIMATED timing. ' : ''}${DURATION}s, ${shots.length} camera shots, ${rings.length} rings, ${labels.length} labels, ${narration.length} narration clips${music.length ? ', music' : ''}`);
