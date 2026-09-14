// Assemble the HyperFrames project from the timeline and the captured product screens.
//
//   node video/tools/build-compositions.mjs
//
// Writes, under tools/automated-donor-journeys/video/:
//   assets/gsap.min.js, assets/img/*.png   GSAP and the captured screens (.cache/screens)
//   assets/timeline.js   window.SR_TIMELINE (scene windows, cues) and window.SR_UI (per-scene
//                        camera shots, crossfades, rings, labels)
//   compositions/s03, s04, s05, s07, s08   the UI scenes: a captured screen under a camera
//   index.html           the root: backdrop, scene hosts, narration, music bed
//
// The motion-graphic scenes (s01, s02, s06, s09, s10) are hand-authored in compositions/.
// Every rect comes from screens.json (capture-screens.mjs), so nothing measures the DOM
// while HyperFrames seeks.
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR, readJson } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const ASSETS = path.join(VIDEO, 'assets');
const SCREENS_DIR = path.join(TOOLS_DIR, '.cache', 'screens');
const timeline = readJson(path.join(VIDEO, 'timeline.json'));
const screens = readJson(path.join(SCREENS_DIR, 'screens.json'));
const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------------------
// 1. Assets
// ---------------------------------------------------------------------------
fs.mkdirSync(path.join(ASSETS, 'img'), { recursive: true });
fs.copyFileSync(path.join(TOOLS_DIR, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), path.join(ASSETS, 'gsap.min.js'));
for (const f of fs.readdirSync(SCREENS_DIR).filter((f) => f.endsWith('.png'))) {
    fs.copyFileSync(path.join(SCREENS_DIR, f), path.join(ASSETS, 'img', f));
}

// ---------------------------------------------------------------------------
// 2. Scene windows
// ---------------------------------------------------------------------------
const S = Object.fromEntries(timeline.scenes.map((s) => [s.id, s]));
const cue = (id, name) => {
    const t = S[id] && S[id].cues[name];
    if (t === undefined) throw new Error(`missing cue ${id}.${name}`);
    return t;
};
const end = (id) => S[id].start + S[id].duration;
const TAIL = 0.8;
const DURATION = round(timeline.duration + TAIL, 3);
const ORDER = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10'];
const LAST = ORDER.filter((id) => S[id]).at(-1);
const hosts = {};
for (const id of ORDER) {
    if (!S[id]) continue;  // switched off in vo-script.json
    const h = { start: round(S[id].start, 3), end: round(id === LAST ? DURATION : end(id), 3) };
    h.duration = round(h.end - h.start, 3);
    hosts[id] = h;
}

// ---------------------------------------------------------------------------
// 3. Camera plans for the UI scenes (page coordinates -> transforms)
// ---------------------------------------------------------------------------
const WIN = { left: 100, top: 80, width: 1720, height: 920, bar: 52 };
const VW = WIN.width;
const VH = WIN.height - WIN.bar;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const union = (...rects) => {
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
};
const need = (rect, name) => { if (!rect) throw new Error(`screens.json is missing ${name}; re-run capture-screens.mjs`); return rect; };

function framer(pageW, pageH) {
    const FIT = Math.min(VW / pageW, VH / pageH);
    const COVER = Math.max(VW / pageW, VH / pageH);
    const frame = (rect, { fill = 0.85, max = 2.6, min = FIT, anchorX = 0.5, anchorY = 0.5, pad = 0 } = {}) => {
        const r = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
        const scale = Math.max(min, Math.min(max, (VW * fill) / r.w, (VH * fill) / r.h));
        let x = VW * anchorX - (r.x + r.w / 2) * scale;
        let y = VH * anchorY - (r.y + r.h / 2) * scale;
        x = pageW * scale <= VW ? (VW - pageW * scale) / 2 : clamp(x, VW - pageW * scale, 0);
        y = pageH * scale <= VH ? (VH - pageH * scale) / 2 : clamp(y, VH - pageH * scale, 0);
        return { x: round(x), y: round(y), scale: round(scale, 4) };
    };
    frame.FIT = FIT;
    frame.COVER = COVER;
    return frame;
}

