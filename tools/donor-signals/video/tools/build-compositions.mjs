// Assemble the HyperFrames project from the timeline, the replica, and measurements.
//
//   node video/tools/build-compositions.mjs
//
// Writes, under tools/donor-signals/video/:
//   assets/      fonts, GSAP, logos, and replica.css (paths rewritten)
//   assets/timeline.js   window.SR_TIMELINE (scene windows, cues, words) and
//                        window.SR_UI (camera shots, rings, labels, state fades)
//   index.html   the root composition: backdrop, scene hosts, narration audio
//   compositions/ui.html the real Donor Signals page under a GSAP camera
//
// Donor Signals changes what is on the page when you pick a group, so the UI
// composition stacks one full page per state and cross-fades opacity between
// them. Swapping innerHTML would not survive HyperFrames seeking; opacity does.
// Every rect the camera needs comes from targets.json.
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
fs.mkdirSync(path.join(VIDEO, 'compositions'), { recursive: true });
const copy = (from, to) => fs.copyFileSync(from, path.join(ASSETS, to));

copy(path.join(TOOLS_DIR, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), 'gsap.min.js');
copy(path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-TextRegular.woff2'), 'fonts/PPFragment-TextRegular.woff2');
copy(path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-GlareExtraBold.woff2'), 'fonts/PPFragment-GlareExtraBold.woff2');
copy(path.join(SITE_DIR, 'demo', 'fonts', 'material-symbols-outlined.woff2'), 'fonts/material-symbols-outlined.woff2');
copy(path.join(config.builder.path, 'public', 'assets', 'logos', 'Storyraise — Logos_Storyraise Logo — Heavy Icon.svg'), 'logo-icon.svg');
copy(path.join(DOCS_ROOT, 'assets', 'logo-dark.svg'), 'logo-wordmark-dark.svg');
// The action cards' template covers.
fs.rmSync(path.join(ASSETS, 'img'), { recursive: true, force: true });
fs.cpSync(path.join(SITE_DIR, 'demo', 'img'), path.join(ASSETS, 'img'), { recursive: true });

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
    s01: { start: S.s01.start, end: cue('s02', 'strip') + 0.1 },
    ui: { start: cue('s02', 'strip') - 0.1, end: end('s09') },
    s10: { start: S.s10.start, end: DURATION },
};
for (const h of Object.values(hosts)) {
    h.start = round(h.start, 3);
    h.duration = round(h.end - h.start, 3);
}

// ---------------------------------------------------------------------------
// 3. Camera plan (page coordinates -> transforms)
// ---------------------------------------------------------------------------
const WIN = { left: 100, top: 80, width: 1720, height: 920, bar: 52 };
const VW = WIN.width;
const VH = WIN.height - WIN.bar;
const PAGE_W = targets.width;
const A = targets.states.new_gifts;
const R = targets.states.at_risk;
const D = targets.dialog;
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
    { t: cue('s02', 'retention') - 0.35, to: frame(A.strip, { fill: 0.94, max: 2.1 }) },
    { t: cue('s02', 'fytd') - 0.3, to: frame(A.stripFytd, { fill: 0.72, max: 2.3, pad: 10 }) },
    { t: cue('s02', 'firstyear') - 0.3, to: frame(A.stripFirstYear, { fill: 0.72, max: 2.3, pad: 10 }) },
    { t: cue('s03', 'tiles') - 0.35, to: frame(A.tiles, { fill: 0.96, max: 1.9 }) },
    { t: cue('s03', 'money') - 0.3, to: frame(union(A.tileNew, A.tileAtRisk), { fill: 0.94, max: 1.9 }) },
    { t: cue('s04', 'atrisk') - 0.35, to: frame(R.tiles, { fill: 0.96, max: 1.9 }) },
    { t: cue('s04', 'cadence') - 0.3, to: frame(union(R.firstRow, R.list), { fill: 0.86, max: 1.6, anchorY: 0.42 }) },
    { t: cue('s04', 'sorted') - 0.3, to: frame(R.firstRow, { fill: 0.78, max: 2.2, pad: 14 }) },
    { t: cue('s05', 'reason') - 0.3, to: frame(R.firstRow, { fill: 0.72, max: 2.4, pad: 10 }) },
    { t: cue('s05', 'moat') - 0.3, to: frame(R.list, { fill: 0.92, max: 1.5, anchorY: 0.4 }) },
    { t: cue('s07', 'actions') - 0.35, to: frame(A.actions, { fill: 0.94, max: 1.7 }) },
    { t: cue('s07', 'cards') - 0.3, to: frame(A.actionLead, { fill: 0.86, max: 2.0, pad: 10 }) },
    { t: cue('s07', 'report') - 0.3, to: frame(A.actionOther, { fill: 0.86, max: 2.0, pad: 10 }) },
    { t: cue('s09', 'health') - 0.35, to: frame(A.health, { fill: 0.95, max: 1.4 }) },
    { t: cue('s09', 'bands') - 0.3, to: frame(A.healthBands, { fill: 0.92, max: 1.8 }) },
].map((s) => ({ ...s, t: round(s.t, 3), dur: 1 }));
for (let i = 0; i < shots.length - 1; i++) {
    const gap = shots[i + 1].t - shots[i].t;
    if (gap < 0.25) throw new Error(`camera shots ${i} and ${i + 1} are ${gap.toFixed(2)}s apart; retime the cues`);
    shots[i].dur = round(Math.min(1, gap - 0.05), 3);
}

