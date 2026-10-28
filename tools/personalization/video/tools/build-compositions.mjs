// Assemble the HyperFrames project from the timeline, the screen stills, and their rects.
//
//   node video/tools/shoot-screens.mjs      (first: stills + video/targets.json)
//   node video/tools/build-compositions.mjs
//
// Writes, under tools/personalization/video/:
//   assets/timeline.js   window.SR_TIMELINE (scene windows, cues) and window.SR_UI
//                        (state fades, camera shots, rings, labels, URL changes)
//   index.html           the root composition: backdrop, scene hosts, narration, music
//   compositions/ui.html the product screens under a GSAP camera
//
// The tour crosses five product screens, each with its own product CSS, so the UI is
// stills of the built demo screens (shot at 3x by shoot-screens.mjs) rather than live
// markup. Each state is a layer stacked in the same place and only its opacity moves,
// which survives HyperFrames seeking. Every rect the camera and rings use comes from
// targets.json, measured on the same render as the still.
import fs from 'node:fs';
import path from 'node:path';
import { DOCS_ROOT, TOOLS_DIR, config, readJson } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const ASSETS = path.join(VIDEO, 'assets');
const timeline = readJson(path.join(VIDEO, 'timeline.json'));
const targets = readJson(path.join(VIDEO, 'targets.json'));
const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