function plan(id, spec) {
    const shots = spec.shots.map((s) => ({ t: round(s.t, 3), to: s.to, dur: 1 }));
    for (let i = 0; i < shots.length - 1; i++) {
        const gap = shots[i + 1].t - shots[i].t;
        if (gap < 0.25) throw new Error(`${id}: camera shots ${i} and ${i + 1} are ${gap.toFixed(2)}s apart; retime them`);
        shots[i].dur = round(Math.min(1, gap - 0.05), 3);
    }
    const PAD = 8;
    return {
        start: hosts[id].start,
        duration: hosts[id].duration,
        enter: round(spec.enter === undefined ? 0.05 : spec.enter, 3),
        url: spec.url,
        page: spec.page,
        cues: S[id].cues,
        layers: spec.layers.map((l) => ({ name: l.name, src: l.src, on: l.on === undefined ? null : round(l.on, 3), off: l.off === undefined ? null : round(l.off, 3) })),
        shots,
        rings: (spec.rings || []).map(([name, rect, on, off]) => ({
            id: `${id}-ring-${name}`, on: round(on, 3), off: round(off, 3),
            rect: { x: rect.x - PAD, y: rect.y - PAD, w: rect.w + PAD * 2, h: rect.h + PAD * 2 },
        })),
        labels: (spec.labels || []).map(([text, on, off], i) => ({ id: `${id}-label-${i}`, text, on: round(on, 3), off: round(off, 3) })),
        extraCss: spec.extraCss || '',
        extraHtml: spec.extraHtml || '',
        extraJs: spec.extraJs || '',
    };
}

const UI = {};
const APP = { w: screens.viewport.width, h: screens.viewport.height };
const whole = { x: 0, y: 0, w: APP.w, h: APP.h };

// s03: the report with its merge tags, then the same report filled in for one donor.
if (hosts.s03) {
    const f = framer(APP.w, APP.h);
    const G = need(screens.readerRaw.rects.greeting, 'readerRaw.rects.greeting');
    const GP = need(screens.readerPersonal.rects.greeting, 'readerPersonal.rects.greeting');
    UI.s03 = plan('s03', {
        url: 'harbor-lights.yearly.report/welcome',
        page: APP,
        layers: [
            { name: 'raw', src: 'img/reader-raw.png' },
            { name: 'personal', src: 'img/reader-personal.png', on: cue('s03', 'fill') },
        ],
        shots: [
            { t: hosts.s03.start, to: f(whole, { min: f.COVER }) },
            { t: cue('s03', 'tags') + 0.2, to: f(G, { fill: 0.72, max: 2.2, pad: 30, min: f.COVER }) },
            { t: cue('s03', 'publish') - 0.2, to: f(whole, { min: f.COVER }) },
        ],
        rings: [
            ['tags', G, cue('s03', 'tags') + 1.0, cue('s03', 'fill') - 0.05],
            ['filled', GP, cue('s03', 'fill') + 0.35, cue('s03', 'publish') - 0.3],
        ],
        labels: [
            ['Merge tags', cue('s03', 'tags') + 0.9, cue('s03', 'fill') - 0.1],
            ['Filled in for each donor', cue('s03', 'fill') + 0.35, cue('s03', 'publish') - 0.1],
            ['Published once', cue('s03', 'publish') + 0.1, end('s03') - 0.4],
        ],
    });
}