// Which page state is on screen when. Cross-faded, never swapped.
const states = [
    { id: 'ui-state-new_gifts', on: hosts.ui.start - 0.2, off: cue('s04', 'atrisk') - 0.45 },
    { id: 'ui-state-at_risk', on: cue('s04', 'atrisk') - 0.5, off: cue('s07', 'actions') - 0.45 },
    { id: 'ui-state-new_gifts-2', on: cue('s07', 'actions') - 0.5, off: hosts.ui.end },
].map((s) => ({ ...s, on: round(Math.max(hosts.ui.start - 0.2, s.on), 3), off: round(s.off, 3) }));

// The dialog rides above the page, on its own layer, and does not move with the camera.
const dialog = { on: round(cue('s08', 'dialog') - 0.25, 3), off: round(end('s08') - 0.15, 3) };

const RING_PAD = 8;
const ring = (id, rect, on, off) => ({ id, on: round(on, 3), off: round(off, 3), rect: { x: rect.x - RING_PAD, y: rect.y - RING_PAD, w: rect.w + RING_PAD * 2, h: rect.h + RING_PAD * 2 } });
/*
    One ring per claim. The first cut ran the ring for under a third of the product
    footage, with gaps of ten to twenty-four seconds over the strongest lines, so the
    viewer was being told where to look and not shown. Every sentence that names
    something on the page now points at it.
*/
const rings = [
    ring('ring-retention', A.stripRetention, cue('s02', 'retention'), cue('s02', 'fytd') - 0.1),
    ring('ring-fytd', A.stripFytd, cue('s02', 'fytd'), cue('s02', 'firstyear') - 0.1),
    ring('ring-firstyear', A.stripFirstYear, cue('s02', 'firstyear'), cue('s03', 'tiles') - 0.3),
    ring('ring-money', A.tileMoney, cue('s03', 'money'), cue('s04', 'atrisk') - 0.4),
    ring('ring-atrisk-tile', R.tileAtRisk, cue('s04', 'atrisk'), cue('s04', 'cadence') - 0.15),
    ring('ring-first-row', R.firstRow, cue('s04', 'sorted'), cue('s05', 'reason') - 0.1),
    // The why-now sentence, then the line under it: what they gave and whether they read you.
    ring('ring-why', R.firstRowWhy, cue('s05', 'reason'), cue('s05', 'reads') - 0.1),
    ring('ring-reads', R.firstRowSub, cue('s05', 'reads'), cue('s05', 'moat') - 0.15),
    ring('ring-actions', A.actionLead, cue('s07', 'cards'), cue('s07', 'report') - 0.15),
    // Follows the narration onto the second card, so the dialog that opens next matches.
    ring('ring-report', A.actionOther, cue('s07', 'report'), end('s07') - 0.15),
    ring('ring-bands', A.healthBands, cue('s09', 'bands'), end('s09') - 0.4),
];