// ---------------------------------------------------------------------------
// 1. Assets
// ---------------------------------------------------------------------------
fs.mkdirSync(path.join(ASSETS, 'fonts'), { recursive: true });
fs.mkdirSync(path.join(VIDEO, 'compositions'), { recursive: true });
const copy = (from, to) => fs.copyFileSync(from, path.join(ASSETS, to));
copy(path.join(TOOLS_DIR, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), 'gsap.min.js');
copy(path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-TextRegular.woff2'), 'fonts/PPFragment-TextRegular.woff2');
copy(path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-GlareExtraBold.woff2'), 'fonts/PPFragment-GlareExtraBold.woff2');
copy(path.join(config.builder.path, 'public', 'assets', 'logos', 'Storyraise — Logos_Storyraise Logo — Heavy Icon.svg'), 'logo-icon.svg');
// Leftovers from the Connections kit this one was copied from.
for (const f of fs.readdirSync(ASSETS)) if (/^logo-(?!icon|wordmark)/.test(f) || f === 'replica.css') fs.rmSync(path.join(ASSETS, f));
fs.rmSync(path.join(ASSETS, 'img'), { recursive: true, force: true });
for (const w of [400, 500, 600]) {
    if (!fs.existsSync(path.join(ASSETS, 'fonts', `Poppins-${w}.woff2`))) throw new Error(`Poppins-${w}.woff2 missing from assets/fonts`);
}

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

// Title card, then the product (Storyraise Send included), then the close.
const hosts = {
    s01: { start: S.s01.start, end: cue('s02', 'tab') + 0.1 },
    ui: { start: cue('s02', 'tab') - 0.3, end: S.s10.start + 0.3 },
    s10: { start: S.s10.start, end: DURATION },
};
for (const h of Object.values(hosts)) {
    h.start = round(h.start, 3);
    h.duration = round(h.end - h.start, 3);
}

// ---------------------------------------------------------------------------
// 3. States, camera, rings
// ---------------------------------------------------------------------------
// The window stops short of the bottom so captions sit in their own band under it
// and can never cover the product (review round 2: they covered headings at the top too).
const WIN = { left: 100, top: 56, width: 1720, height: 876, bar: 52 };
const VW = WIN.width;
const VH = WIN.height - WIN.bar;
const PAGE_W = targets.width;
const BASE = VW / PAGE_W;
const shot = (key) => targets.shots[key] || (() => { throw new Error(`no still ${key}; run shoot-screens.mjs`); })();
const has = (key) => Boolean(targets.shots[key]);
const R = (key, id) => shot(key).rects[id] || (() => { throw new Error(`no rect ${key}.${id}`); })();

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const union = (...rects) => {
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
};

function frame(key, rect, { fill = 0.85, max = 2.4, min = BASE, pad = 0 } = {}) {
    const pageH = shot(key).height;
    const r = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
    const scale = Math.max(min, Math.min(max, (VW * fill) / r.w, (VH * fill) / r.h));
    let x = VW / 2 - (r.x + r.w / 2) * scale;
    let y = VH / 2 - (r.y + r.h / 2) * scale;
    x = PAGE_W * scale <= VW ? (VW - PAGE_W * scale) / 2 : clamp(x, VW - PAGE_W * scale, 0);
    // Up to 40px of slack above the page, so a ring on a top toolbar is not cut by the window edge.
    y = pageH * scale <= VH ? Math.min(40, Math.max(0, y)) : clamp(y, VH - pageH * scale, 40);
    return { x: round(x), y: round(y), scale: round(scale, 4) };
}
const whole = (key) => frame(key, { x: 0, y: 0, w: PAGE_W, h: VH / BASE }, { fill: 1 });

/*
    The storyboard, one beat per narration cue. Each beat may switch the visible
    state (a crossfade to another still), move the camera, and light rings.
    `at` is an absolute time; rings stay lit until the next beat unless `ringOff` says.
*/
const B = [];
const beat = (at, state, { cam, rings = [], label = null } = {}) => B.push({ at: round(at, 3), state, cam, rings, label });

// s02 Add constituents
beat(hosts.ui.start, 'constituents-list', { cam: 'whole', rings: ['title'] });
beat(cue('s02', 'add'), 'constituents-list', { cam: { rect: union(R('constituents-list', 'title'), R('constituents-list', 'add')), fill: 0.95, max: 2.0, pad: 20 }, rings: ['add'] });
beat(cue('s02', 'csv'), 'constituents-add-csv', { cam: { rect: R('constituents-add-csv', 'card'), fill: 0.9, max: 1.9 }, rings: ['upload'], label: 'Upload a CSV file' });
beat(cue('s02', 'crm'), 'constituents-add-csv', { rings: ['crm'], label: 'Or connect your CRM' });
// s03 CSV columns: the instruction, then the file's own columns in Map your columns.
beat(cue('s03', 'required'), 'constituents-add-csv', { cam: { rect: R('constituents-add-csv', 'csv'), fill: 0.85, max: 2.4, pad: 20 }, rings: ['csv'], label: 'First Name · Last Name · Email' });
beat(cue('s03', 'custom'), 'constituents-map', { cam: { rect: union(R('constituents-map', 'coreCols'), R('constituents-map', 'customCols')), fill: 0.95, max: 2.2, pad: 16 }, rings: ['customCols'], label: 'Every other column: a custom field' });
beat(cue('s03', 'map'), 'constituents-map', { cam: { rect: R('constituents-map', 'map-core'), fill: 0.9, max: 2.2, pad: 70 }, rings: ['map-core'], label: 'Map your columns' });
beat(cue('s03', 'import'), 'constituents-map', { cam: { rect: R('constituents-map', 'import'), fill: 0.3, max: 2.2, pad: 40 }, rings: ['import'] });
// s04 Constituent profile
beat(cue('s04', 'open'), 'profile-profile', { cam: { rect: R('profile-profile', 'profile-head'), fill: 0.7, max: 1.9, pad: 20 }, rings: ['profile-head'] });
beat(cue('s04', 'table'), 'profile-profile', { cam: { rect: R('profile-profile', 'variables'), fill: 0.95, max: 2.4 }, rings: ['variables'], label: 'Every field is a variable' });
beat(cue('s04', 'tag'), 'profile-profile', { cam: { rect: R('profile-profile', 'tag-donor-level'), fill: 0.7, max: 2.6, pad: 40 }, rings: ['tag-donor-level'] });
// s05 Merge fields: the sentence with its variables, then that sentence for Emily.
const tline = has('builder-tags') && shot('builder-tags').rects['template-line'] ? 'template-line' : 'merge-tags';
const lline = shot('preview-emily').rects['letter-line'] ? 'letter-line' : 'greeting';
beat(cue('s05', 'canvas'), 'builder-tags', { cam: { rect: R('builder-tags', tline), fill: 0.7, max: 1.6, pad: 60 } });
beat(cue('s05', 'prepared'), 'builder-tags', { cam: { rect: R('builder-tags', tline), fill: 0.95, max: 2.6, pad: 24 }, rings: [tline], label: '@@first_name@@ · @@gift_amount@@ · @@donor_level@@' });
beat(cue('s05', 'becomes'), 'preview-emily', { cam: { rect: R('preview-emily', lline), fill: 0.95, max: 2.6, pad: 24 }, rings: [lline], label: 'Emily Wilson' });
// s06 Show When
beat(cue('s06', 'select'), 'builder-gold', { cam: 'whole', rings: ['gold-section'] });
beat(cue('s06', 'showwhen'), 'builder-gold', { cam: { rect: union(R('builder-gold', 'show-when'), R('builder-gold', 'sw-value')), fill: 0.9, max: 2.1, pad: 30 }, rings: ['show-when'], label: 'Use Data · Show When' });
beat(cue('s06', 'variable'), 'builder-gold', { rings: ['sw-variable'] });
beat(cue('s06', 'condition'), 'builder-gold', { rings: ['sw-condition'] });
beat(cue('s06', 'value') + 0.15, 'builder-gold', { rings: ['sw-value'], label: 'donor_level is Gold' });
const swPanel = (k) => ({ rect: union(R(k, 'show-when'), R(k, 'sw-value')), fill: 0.9, max: 2.1, pad: 30 });
beat(cue('s06', 'levels'), 'builder-silver', { cam: swPanel('builder-silver'), rings: ['sw-value'], label: 'donor_level is Silver' });
beat(cue('s06', 'levels') + 1.6, 'builder-bronze', { cam: swPanel('builder-bronze'), rings: ['sw-value'], label: 'donor_level is Bronze' });
// s07 Preview
beat(cue('s07', 'preview'), 'preview-emily', { cam: { rect: R('preview-emily', 'previewing-as'), fill: 0.45, max: 2.2, pad: 30 }, rings: ['previewing-as'], label: 'Open web preview' });
beat(cue('s07', 'emily'), 'preview-emily', { cam: { rect: R('preview-emily', 'greeting'), fill: 0.6, max: 2.0, pad: 30 }, rings: ['greeting'], label: 'Emily Wilson · Bronze' });
beat(cue('s07', 'emilystory'), 'preview-emily', { cam: { rect: R('preview-emily', 'level-section'), fill: 0.9, max: 1.6 }, rings: ['level-section'] });
beat(cue('s07', 'james') - 0.2, 'preview-lookup', { cam: 'whole', rings: ['lookup'] });
beat(cue('s07', 'james') + 1.0, 'preview-james', { cam: { rect: R('preview-james', 'greeting'), fill: 0.6, max: 2.0, pad: 30 }, rings: ['greeting'], label: 'James Taylor · Gold' });
beat(cue('s07', 'jamesstory') + 0.9, 'preview-james', { cam: { rect: R('preview-james', 'level-section'), fill: 0.9, max: 1.6 }, rings: ['level-section'] });
// s08 Publish, then Share
const shareBtn = shot('share-platform').rects['share-btn'] ? ['share-btn'] : [];
beat(cue('s08', 'share'), 'share-platform', { cam: 'whole', rings: shareBtn, label: 'Publish, then Share' });
beat(cue('s08', 'platform'), 'share-platform', { cam: { rect: R('share-platform', 'modal'), fill: 0.95, max: 1.9 }, rings: ['platform'], label: 'Which platform will you use?' });
beat(cue('s08', 'getlink'), 'share-platform', { rings: ['get-link'] });
beat(cue('s08', 'link'), 'share-link', { cam: { rect: R('share-link', 'copy-link'), fill: 0.95, max: 2.2, pad: 30 }, rings: ['copy-link'], label: 'Each donor opens their own report' });
// s09 Storyraise Send: the card, the real draft, the real recipients step.
beat(cue('s09', 'sendcard'), 'share-link', { cam: { rect: R('share-link', 'send-card'), fill: 0.7, max: 2.2, pad: 24 }, rings: ['send-card'] });
beat(cue('s09', 'draft'), 'send-draft', { cam: { rect: R('send-draft', 'email'), fill: 0.95, max: 1.8, pad: 20 }, rings: ['view-button'], label: 'View the Report, personalized' });
beat(cue('s09', 'steps'), 'send-recipients', { cam: { rect: union(R('send-recipients', 'steps'), R('send-recipients', 'list')), fill: 0.9, max: 1.9, pad: 24 }, rings: ['list'], label: 'Pick your recipients' });
if (has('send-schedule')) beat(cue('s09', 'steps') + 2.6, 'send-schedule', { cam: { rect: union(R('send-schedule', 'steps'), R('send-schedule', 'schedule')), fill: 0.9, max: 1.9, pad: 24 }, rings: ['schedule'], label: 'Schedule it, or send now' });

B.sort((a, b) => a.at - b.at);
for (let i = 0; i < B.length - 1; i++) {
    if (B[i + 1].at - B[i].at < 0.3) throw new Error(`beats at ${B[i].at} and ${B[i + 1].at} are under 0.3s apart; retime`);
}

// State layers: one per still, lit for every run of beats that shows it.
const runs = [];
for (const b of B) {
    const last = runs[runs.length - 1];
    if (last && last.key === b.state) continue;
    if (last) last.off = b.at;
    runs.push({ key: b.state, on: b.at });
}
runs[runs.length - 1].off = hosts.ui.end;
const layerKeys = [...new Set(runs.map((r) => r.key))];
const states = runs.map((r, i) => ({ id: `st-${r.key}`, layer: `ui-${r.key}`, on: round(i === 0 ? hosts.ui.start - 0.2 : r.on, 3), off: round(r.off, 3) }));

// Camera: a shot per beat that names one; the first is the opening framing.
// A beat with rings but no framing of its own still gets one when the current
// framing would cut a ring off: every ring sits at least MARGIN inside the window.
const MARGIN = 30;
const onScreen = (to, r) => ({ x: r.x * to.scale + to.x, y: r.y * to.scale + to.y, w: r.w * to.scale, h: r.h * to.scale });
const inside = (box) => box.x >= MARGIN && box.y >= MARGIN && box.x + box.w <= VW - MARGIN && box.y + box.h <= VH - MARGIN;
const shots = [];
let view = null;
for (const b of B) {
    let to = null;
    if (b.cam) to = b.cam === 'whole' ? whole(b.state) : frame(b.state, b.cam.rect, b.cam);
    const target = to || view;
    const ringRects = b.rings.map((id) => R(b.state, id));
    if (target && ringRects.length && !ringRects.every((r) => inside(onScreen(target, { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 })))) {
        const u = union(...ringRects);
        to = frame(b.state, u, { fill: 0.8, max: target.scale, min: Math.min(BASE, target.scale), pad: MARGIN + 10 });
    }
    if (to) { shots.push({ t: round(b.at - 0.15, 3), to }); view = to; }
    b.view = view;
}
shots[0].t = hosts.ui.start;
for (let i = 0; i < shots.length; i++) {
    const gap = i < shots.length - 1 ? shots[i + 1].t - shots[i].t : 1.2;
    shots[i].dur = round(Math.min(1, gap - 0.05), 3);
}

// Rings: on at the beat, off at the next beat (or after 3.5s).
const RING_PAD = 7;
const rings = [];
B.forEach((b, i) => {
    const next = B[i + 1] ? B[i + 1].at : hosts.ui.end - 0.2;
    b.rings.forEach((id, j) => {
        const rect = R(b.state, id);
        rings.push({
            id: `ring-${i}-${j}`, layer: `ui-${b.state}`,
            on: round(b.at + 0.25, 3), off: round(Math.min(next - 0.1, b.at + 3.5), 3),
            rect: { x: rect.x - RING_PAD, y: rect.y - RING_PAD, w: rect.w + RING_PAD * 2, h: rect.h + RING_PAD * 2 },
        });
    });
});

// A label says something the frame does not, and stays up until the next one. It sits
// bottom-left unless a ring of that beat would be under it; then it moves to the top.
const LABEL_MAX = 4;
const LABEL_BOX = { x: 0, y: VH + 40, w: 0, h: 0 }; // below the window: never over a ring
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const labelBeats = B.filter((b) => b.label);
const labels = labelBeats.map((b, i) => {
    const next = labelBeats[i + 1] ? labelBeats[i + 1].at - 0.05 : hosts.ui.end - 0.3;
    const top = b.view && b.rings.some((id) => overlaps(onScreen(b.view, R(b.state, id)), LABEL_BOX));
    return { id: `label-${i}`, text: b.label, top, on: round(b.at + 0.2, 3), off: round(Math.min(next, b.at + LABEL_MAX), 3) };
});

// The URL pill follows the screen.
const screenUrl = (key) => {
    const slug = config.identity.org_slug;
    const report = '2026-impact-report';
    const [screen, state] = key.split(/-(.*)/s);
    if (screen === 'constituents') return `app.storyraise.com/#/${slug}/constituents`;
    if (screen === 'send') return 'send.storyraise.com/send/';
    if (screen === 'profile') return `app.storyraise.com/#/${slug}/constituents/emily-wilson`;
    if (screen === 'preview') {
        const who = { emily: 'emily.wilson', james: 'james.taylor' }[state];
        return `app.storyraise.com/preview/#/${slug}/${report}${who ? `?for=${who}@${config.identity.link_host}` : ''}`;
    }
    return `app.storyraise.com/builder/#/${slug}/${report}`;
};
const urls = [];
for (const s of states) {
    const text = screenUrl(s.layer.slice(3));
    if (!urls.length || urls[urls.length - 1].text !== text) urls.push({ id: `url-${urls.length}`, text, on: s.on });
}
urls.forEach((u, i) => { u.off = i < urls.length - 1 ? urls[i + 1].on : hosts.ui.end; });

const ui = { start: hosts.ui.start, duration: hosts.ui.duration, states, shots, rings, labels, urls };

fs.writeFileSync(path.join(ASSETS, 'timeline.js'),
    '// Generated by video/tools/build-compositions.mjs. Do not edit.\n'
    + `window.SR_TIMELINE = ${JSON.stringify({ duration: DURATION, estimated: timeline.estimated, hosts, scenes: S })};\n`
    + `window.SR_UI = ${JSON.stringify(ui)};\n`);

// ---------------------------------------------------------------------------
// 4. The UI composition
// ---------------------------------------------------------------------------
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const layerHtml = layerKeys.map((key) => {
    const s = shot(key);
    const mine = rings.filter((r) => r.layer === `ui-${key}`)
        .map((r) => `<div class="ui-ring" id="${r.id}" style="left:${r.rect.x}px;top:${r.rect.y}px;width:${r.rect.w}px;height:${r.rect.h}px"></div>`).join('');
    return `<div class="ui-layer" id="ui-${key}" style="height:${s.height}px"><img src="${s.src}" alt="" width="${PAGE_W}" height="${s.height}" />${mine}</div>`;
}).join('\n              ');
const labelHtml = labels.map((l) => `<div class="ui-label${l.top ? ' is-top' : ''}" id="${l.id}">${esc(l.text)}</div>`).join('\n        ');
const urlHtml = urls.map((u) => `<span class="ui-url" id="${u.id}">${esc(u.text)}</span>`).join('');

const uiHtml = `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Generated by video/tools/build-compositions.mjs from the personalization demo screens. Do not edit. -->
    <template id="ui-template">
      <style>
        #root { position: absolute; inset: 0; overflow: hidden; }
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
        .ui-urls { position: relative; flex: 1; height: 38px; margin-right: 180px; }
        .ui-url {
          position: absolute; left: 50%; top: 0; transform: translateX(-50%); white-space: nowrap; opacity: 0;
          font: 400 19px/1 "Poppins", sans-serif; color: rgba(255, 255, 255, 0.66);
          background: rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 9px 22px;
        }
        .ui-viewport { position: absolute; left: 0; top: ${WIN.bar}px; width: ${VW}px; height: ${VH}px; overflow: hidden; background: #171c22; }
        #ui-page { position: absolute; left: 0; top: 0; width: ${PAGE_W}px; transform-origin: 0 0; }
        .ui-layer { position: absolute; left: 0; top: 0; width: ${PAGE_W}px; opacity: 0; }
        .ui-layer img { display: block; width: ${PAGE_W}px; }
        .ui-ring {
          position: absolute; z-index: 10; box-sizing: border-box; border: 3px solid #c79bf2; border-radius: 12px; pointer-events: none;
          box-shadow: 0 0 0 5px rgba(199, 155, 242, 0.16), 0 0 30px rgba(199, 155, 242, 0.4); opacity: 0; visibility: hidden;
        }
        .ui-label {
          position: absolute; left: 0; right: 0; margin: 0 auto; width: max-content; top: 952px; white-space: nowrap; opacity: 0; visibility: hidden; z-index: 950;
          font: 600 34px/1 "Poppins", sans-serif; color: #ffffff; background: rgba(17, 14, 23, 0.9);
          border-left: 6px solid #c79bf2; border-radius: 16px; padding: 18px 28px 18px 24px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
        }
        .ui-label.is-top { top: 150px; }
      </style>

      <div id="root" data-composition-id="ui" data-width="1920" data-height="1080">
        <div class="ui-window" id="ui-window">
          <div class="ui-bar">
            <span class="ui-dots"><i></i><i></i><i></i></span>
            <span class="ui-urls">${urlHtml}</span>
          </div>
          <div class="ui-viewport">
            <div id="ui-page">
              ${layerHtml}
            </div>
          </div>
        </div>
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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <title>Storyraise personalization tour</title>
  <link rel="stylesheet" href="assets/stage.css" />
  <script src="assets/gsap.min.js"></script>
  <script src="assets/timeline.js"></script>
</head>
<body>
<div id="root-stage" data-composition-id="root" data-width="1920" data-height="1080" data-start="0" data-duration="${DURATION}">
  <div id="stage-bg" class="clip stage-bg" data-start="0" data-duration="${DURATION}" data-track-index="0"></div>
${['s01', 'ui', 's10'].map((id, i) => host(id, i + 1)).join('\n')}
${[...narration, ...music].join('\n')}
  <script>
    window.__timelines["root"] = gsap.timeline({ paused: true });
  </script>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(VIDEO, 'index.html'), indexHtml);

console.log(`${timeline.estimated ? 'ESTIMATED timing. ' : ''}${DURATION}s, ${layerKeys.length} stills, ${states.length} state fades, ${shots.length} shots, ${rings.length} rings, ${labels.length} labels, ${urls.length} URLs, ${narration.length} narration clips${music.length ? ', music' : ''}`);