// s04: Connections, the More menu with Auto-sync set to Daily, and the sync status.
if (hosts.s04) {
    const f = framer(APP.w, APP.h);
    const C = screens.connections.rects;
    const row = need(C.connectedRow, 'connections.rects.connectedRow');
    const menu = need(C.menu, 'connections.rects.menu');
    const settings = union(need(C.autoSync, 'autoSync'), need(C.frequency, 'frequency'));
    const synced = need(C.syncedText, 'syncedText');
    const top = { x: row.x, y: 30, w: row.w, h: 480 };
    UI.s04 = plan('s04', {
        url: 'app.storyraise.com/#/harbor-lights/connections',
        page: APP,
        layers: [
            { name: 'closed', src: 'img/connections.png' },
            // The menu closes again by fading out, not by stacking a second copy of the
            // closed screen (two identical img nodes risk being discovered twice).
            { name: 'menu', src: 'img/connections-menu.png', on: cue('s04', 'auto') - 0.1, off: cue('s04', 'new') },
        ],
        shots: [
            { t: hosts.s04.start, to: f(top, { fill: 1, min: f.COVER }) },
            { t: cue('s04', 'connect') + 0.6, to: f(row, { fill: 0.92, max: 2 }) },
            { t: cue('s04', 'auto') - 0.1, to: f(union(menu, { x: row.x + row.w - 520, y: row.y, w: 520, h: row.h }), { fill: 0.72, max: 2.6 }) },
            { t: cue('s04', 'new') + 0.2, to: f({ x: row.x, y: row.y - 10, w: 640, h: row.h + 20 }, { fill: 0.8, max: 2.6 }) },
            { t: cue('s04', 'hands') + 0.3, to: f(top, { fill: 1, min: f.COVER }) },
        ],
        rings: [
            ['row', row, cue('s04', 'connect') + 0.8, cue('s04', 'auto') - 0.2],
            ['auto-sync', settings, cue('s04', 'auto') + 0.5, cue('s04', 'new') - 0.1],
            ['synced', { x: synced.x - 6, y: synced.y - 5, w: 150, h: synced.h + 10 }, cue('s04', 'new') + 0.5, cue('s04', 'hands')],
        ],
        labels: [
            ['Connections', cue('s04', 'connect') + 0.3, cue('s04', 'auto') - 0.1],
            ['Auto-sync: Daily', cue('s04', 'auto') + 0.5, cue('s04', 'new') - 0.1],
            ['New donors sync on their own', cue('s04', 'new') + 0.5, end('s04') - 0.4],
        ],
    });
}