/*
    A label earns its place by saying something the frame does not. Half of the first
    cut's labels repeated a heading that was legible in the same frame ("Fiscal year to
    date" under FISCAL YEAR TO DATE), which reads as a rendering fault rather than a
    caption. These ask the question the number answers instead.
*/
const labelCues = [
    ['Did last year\u2019s donors come back?', cue('s02', 'retention')],
    ['Ahead or behind?', cue('s02', 'fytd')],
    ['Did the new ones stay?', cue('s02', 'firstyear')],
    ['Six groups', cue('s03', 'tiles')],
    ['What is at stake', cue('s03', 'money')],
    ['The group to open first', cue('s04', 'atrisk')],
    ['Measured against their own rhythm', cue('s04', 'cadence')],
    ['Why this person, now', cue('s05', 'row')],
    ['They stopped giving. They still read you.', cue('s05', 'moat')],
    ['Two things, already written', cue('s07', 'actions')],
    ['Three ways to make it', cue('s08', 'routes')],
    ['The monthly view', cue('s09', 'health')],
    ['Where the money stays', cue('s09', 'bands')],
];
// A label retires with its beat. Left to run until the next cue they averaged nine
// seconds and outlived their sentence by several, so they read as stuck.
const LABEL_MAX = 4.5;
const labels = labelCues.map(([text, on], i) => {
    const next = i < labelCues.length - 1 ? labelCues[i + 1][1] - 0.05 : end('s09') - 0.3;
    return { id: `label-${i}`, text, on: round(on, 3), off: round(Math.min(next, on + LABEL_MAX), 3) };
});

const ui = {
    start: hosts.ui.start,
    duration: hosts.ui.duration,
    shots, rings, labels, states, dialog,
};

fs.writeFileSync(path.join(ASSETS, 'timeline.js'),
    '// Generated by video/tools/build-compositions.mjs. Do not edit.\n'
    + `window.SR_TIMELINE = ${JSON.stringify({ duration: DURATION, estimated: timeline.estimated, hosts, scenes: S })};\n`
    + `window.SR_UI = ${JSON.stringify(ui)};\n`);

// ---------------------------------------------------------------------------
// 4. The UI composition: one page per state, stacked
// ---------------------------------------------------------------------------
const demoHtml = fs.readFileSync(path.join(SITE_DIR, 'demo', 'index.html'), 'utf8');
const startAt = demoHtml.indexOf('<div id="dashboard"');
const endAt = demoHtml.indexOf('<template data-');
if (startAt === -1 || endAt === -1) throw new Error('Could not find the dashboard markup in demo/index.html');
const templatesHtml = demoHtml.slice(endAt, demoHtml.indexOf('<div id="replica-toast"'));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body>${demoHtml.slice(startAt, endAt)}${templatesHtml}</body></html>`);
const built = await page.evaluate(({ wantStates, wantDialog }) => {
    const root = document.querySelector('#dashboard');
    const fail = (m) => { throw new Error(m); };
    const tpl = (sel) => document.querySelector(sel) || fail(`template ${sel}`);

    // The toast and anything interactive has no part in the video.
    root.querySelectorAll('[data-inert]').forEach((el) => el.removeAttribute('data-inert'));

    const out = {};
    for (const [id, key] of wantStates) {
        const clone = root.cloneNode(true);
        const card = clone.querySelector('section[data-signals] .sig-block') || fail('card');
        card.innerHTML = tpl(`template[data-state="${key}"]`).innerHTML;
        /*
            The state id goes on a WRAPPER, never on the clone: every rule in the
            product's stylesheet is scoped `#dashboard [data-signals] ...`, so
            renaming the element stripped the entire page back to unstyled text.
            Four elements share id="dashboard" here, which CSS is happy with (only
            getElementById cares) and nothing in the video calls that.
        */
        const wrap = document.createElement('div');
        wrap.id = id;
        wrap.className = 'ui-state';
        wrap.appendChild(clone);
        out[id] = wrap.outerHTML;
    }
    return { states: out, dialog: tpl(`template[data-dialog="${wantDialog}"]`).innerHTML };
}, {
    wantStates: [
        ['ui-state-new_gifts', 'new_gifts|feed'],
        ['ui-state-at_risk', 'at_risk|feed'],
        ['ui-state-new_gifts-2', 'new_gifts|feed'],
    ],
    wantDialog: 'new_gifts|report-ai',
});
await browser.close();

/*
    The replica's cover paths are relative to demo/; in the video project the same
    files live under assets/. Without this the renderer silently drops every action
    card image and the cards render as empty sheets.
*/
const reAsset = (html) => html.replace(/(<img[^>]+src=")img\//g, '$1assets/img/');
built.states = Object.fromEntries(Object.entries(built.states).map(([k, v]) => [k, reAsset(v)]));
built.dialog = reAsset(built.dialog);

const ringHtml = rings.map((r) => `<div class="ui-ring" id="${r.id}" style="left:${r.rect.x}px;top:${r.rect.y}px;width:${r.rect.w}px;height:${r.rect.h}px"></div>`).join('\n          ');
const labelHtml = labels.map((l) => `<div class="ui-label" id="${l.id}">${l.text.replace(/&/g, '&amp;')}</div>`).join('\n        ');
const stateHtml = Object.values(built.states).join('\n          ');

const uiHtml = `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Generated by video/tools/build-compositions.mjs from donor-signals/demo/index.html. Do not edit. -->
    <template id="ui-template">
      <style>
        #root { position: absolute; inset: 0; overflow: hidden; }
        /* The product's CSS animations run on wall-clock time, not the video's, so they
           would render differently on every seek. GSAP owns all motion. */
        #ui-page *, #ui-page *::before, #ui-page *::after,
        #ui-dialog *, #ui-dialog *::before, #ui-dialog *::after { animation: none !important; transition: none !important; }
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
        .ui-viewport { position: absolute; left: 0; top: ${WIN.bar}px; width: ${VW}px; height: ${VH}px; overflow: hidden; background: #171c22; }
        #ui-page { position: absolute; left: 0; top: 0; width: ${PAGE_W}px; transform-origin: 0 0; }
        /* One full page per state, stacked and cross-faded: swapping markup would not
           survive a seek, opacity does. */
        .ui-state { position: absolute; left: 0; top: 0; width: ${PAGE_W}px; opacity: 0; }
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
        /* The dialog sits over the window, not inside the camera, so it stays legible. */
        #ui-dialog {
          position: absolute; left: ${WIN.left}px; top: ${WIN.top}px; width: ${WIN.width}px; height: ${WIN.height}px;
          display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; z-index: 900;
        }
        /*
            The dialog carries the same #dashboard [data-signals] scope the page does,
            because every modal rule is written against it. Without the wrapper the
            markup renders as a run of unstyled text over the window. The scope
            wrapper is laid out flat so it adds nothing of its own.
        */
        #ui-dialog .ui-scope, #ui-dialog .ui-scope > [data-signals] { display: contents; }
        #ui-dialog #dashboard [data-signals] .sig-modal-backdrop { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(8,12,16,0.72); }
        #ui-dialog #dashboard [data-signals] .sig-modal { transform: scale(1.35); transform-origin: center; }
      </style>

      <div id="root" data-composition-id="ui" data-width="1920" data-height="1080">
        <div class="ui-window" id="ui-window">
          <div class="ui-bar">
            <span class="ui-dots"><i></i><i></i><i></i></span>
            <span class="ui-url">app.storyraise.com/#/${config.identity.org_slug}/signals</span>
          </div>
          <div class="ui-viewport">
            <div id="ui-page">
          ${stateHtml}
          ${ringHtml}
            </div>
          </div>
        </div>
        <div id="ui-dialog"><div class="ui-scope" id="dashboard"><div data-signals>${built.dialog}</div></div></div>
        ${labelHtml}
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
const narration = timeline.scenes.filter((s) => s.audio).map((s) =>
    `  <audio id="vo-${s.id}" src="${s.audio}" data-start="${s.voStart}" data-duration="${round(s.voLength + 0.05, 3)}" data-track-index="20" data-audio-group="voiceover" data-volume="1"></audio>`);
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
  <title>Storyraise Donor Signals tour</title>
  <link rel="stylesheet" href="assets/replica.css" />
  <link rel="stylesheet" href="assets/stage.css" />
  <script src="assets/gsap.min.js"></script>
  <script src="assets/timeline.js"></script>
</head>
<body>
<div id="root-stage" data-composition-id="root" data-width="1920" data-height="1080" data-start="0" data-duration="${DURATION}">
  <div id="stage-bg" class="clip stage-bg" data-start="0" data-duration="${DURATION}" data-track-index="0"></div>
${['s01', 'ui', 's10'].filter((id) => hosts[id]).map((id, i) => host(id, i + 1)).join('\n')}
${[...narration, ...music].join('\n')}
  <script>
    window.__timelines["root"] = gsap.timeline({ paused: true });
  </script>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(VIDEO, 'index.html'), indexHtml);

console.log(`${timeline.estimated ? 'ESTIMATED timing. ' : ''}${DURATION}s, ${shots.length} shots, ${rings.length} rings, ${labels.length} labels, ${states.length} state fades, ${narration.length} narration clips${music.length ? ', music' : ''}`);