// s05: "Send this in an email": pick Other, paste a merge tag, copy the link. Then the
// one link, filled in with a different address for each recipient.
if (hosts.s05) {
    const f = framer(APP.w, APP.h);
    const M = screens.send.rects;
    const modal = need(M.modal, 'send.rects.modal');
    const tagZone = union(need(M.espSelect, 'espSelect'), need(M.tokenInput, 'tokenInput'));
    const linkZone = union(need(M.linkInput, 'linkInput'), need(M.copyButton, 'copyButton'));
    const addresses = ['{{email}}', 'maria.alvarez@harborlights.example', 'devon.park@harborlights.example', 'sam.rivera@harborlights.example'];
    UI.s05 = plan('s05', {
        url: 'app.storyraise.com/#/harbor-lights/reports',
        page: APP,
        layers: [
            { name: 'empty', src: 'img/send-empty.png' },
            { name: 'filled', src: 'img/send-filled.png', on: cue('s05', 'tag') + 0.3 },
            { name: 'copied', src: 'img/send-copied.png', on: cue('s05', 'copy') + 0.5 },
        ],
        shots: [
            { t: hosts.s05.start, to: f(modal, { fill: 0.92, max: 2 }) },
            { t: cue('s05', 'tag') - 0.1, to: f(tagZone, { fill: 0.8, max: 2.5, pad: 20 }) },
            { t: cue('s05', 'copy') - 0.1, to: f(linkZone, { fill: 0.8, max: 2.5, pad: 20 }) },
            { t: cue('s05', 'same') + 0.2, to: f(modal, { fill: 0.92, max: 2 }) },
            { t: cue('s05', 'each') - 0.2, to: f(linkZone, { fill: 0.8, max: 2.2, pad: 20, anchorY: 0.3 }) },
        ],
        rings: [
            ['tag', M.tokenInput, cue('s05', 'tag') + 0.5, cue('s05', 'copy') - 0.2],
            ['link', linkZone, cue('s05', 'copy') + 0.5, cue('s05', 'same') - 0.1],
        ],
        labels: [
            ['Send in an email', cue('s05', 'link') + 0.3, cue('s05', 'tag') - 0.1],
            ["Your platform's merge tag", cue('s05', 'tag') + 0.5, cue('s05', 'copy') - 0.1],
            ['Copy link', cue('s05', 'copy') + 0.4, cue('s05', 'same') - 0.1],
            ['One link for every email', cue('s05', 'same') + 0.2, cue('s05', 'each') - 0.1],
        ],
        extraCss: `
        #s05-each { position: absolute; left: 210px; top: 760px; width: 1500px; box-sizing: border-box; padding: 34px 44px; white-space: nowrap; opacity: 0; visibility: hidden; }
        #s05-each .s05-url { font: 500 30px/46px "Poppins", sans-serif; color: #cfc7dc; }
        #s05-each .s05-slot { position: relative; display: inline-block; width: 660px; height: 46px; vertical-align: top; }
        #s05-each .s05-slot span { position: absolute; left: 0; top: 0; font: 600 30px/46px "Poppins", sans-serif; color: #ff7a99; opacity: 0; visibility: hidden; }`,
        extraHtml: `<div class="sr-card" id="s05-each"><span class="s05-url">harbor-lights.yearly.report/welcome?for=</span><span class="s05-slot">${addresses.map((a, i) => `<span id="s05-e${i}">${esc(a)}</span>`).join('')}</span></div>`,
        extraJs: `
    var each = L(P.cues.each);
    tl.fromTo('#s05-each', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, each);
    tl.set('#s05-e0', { autoAlpha: 1 }, each);
    [1, 2, 3].forEach(function (i) {
      var t = each + 0.45 + i * 0.7;
      // The next address starts only once the last one has gone, so two never overlap.
      tl.to('#s05-e' + (i - 1), { autoAlpha: 0, y: -14, duration: 0.2, ease: 'power1.in' }, t);
      tl.fromTo('#s05-e' + i, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, t + 0.22);
    });
    tl.to('#s05-each', { autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, P.duration - 0.5);`,
    });
}

// s07: the donor clicks, Storyraise looks them up, and the report greets them by name.
if (hosts.s07) {
    const f = framer(APP.w, APP.h);
    const GP = need(screens.readerPersonal.rects.greeting, 'readerPersonal.rects.greeting');
    const BTN = { x: 560 + 56 + 160, y: 230 + 352 + 34 };  // center of #s07-button on the stage
    UI.s07 = plan('s07', {
        url: 'harbor-lights.yearly.report/welcome?for=maria.alvarez%40harborlights.example',
        page: APP,
        enter: cue('s07', 'greet') - hosts.s07.start - 0.35,
        layers: [{ name: 'personal', src: 'img/reader-personal.png' }],
        shots: [
            { t: hosts.s07.start, to: f(whole, { min: f.COVER }) },
            { t: cue('s07', 'greet') + 0.3, to: f(GP, { fill: 0.62, max: 2.2, pad: 30, min: f.COVER }) },
            { t: cue('s07', 'after') + 0.2, to: f(whole, { min: f.COVER }) },
        ],
        rings: [['greeting', GP, cue('s07', 'greet') + 1.0, cue('s07', 'after') - 0.1]],
        labels: [
            ['Greeted by name', cue('s07', 'greet') + 0.8, cue('s07', 'after') - 0.1],
            ['Nothing to republish', cue('s07', 'after') + 0.4, end('s07') - 0.4],
        ],
        extraCss: `
        #s07-email { position: absolute; left: 560px; top: 230px; width: 800px; height: 460px; box-sizing: border-box; padding: 44px 56px; opacity: 0; visibility: hidden; }
        #s07-email .s07-from { font: 500 26px/1.3 "Poppins", sans-serif; color: #a99fbb; margin: 18px 0 0; }
        #s07-email .s07-subject { font-size: 52px; line-height: 1.1; margin: 14px 0 0; }
        #s07-email .s07-body { font: 400 28px/1.45 "Poppins", sans-serif; color: #cfc7dc; margin: 18px 0 0; }
        #s07-button { position: absolute; left: 56px; top: 352px; width: 320px; height: 68px; border-radius: 14px; background: #803bb1; font: 600 28px/68px "Poppins", sans-serif; color: #ffffff; text-align: center; }
        #s07-lookup { position: absolute; left: 510px; top: 330px; width: 900px; box-sizing: border-box; padding: 44px 56px; opacity: 0; visibility: hidden; }
        #s07-lookup .s07-look { font: 500 34px/1.35 "Poppins", sans-serif; color: #f4f0fa; margin: 16px 0 0; }
        #s07-found { display: flex; align-items: center; gap: 22px; margin-top: 30px; opacity: 0; visibility: hidden; }
        #s07-found .s07-avatar { width: 76px; height: 76px; border-radius: 50%; background: #c79bf2; color: #1b1d21; font: 600 28px/76px "Poppins", sans-serif; text-align: center; flex-shrink: 0; }
        #s07-found .s07-name { display: block; font: 600 34px/1.2 "Poppins", sans-serif; color: #ffffff; }
        #s07-found .s07-meta { display: block; font: 400 24px/1.3 "Poppins", sans-serif; color: #a99fbb; }
        #s07-found svg { margin-left: auto; width: 52px; height: 52px; }
        #s07-cursor { position: absolute; left: 0; top: 0; width: 46px; height: 46px; opacity: 0; visibility: hidden; }
        #s07-click { position: absolute; left: ${BTN.x - 34}px; top: ${BTN.y - 34}px; width: 68px; height: 68px; box-sizing: border-box; border: 3px solid #ffffff; border-radius: 50%; opacity: 0; visibility: hidden; }`,
        extraHtml: `
        <div class="sr-card" id="s07-email">
          <p class="sr-kicker">New email</p>
          <p class="s07-from">Harbor Lights Community Foundation</p>
          <p class="sr-display s07-subject">Welcome to Harbor Lights, Maria</p>
          <p class="s07-body">Thank you for your first gift. We made something just for you.</p>
          <div id="s07-button">View your report</div>
        </div>
        <div class="sr-card" id="s07-lookup">
          <p class="sr-kicker">Storyraise</p>
          <p class="s07-look">Looking up <span class="sr-pink">maria.alvarez@harborlights.example</span></p>
          <div id="s07-found">
            <span class="s07-avatar">MA</span>
            <span><span class="s07-name">Maria Alvarez</span><span class="s07-meta">Constituent, synced from your CRM</span></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#45b27b"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
        <svg id="s07-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.5l15.5 9.2-6.9 1.5 3.9 7.3-2.9 1.5-3.9-7.3-5.2 4.8z" fill="#ffffff" stroke="#110e17" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <div id="s07-click"></div>`,
        extraJs: `
    var click = L(P.cues.click);
    var look = L(P.cues.lookup);
    var greet = L(P.cues.greet);
    tl.fromTo('#s07-email', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.05);
    tl.fromTo('#s07-cursor', { autoAlpha: 0, x: ${BTN.x + 260}, y: ${BTN.y + 200} }, { autoAlpha: 1, x: ${BTN.x + 120}, y: ${BTN.y + 90}, duration: 0.3, ease: 'power1.out' }, click + 0.05);
    tl.to('#s07-cursor', { x: ${BTN.x - 8}, y: ${BTN.y - 5}, duration: 0.55, ease: 'power2.inOut' }, click + 0.35);
    tl.set('#s07-click', { autoAlpha: 0.9, scale: 0.3 }, click + 0.95);
    tl.to('#s07-click', { autoAlpha: 0, scale: 1.4, duration: 0.5, ease: 'power2.out' }, click + 0.95);
    tl.to('#s07-button', { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 }, click + 0.95);
    tl.to('#s07-email', { autoAlpha: 0, y: -20, duration: 0.35, ease: 'power2.in' }, look - 0.3);
    tl.to('#s07-cursor', { autoAlpha: 0, duration: 0.3 }, look - 0.3);
    tl.fromTo('#s07-lookup', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, look);
    tl.fromTo('#s07-found', { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: 'power3.out' }, look + 0.7);
    tl.to('#s07-lookup', { autoAlpha: 0, y: -20, duration: 0.35, ease: 'power2.in' }, greet - 0.45);`,
    });
}

// s08: Analytics names who read it (the Harbor Lights Analytics demo's own card).
if (hosts.s08) {
    const A = screens.analytics.rects;
    const card = need(A.card, 'analytics.rects.card');
    const first = need(A.firstRow, 'analytics.rects.firstRow');
    const f = framer(card.w, card.h);
    // Four rows, stopping short of the fifth (rows sit about one row-height apart).
    const topRows = { x: first.x, y: first.y - 4, w: first.w, h: first.h * 4 - 8 };
    UI.s08 = plan('s08', {
        url: 'app.storyraise.com/#/harbor-lights/insights/welcome',
        page: { w: card.w, h: card.h },
        layers: [{ name: 'engaged', src: 'img/analytics-engaged.png' }],
        shots: [
            { t: hosts.s08.start, to: f(card, { fill: 0.9, max: 2.1 }) },
            { t: cue('s08', 'named') + 0.5, to: f(topRows, { fill: 0.8, max: 2.6 }) },
            { t: cue('s08', 'followup') - 0.2, to: f(card, { fill: 0.9, max: 2.1 }) },
        ],
        rings: [['names', topRows, cue('s08', 'named') + 1.0, cue('s08', 'followup') - 0.1]],
        labels: [
            ['Most Engaged Constituents', cue('s08', 'named') + 0.4, cue('s08', 'followup') - 0.1],
            ['Who to thank next', cue('s08', 'followup') + 0.2, end('s08') - 0.4],
        ],
    });
}

fs.writeFileSync(path.join(ASSETS, 'timeline.js'),
    '// Generated by video/tools/build-compositions.mjs. Do not edit.\n'
    + `window.SR_TIMELINE = ${JSON.stringify({ duration: DURATION, estimated: timeline.estimated, hosts, scenes: S })};\n`
    + `window.SR_UI = ${JSON.stringify(Object.fromEntries(Object.entries(UI).map(([k, v]) => [k, { ...v, extraCss: undefined, extraHtml: undefined, extraJs: undefined }])))};\n`);

// ---------------------------------------------------------------------------
// 4. UI scene compositions
// ---------------------------------------------------------------------------
function uiComposition(id, P) {
    const layers = P.layers.map((l, i) =>
        `<img class="ui-layer" id="${id}-layer-${l.name}" src="assets/${l.src}" alt="" style="width: ${P.page.w}px; height: ${P.page.h}px;${i ? ' opacity: 0; visibility: hidden;' : ''}" />`).join('\n              ');
    const rings = P.rings.map((r) =>
        `<div class="ui-ring" id="${r.id}" style="left: ${r.rect.x}px; top: ${r.rect.y}px; width: ${r.rect.w}px; height: ${r.rect.h}px;"></div>`).join('\n              ');
    const labels = P.labels.map((l) => `<div class="ui-label" id="${l.id}">${esc(l.text)}</div>`).join('\n        ');
    return `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Generated by video/tools/build-compositions.mjs from the captured screens. Do not edit. -->
    <template id="${id}-template">
      <style>
        #${id}-root { position: absolute; inset: 0; overflow: hidden; }
        #${id}-root .ui-window {
          position: absolute; left: ${WIN.left}px; top: ${WIN.top}px; width: ${WIN.width}px; height: ${WIN.height}px;
          border-radius: 22px; overflow: hidden; background: #16181d; opacity: 0; visibility: hidden;
          box-shadow: 0 50px 120px rgba(0, 0, 0, 0.6), 0 0 0 1.5px rgba(255, 255, 255, 0.08);
        }
        #${id}-root .ui-bar {
          position: absolute; left: 0; top: 0; width: ${WIN.width}px; height: ${WIN.bar}px; box-sizing: border-box;
          display: flex; align-items: center; padding: 0 22px; background: #2b2b33; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        #${id}-root .ui-dots { display: flex; gap: 9px; width: 180px; }
        #${id}-root .ui-dots i { display: block; width: 13px; height: 13px; border-radius: 50%; background: rgba(255, 255, 255, 0.16); }
        #${id}-root .ui-url {
          margin: 0 auto; font: 400 19px/1 "Poppins", sans-serif; color: rgba(255, 255, 255, 0.66);
          background: rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 9px 22px; position: relative; left: -90px;
        }
        #${id}-root .ui-viewport { position: absolute; left: 0; top: ${WIN.bar}px; width: ${VW}px; height: ${VH}px; overflow: hidden; background: #16181d; }
        #${id}-page { position: absolute; left: 0; top: 0; width: ${P.page.w}px; height: ${P.page.h}px; transform-origin: 0 0; }
        #${id}-root .ui-layer { position: absolute; left: 0; top: 0; display: block; }
        /* Above the captured screen, so a highlight is never painted behind what it outlines. */
        #${id}-root .ui-ring {
          position: absolute; z-index: 1000; box-sizing: border-box; border: 3px solid #c79bf2; border-radius: 12px; pointer-events: none;
          box-shadow: 0 0 0 6px rgba(199, 155, 242, 0.16), 0 0 38px rgba(199, 155, 242, 0.4); opacity: 0; visibility: hidden;
        }
        #${id}-root .ui-label {
          position: absolute; left: 150px; top: 872px; white-space: nowrap; opacity: 0; visibility: hidden;
          font: 600 38px/1 "Poppins", sans-serif; color: #ffffff; background: rgba(17, 14, 23, 0.9);
          border-left: 6px solid #c79bf2; border-radius: 18px; padding: 20px 30px 20px 26px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
        }${P.extraCss}
      </style>

      <div id="${id}-root" data-composition-id="${id}" data-width="1920" data-height="1080">
        <div class="ui-window" id="${id}-window">
          <div class="ui-bar">
            <span class="ui-dots"><i></i><i></i><i></i></span>
            <span class="ui-url">${esc(P.url)}</span>
          </div>
          <div class="ui-viewport">
            <div id="${id}-page">
              ${layers}
              ${rings}
            </div>
          </div>
        </div>
        ${P.extraHtml}
        ${labels}
      </div>

      <script src="assets/gsap.min.js"></script>
      <script>
  (function () {
    var P = window.SR_UI['${id}'];
    var L = function (t) { return Math.max(0, t - P.start); };
    gsap.config({ force3D: false }); // re-rasterize at every zoom level so captured text stays crisp
    var tl = gsap.timeline({ paused: true });

    // Window in and out.
    tl.fromTo('#${id}-window', { autoAlpha: 0, scale: 0.92, y: 50 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'power3.out' }, P.enter);
    tl.to('#${id}-window', { autoAlpha: 0, scale: 0.97, duration: 0.45, ease: 'power2.in' }, P.duration - 0.5);

    // Camera: pre-computed transforms of the captured page.
    var first = P.shots[0].to;
    tl.set('#${id}-page', { x: first.x, y: first.y, scale: first.scale }, 0);
    P.shots.slice(1).forEach(function (s) {
      tl.to('#${id}-page', { x: s.to.x, y: s.to.y, scale: s.to.scale, duration: s.dur, ease: 'power2.inOut' }, L(s.t));
    });

    // Later captures cross-fade in over earlier ones (a menu opening, a field filled in).
    P.layers.forEach(function (l, i) {
      if (!i) return;
      tl.to('#${id}-layer-' + l.name, { autoAlpha: 1, duration: 0.45, ease: 'power1.inOut' }, L(l.on));
      if (l.off !== null) tl.to('#${id}-layer-' + l.name, { autoAlpha: 0, duration: 0.4, ease: 'power1.inOut' }, L(l.off));
    });

    // Rings ride the camera; labels sit on the stage.
    P.rings.forEach(function (r) {
      tl.fromTo('#' + r.id, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, L(r.on));
      tl.to('#' + r.id, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, Math.max(L(r.on) + 0.4, L(r.off)));
    });
    P.labels.forEach(function (l) {
      tl.fromTo('#' + l.id, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, L(l.on));
      tl.to('#' + l.id, { autoAlpha: 0, y: -10, duration: 0.25, ease: 'power1.in' }, Math.max(L(l.on) + 0.45, L(l.off) - 0.25));
    });
${P.extraJs}

    window.__timelines['${id}'] = tl;
  })();
      </script>
    </template>
  </body>
</html>
`;
}

fs.mkdirSync(path.join(VIDEO, 'compositions'), { recursive: true });
for (const [id, P] of Object.entries(UI)) {
    fs.writeFileSync(path.join(VIDEO, 'compositions', `${id}.html`), uiComposition(id, P));
}

// ---------------------------------------------------------------------------
// 5. Root composition
// ---------------------------------------------------------------------------
for (const id of Object.keys(hosts)) {
    if (!fs.existsSync(path.join(VIDEO, 'compositions', `${id}.html`))) throw new Error(`compositions/${id}.html is missing`);
}
const host = (id, track) => `  <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${hosts[id].start}" data-duration="${hosts[id].duration}" data-track-index="${track}" data-width="1920" data-height="1080"></div>`;
// Explicit lengths keep the clips' windows from reading as overlapping. Every clip joins
// the "voiceover" bus, which carries one voice chain for all of them.
const narration = timeline.scenes.filter((s) => s.audio).map((s) =>
    `  <audio id="vo-${s.id}" src="${s.audio}" data-start="${s.voStart}" data-duration="${round(s.voLength + 0.05, 3)}" data-track-index="20" data-audio-group="voiceover" data-volume="1"></audio>`);
const { VOICE_CHAIN } = await import('./voice-chain.mjs');
const chainAttr = (value) => JSON.stringify(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
if (narration.length) {
    narration.unshift(`  <hf-audio-group id="voiceover" data-label="Voiceover" data-volume="1" data-fx-chain="${chainAttr(VOICE_CHAIN)}"></hf-audio-group>`);
}
const music = fs.existsSync(path.join(VIDEO, 'audio', 'music.mp3'))
    ? [`  <audio id="music-bed" src="audio/music.mp3" data-start="0" data-duration="${DURATION}" data-track-index="21" data-volume="0.16"></audio>`]
    : [];

const indexHtml = `<!doctype html>
<!-- Generated by video/tools/build-compositions.mjs. Do not edit; change the script, scenes, or captures instead. -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <title>Automated donor journeys walkthrough</title>
  <link rel="stylesheet" href="assets/stage.css" />
  <script src="assets/gsap.min.js"></script>
  <script src="assets/timeline.js"></script>
</head>
<body>
<div id="root-stage" data-composition-id="root" data-width="1920" data-height="1080" data-start="0" data-duration="${DURATION}">
  <div id="stage-bg" class="clip stage-bg" data-start="0" data-duration="${DURATION}" data-track-index="0"></div>
${Object.keys(hosts).map((id, i) => host(id, i + 1)).join('\n')}
${[...narration, ...music].join('\n')}
  <script>
    window.__timelines["root"] = gsap.timeline({ paused: true });
  </script>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(VIDEO, 'index.html'), indexHtml);

const count = (k) => Object.values(UI).reduce((n, p) => n + p[k].length, 0);
console.log(`${timeline.estimated ? 'ESTIMATED timing. ' : ''}${DURATION}s, ${Object.keys(hosts).length} scenes (${Object.keys(UI).length} UI), ${count('shots')} camera shots, ${count('rings')} rings, ${count('labels')} labels, ${narration.length ? narration.length - 1 : 0} narration clips${music.length ? ', music' : ''}`);
