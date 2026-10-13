// Assemble the HyperFrames project from the timeline, the replica, and measurements.
//
//   node video/tools/build-compositions.mjs
//
// Writes, under tools/connections-and-sync/video/:
//   assets/      fonts, GSAP, logos, and replica.css (paths rewritten)
//   assets/timeline.js   window.SR_TIMELINE (scene windows, cues, words) and
//                        window.SR_UI (camera shots, rings, labels, state fades)
//   index.html   the root composition: backdrop, scene hosts, narration audio
//   compositions/ui.html the real Connections page under a GSAP camera, with the
//                        product's own dialogs rising over it
//
// The page has two states (as it opens, and with the ⋯ menu open), stacked and
// cross-faded: swapping innerHTML would not survive HyperFrames seeking; opacity
// does. Every rect the camera needs comes from targets.json.
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
// Vendor logos the replica carries.
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

// The close is two beats over one narration take: the other systems, then the card.
const hosts = {
    s01: { start: S.s01.start, end: cue('s02', 'rows') + 0.1 },
    ui: { start: cue('s02', 'rows') - 0.1, end: end('s08') },
    setup: { start: S.s09.start - 0.2, end: cue('s09', 'cta') - 0.2 },
    s10: { start: cue('s09', 'cta') - 0.45, end: DURATION },
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
const A = targets.base;
const M = targets.menu;
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

/*
    The row's own detail is 11px chips, so the camera reads it in two halves: the
    left (who comes across, when it ran, what went back) and the right (the buttons).
    Whole-row framing is only for the beats about the row as a whole.
*/
const chipsRE = union(A.scopeRE, A.sentRE);
const chipsBoth = union(A.scopeRE, A.sentSF, A.scopeSF);
const buttonsRE = union(A.syncNowRE, A.menuRE);
const top = frame({ x: 0, y: 0, w: PAGE_W, h: VH / BASE }, { fill: 1 });
const shots = [
    { t: hosts.ui.start, to: top },
    { t: cue('s02', 'rows') + 0.6, to: frame({ x: A.rows.x, y: A.rows.y, w: 720, h: A.rows.h }, { fill: 0.92, max: 2.4 }) },
    { t: cue('s02', 'scope') - 0.3, to: frame(chipsBoth, { fill: 0.9, max: 2.4, pad: 16 }) },
    // Connecting: the rows as a whole while the sign-in is described, before the pickers rise.
    { t: cue('s03', 'connect') - 0.2, to: frame({ x: A.catalog.x, y: A.catalog.y - 50, w: A.catalog.w, h: 340 }, { fill: 0.95, max: 1.8 }) },
    // Auto-sync lives in the ⋯ menu.
    { t: cue('s04', 'menu') - 0.4, to: frame(union(A.sendRE, M.menuList), { fill: 0.8, max: 2.5, pad: 20 }) },
    { t: cue('s04', 'changes') - 0.3, to: frame(chipsBoth, { fill: 0.9, max: 2.4, pad: 16 }) },
    { t: cue('s04', 'syncnow') - 0.3, to: frame(buttonsRE, { fill: 0.8, max: 2.6, pad: 18 }) },
    { t: cue('s05', 'gifts') - 0.3, to: frame(chipsBoth, { fill: 0.9, max: 2.4, pad: 16 }) },
    { t: cue('s06', 'sendback') - 0.3, to: frame(union(A.sentRE, A.sentSF), { fill: 0.6, max: 2.6, pad: 24 }) },
    { t: cue('s06', 'sendre') - 0.3, to: frame(buttonsRE, { fill: 0.8, max: 2.6, pad: 18 }) },
].map((s) => ({ ...s, t: round(s.t, 3), dur: 1 }));
for (let i = 0; i < shots.length - 1; i++) {
    const gap = shots[i + 1].t - shots[i].t;
    if (gap < 0.25) throw new Error(`camera shots ${i} and ${i + 1} are ${gap.toFixed(2)}s apart; retime the cues`);
    shots[i].dur = round(Math.min(1, gap - 0.05), 3);
}

// The page as it opens, then with the Raiser's Edge ⋯ menu open, then as it opens again.
const states = [
    { id: 'ui-state-base', on: hosts.ui.start - 0.2, off: cue('s04', 'menu') + 0.2 },
    { id: 'ui-state-menu', on: cue('s04', 'menu') + 0.2, off: cue('s04', 'changes') - 0.2, fade: 0.25 },
    { id: 'ui-state-base-2', on: cue('s04', 'changes') - 0.2, off: hosts.ui.end, fade: 0.25 },
].map((s) => ({ ...s, on: round(Math.max(hosts.ui.start - 0.2, s.on), 3), off: round(s.off, 3) }));
states.forEach((s, i) => {
    const next = states[i + 1];
    if (next && next.on <= s.off + 0.001) s.hiddenAt = round(next.on + (next.fade || 0.4), 3);
});

/*
    The product's own dialogs rise over the window, above the camera so they stay
    sharp. Each one is a layer; `scale` sizes it to the window (the Salesforce picker
    is tall, the list picker is short).
*/
const dialogs = [
    { key: 'bb-list', on: cue('s03', 'picker') - 0.2, off: cue('s03', 'sfpicker') - 0.25, scale: 1.8 },
    { key: 'sf-scope', on: cue('s03', 'sfpicker') - 0.2, off: end('s03') - 0.2, scale: 1.7 },
    { key: 'wb-blackbaud-sent', on: cue('s06', 'sendre') + 1.1, off: S.s08.start + 0.1, scale: 1.65 },
    { key: 'wb-salesforce', on: S.s08.start, off: end('s08') - 0.15, scale: 1.75 },
].map((d) => ({ ...d, id: `ui-dlg-${d.key}`, on: round(d.on, 3), off: round(d.off, 3) }));

/*
    Rings inside a dialog are children of the thing they point at (or of a wrapper
    around a label and its control), so they need no measuring and move with the modal.
*/
const dialogRings = [
    { dialog: 'bb-list', id: 'dr-bb-list', find: { sel: '[data-bb="lists"] ul li:first-child label' }, on: cue('s03', 'picker') + 0.5, off: cue('s03', 'sfpicker') - 0.4 },
    { dialog: 'sf-scope', id: 'dr-sf-views', find: { sel: '[data-sf="listviews"] ul' }, on: cue('s03', 'sfpicker') + 0.5, off: cue('s03', 'fields') - 0.1 },
    { dialog: 'sf-scope', id: 'dr-sf-fields', find: { sel: '[data-sf="fields"]' }, on: cue('s03', 'fields'), off: end('s03') - 0.4 },
    { dialog: 'wb-blackbaud-sent', id: 'dr-re-target', find: { field: 'Where to write it' }, on: cue('s06', 'sendre') + 1.6, off: cue('s07', 'one') + 0.2 },
    { dialog: 'wb-blackbaud-sent', id: 'dr-re-result', find: { sel: '.modal-box > div[style*="29, 165, 147"], .modal-box > div[style*="29,165,147"]' }, on: cue('s07', 'one') + 0.3, off: cue('s07', 'fundraiser') - 0.1 },
    { dialog: 'wb-blackbaud-sent', id: 'dr-re-fundraiser', find: { label: /Assign the action/ }, on: cue('s07', 'fundraiser'), off: cue('s07', 'threshold') - 0.1 },
    { dialog: 'wb-blackbaud-sent', id: 'dr-re-threshold', find: { field: 'Minimum engagement to send' }, on: cue('s07', 'threshold'), off: end('s07') - 0.3 },
    { dialog: 'wb-salesforce', id: 'dr-sf-target', find: { field: 'Where to write it' }, on: cue('s08', 'sf') + 0.4, off: cue('s08', 'owner') - 0.1 },
    { dialog: 'wb-salesforce', id: 'dr-sf-owner', find: { label: /Assign the task/ }, on: cue('s08', 'owner'), off: cue('s08', 'schedule') - 0.1 },
    { dialog: 'wb-salesforce', id: 'dr-sf-schedule', find: { p: /Once saved/ }, on: cue('s08', 'schedule'), off: end('s08') - 0.4 },
].map((r) => ({ ...r, on: round(r.on, 3), off: round(r.off, 3) }));

const RING_PAD = 6;
const ring = (id, rect, on, off) => ({ id, on: round(on, 3), off: round(off, 3), rect: { x: rect.x - RING_PAD, y: rect.y - RING_PAD, w: rect.w + RING_PAD * 2, h: rect.h + RING_PAD * 2 } });
// One ring per claim: every sentence that names something on the page points at it.
const rings = [
    ring('ring-live-re', A.liveRE, cue('s02', 'live'), cue('s02', 'scope') - 0.4),
    ring('ring-live-sf', A.liveSF, cue('s02', 'live') + 0.1, cue('s02', 'scope') - 0.4),
    ring('ring-scope-re', A.scopeRE, cue('s02', 'scope') + 0.2, cue('s02', 'synced') - 0.1),
    ring('ring-scope-sf', A.scopeSF, cue('s02', 'scope') + 0.3, cue('s02', 'synced') - 0.1),
    ring('ring-synced-re', union(A.syncedRE, A.cadenceRE), cue('s02', 'synced'), cue('s02', 'sent') - 0.1),
    ring('ring-synced-sf', union(A.syncedSF, A.cadenceSF), cue('s02', 'synced') + 0.1, cue('s02', 'sent') - 0.1),
    ring('ring-sent-re', A.sentRE, cue('s02', 'sent'), end('s02') - 0.2),
    ring('ring-sent-sf', A.sentSF, cue('s02', 'sent') + 0.1, end('s02') - 0.2),
    ring('ring-menu-auto', union(M.autoSync, M.frequency), cue('s04', 'menu') + 0.6, cue('s04', 'changes') - 0.3),
    ring('ring-cadence-re', union(A.syncedRE, A.cadenceRE), cue('s04', 'changes') + 0.6, cue('s04', 'syncnow') - 0.4),
    ring('ring-cadence-sf', union(A.syncedSF, A.cadenceSF), cue('s04', 'changes') + 0.7, cue('s04', 'syncnow') - 0.4),
    ring('ring-syncnow', A.syncNowRE, cue('s04', 'syncnow'), end('s04') - 0.2),
    ring('ring-adddata', A.addDataRE, cue('s05', 'adddata'), cue('s05', 'gifts') - 0.35),
    ring('ring-gifts', A.giftsRE, cue('s05', 'gifts') + 0.5, end('s05') - 0.3),
    ring('ring-opps', A.oppsSF, cue('s05', 'gifts') + 1.6, end('s05') - 0.3),
    ring('ring-wb-re', A.sentRE, cue('s06', 'sendback') + 0.4, cue('s06', 'sendre') - 0.4),
    ring('ring-wb-sf', A.sentSF, cue('s06', 'sendback') + 0.5, cue('s06', 'sendre') - 0.4),
    ring('ring-send-re', A.sendRE, cue('s06', 'sendre'), cue('s06', 'sendre') + 1.2),
];

// A label says something the frame does not.
const labelCues = [
    ['One row per system', cue('s02', 'rows') + 0.4],
    ['Sign in. Approve access.', cue('s03', 'signin')],
    ['Choose who comes across', cue('s03', 'picker')],
    ['Extra fields become merge tags', cue('s03', 'fields')],
    ['Daily, or every Monday', cue('s04', 'frequency')],
    ['Your CRM changes, your reports follow', cue('s04', 'changes') + 0.4],
    ['Gifts and Opportunities too', cue('s05', 'gifts')],
    ['Opens · minutes read · link clicks', cue('s06', 'engagement')],
];
const LABEL_MAX = 4.5;
const labels = labelCues.map(([text, on], i) => {
    const next = i < labelCues.length - 1 ? labelCues[i + 1][1] - 0.05 : end('s06') - 0.3;
    return { id: `label-${i}`, text, on: round(on, 3), off: round(Math.min(next, on + LABEL_MAX), 3) };
});

const counts = [
    { scope: 'ui-state-base', sel: '[data-sr-vendor] b', at: hosts.ui.start + 0.5, dur: 1.0, stagger: 0.1 },
].map((c) => ({ ...c, at: round(c.at, 3) }));

const ui = {
    start: hosts.ui.start,
    duration: hosts.ui.duration,
    shots, rings, labels, states, dialogs: dialogs.map(({ id, on, off }) => ({ id, on, off })), dialogRings: dialogRings.map(({ id, on, off }) => ({ id, on, off })), counts,
};

const setup = {
    start: hosts.setup.start,
    duration: hosts.setup.duration,
    kicker: 'Every system, the same way',
    stepAt: [cue('s09', 'others') + 1.3, cue('s09', 'others') + 1.8, cue('s09', 'others') + 2.3].map((t) => round(t, 3)),
    steps: ['Connect', 'Choose who syncs', 'Auto-sync daily or weekly'],
    logos: ['renxt', 'salesforce', 'bloomerang', 'virtuous', 'donorperfect', 'lgl', 'neon', 'slate', 'ellucian']
        .map((slug) => `assets/logo-${slug}.png`),
};
const outroHost = { start: hosts.s10.start, duration: hosts.s10.duration };
fs.writeFileSync(path.join(ASSETS, 'timeline.js'),
    '// Generated by video/tools/build-compositions.mjs. Do not edit.\n'
    + `window.SR_TIMELINE = ${JSON.stringify({ duration: DURATION, estimated: timeline.estimated, hosts, scenes: S })};\n`
    + `window.SR_UI = ${JSON.stringify(ui)};\n`
    + `window.SR_SETUP = ${JSON.stringify({ setup, outro: outroHost, steps: setup.steps, logos: setup.logos })};\n`);

// ---------------------------------------------------------------------------
// 4. The UI composition: the page per state, stacked, and the dialogs over it
// ---------------------------------------------------------------------------
const demoHtml = fs.readFileSync(path.join(SITE_DIR, 'demo', 'index.html'), 'utf8');
const startAt = demoHtml.indexOf('<div id="dashboard"');
const endAt = demoHtml.indexOf('<template data-');
if (startAt === -1 || endAt === -1) throw new Error('Could not find the dashboard markup in demo/index.html');
const templatesHtml = demoHtml.slice(endAt, demoHtml.indexOf('<div id="replica-toast"'));

const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const page = await browser.newPage();
await page.setViewportSize({ width: 1920, height: 1080 });
await page.setContent(`<!doctype html><html class="dashboard" data-theme="dark"><body>${demoHtml.slice(startAt, endAt)}${templatesHtml}</body></html>`);
await page.addStyleTag({ path: path.join(SITE_DIR, 'demo', 'replica.css') });
const built = await page.evaluate(({ wantStates, wantDialogs, dialogRings }) => {
    const root = document.querySelector('#dashboard');
    const fail = (m) => { throw new Error(m); };
    const tpl = (sel) => document.querySelector(sel) || fail(`template ${sel}`);
    root.querySelectorAll('[data-inert]').forEach((el) => el.removeAttribute('data-inert'));

    const out = {};
    for (const [id, menu] of wantStates) {
        const clone = root.cloneNode(true);
        if (menu) (clone.querySelector(`[data-sr-menu="${menu}"]`) || fail('menu')).classList.add('dropdown-open');
        // The state id goes on a wrapper: the product's CSS is scoped to #dashboard.
        const wrap = document.createElement('div');
        wrap.id = id;
        wrap.className = 'ui-state';
        wrap.appendChild(clone);
        out[id] = wrap.outerHTML;
    }

    const dlg = {};
    for (const key of wantDialogs) {
        const holder = document.createElement('div');
        holder.innerHTML = tpl(`template[data-dialog="${key}"]`).innerHTML;
        for (const r of dialogRings.filter((d) => d.dialog === key)) {
            const f = r.find;
            let host = null;
            if (f.sel) host = holder.querySelector(f.sel);
            else if (f.label) host = Array.from(holder.querySelectorAll('label')).find((l) => new RegExp(f.label).test(l.textContent));
            else if (f.p) host = Array.from(holder.querySelectorAll('p')).find((l) => new RegExp(f.p).test(l.textContent));
            else if (f.field) {
                // A field is its label plus the control after it: wrap the pair.
                const label = Array.from(holder.querySelectorAll('label')).find((l) => l.textContent.trim() === f.field);
                if (label && label.nextElementSibling) {
                    const control = label.nextElementSibling;
                    host = document.createElement('div');
                    host.className = 'ui-ringwrap';
                    label.parentNode.insertBefore(host, label);
                    host.appendChild(label);
                    host.appendChild(control);
                }
            }
            if (!host) fail(`dialog ring ${r.id}: nothing matched in ${key}`);
            host.classList.add('ui-ringhost');
            const i = document.createElement('i');
            i.className = 'ui-dlg-ring';
            i.id = r.id;
            host.appendChild(i);
        }
        dlg[key] = holder.innerHTML;
    }

    /*
        Where each ringed thing sits inside its dialog, unscaled, so the timeline can
        pan a tall dialog to whatever the narration is naming. Measured on a copy laid
        out under the product's CSS, at the modal's own width.
    */
    const geo = {};
    for (const key of wantDialogs) {
        const probe = document.createElement('div');
        probe.id = 'dashboard';
        probe.style.cssText = 'position:absolute;left:0;top:0;width:1920px;';
        probe.innerHTML = dlg[key];
        document.body.appendChild(probe);
        const box = probe.querySelector('.modal-box');
        box.style.cssText += ';transform:none!important;max-height:none!important;overflow:visible!important;';
        const modal = probe.querySelector('.modal');
        modal.style.cssText += ';position:static!important;opacity:1!important;visibility:visible!important;';
        const b = box.getBoundingClientRect();
        const rings = {};
        probe.querySelectorAll('.ui-dlg-ring').forEach((i) => {
            const r = i.parentElement.getBoundingClientRect();
            rings[i.id] = Math.round(r.top + r.height / 2 - b.top);
        });
        geo[key] = { h: Math.round(b.height), rings };
        probe.remove();
    }
    return { states: out, dialogs: dlg, geo };
}, {
    wantStates: [['ui-state-base', null], ['ui-state-menu', 'blackbaud'], ['ui-state-base-2', null]],
    wantDialogs: dialogs.map((d) => d.key),
    dialogRings: dialogRings.map((r) => ({ ...r, find: Object.fromEntries(Object.entries(r.find).map(([k, v]) => [k, v instanceof RegExp ? v.source : v])) })),
});
await browser.close();

/*
    Pans: a dialog drawn large enough to read is taller than the window, so it slides
    to keep whichever field is being named in the middle, clamped so it never shows
    more empty space than it has to.
*/
const DLG_VIEW = WIN.height - 60;
const dialogPans = [];
for (const d of dialogs) {
    const g = built.geo[d.key];
    const travel = Math.max(0, (g.h * d.scale - DLG_VIEW) / 2);
    const yFor = (centre) => round(clamp((g.h / 2 - centre) * d.scale, -travel, travel));
    const mine = dialogRings.filter((r) => r.dialog === d.key);
    const first = mine.length ? yFor(g.rings[mine[0].id]) : 0;
    dialogPans.push({ id: d.id, t: d.on, y: first, set: true, scale: d.scale });
    mine.slice(1).forEach((r) => dialogPans.push({ id: d.id, t: round(r.on - 0.35, 3), y: yFor(g.rings[r.id]) }));
}
ui.dialogPans = dialogPans;
fs.writeFileSync(path.join(ASSETS, 'timeline.js'),
    fs.readFileSync(path.join(ASSETS, 'timeline.js'), 'utf8').replace(/window\.SR_UI = .*;\n/, `window.SR_UI = ${JSON.stringify(ui)};\n`));

// The replica's logo paths are relative to demo/; in the video they live under assets/.
const reAsset = (html) => html.replace(/(<img[^>]+src=")img\//g, '$1assets/img/');
built.states = Object.fromEntries(Object.entries(built.states).map(([k, v]) => [k, reAsset(v)]));

const ringHtml = rings.map((r) => `<div class="ui-ring" id="${r.id}" style="left:${r.rect.x}px;top:${r.rect.y}px;width:${r.rect.w}px;height:${r.rect.h}px"></div>`).join('\n          ');
const labelHtml = labels.map((l) => `<div class="ui-label${l.top ? ' is-top' : ''}" id="${l.id}">${l.text.replace(/&/g, '&amp;')}</div>`).join('\n        ');
const stateHtml = Object.values(built.states).join('\n          ');
const dialogHtml = dialogs.map((d) => `<div class="ui-dlg" id="${d.id}" style="--dlg-scale:${d.scale}"><div class="ui-scope" id="dashboard">${built.dialogs[d.key]}</div></div>`).join('\n        ');

const uiHtml = `<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <!-- Generated by video/tools/build-compositions.mjs from connections-and-sync/demo/index.html. Do not edit. -->
    <template id="ui-template">
      <style>
        #root { position: absolute; inset: 0; overflow: hidden; }
        /* The product's CSS animations run on wall-clock time, not the video's, so they
           would render differently on every seek. GSAP owns all motion. */
        #ui-page *, #ui-page *::before, #ui-page *::after,
        .ui-dlg *, .ui-dlg *::before, .ui-dlg *::after { animation: none !important; transition: none !important; }
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
        .ui-state { position: absolute; left: 0; top: 0; width: ${PAGE_W}px; opacity: 0; }
        /* The menu is daisyUI's focus dropdown; the replica opens it with a class. */
        .ui-state .dropdown-open .dropdown-content { visibility: visible !important; opacity: 1 !important; transform: none !important; }
        .ui-ring {
          position: absolute; z-index: 1000; box-sizing: border-box; border: 3px solid #c79bf2; border-radius: 12px; pointer-events: none;
          box-shadow: 0 0 0 5px rgba(199, 155, 242, 0.16), 0 0 30px rgba(199, 155, 242, 0.4); opacity: 0; visibility: hidden;
        }
        .ui-label {
          position: absolute; left: 150px; top: 872px; white-space: nowrap; opacity: 0; visibility: hidden; z-index: 950;
          font: 600 38px/1 "Poppins", sans-serif; color: #ffffff; background: rgba(17, 14, 23, 0.9);
          border-left: 6px solid #c79bf2; border-radius: 18px; padding: 20px 30px 20px 26px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
        }
        .ui-label.is-top { top: 112px; }
        /* Dialogs sit over the window, not inside the camera, so they stay legible. */
        .ui-dlg {
          position: absolute; left: ${WIN.left}px; top: ${WIN.top}px; width: ${WIN.width}px; height: ${WIN.height}px;
          border-radius: 22px; overflow: hidden; opacity: 0; visibility: hidden; z-index: 900;
        }
        /* The modal rules are scoped to #dashboard, so the wrapper carries that id
           and lays itself out flat. */
        .ui-dlg .ui-scope { display: contents; }
        .ui-dlg .modal-toggle { display: none; }
        .ui-dlg .modal {
          position: absolute !important; inset: 0; display: flex !important; align-items: center; justify-content: center;
          opacity: 1 !important; visibility: visible !important; pointer-events: none; background: rgba(8, 12, 16, 0.72) !important;
        }
        .ui-dlg .modal-box { transform-origin: center; max-height: none !important; overflow: visible !important; }
        .ui-ringhost { position: relative; }
        .ui-ringwrap { position: relative; display: block; }
        .ui-dlg-ring {
          position: absolute; inset: -6px; border: 3px solid #c79bf2; border-radius: 12px; z-index: 5;
          box-shadow: 0 0 22px rgba(199, 155, 242, 0.45); opacity: 0; pointer-events: none;
        }
      </style>

      <div id="root" data-composition-id="ui" data-width="1920" data-height="1080">
        <div class="ui-window" id="ui-window">
          <div class="ui-bar">
            <span class="ui-dots"><i></i><i></i><i></i></span>
            <span class="ui-url">app.storyraise.com/#/${config.identity.org_slug}/connections</span>
          </div>
          <div class="ui-viewport">
            <div id="ui-page">
          ${stateHtml}
          ${ringHtml}
            </div>
          </div>
        </div>
        ${dialogHtml}
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
  <title>Storyraise Connections and sync tour</title>
  <link rel="stylesheet" href="assets/replica.css" />
  <link rel="stylesheet" href="assets/stage.css" />
  <script src="assets/gsap.min.js"></script>
  <script src="assets/timeline.js"></script>
</head>
<body>
<div id="root-stage" data-composition-id="root" data-width="1920" data-height="1080" data-start="0" data-duration="${DURATION}">
  <div id="stage-bg" class="clip stage-bg" data-start="0" data-duration="${DURATION}" data-track-index="0"></div>
${['s01', 'ui', 'setup', 's10'].map((id, i) => host(id, i + 1)).join('\n')}
${[...narration, ...music].join('\n')}
  <script>
    window.__timelines["root"] = gsap.timeline({ paused: true });
  </script>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(VIDEO, 'index.html'), indexHtml);

console.log(`${timeline.estimated ? 'ESTIMATED timing. ' : ''}${DURATION}s, ${shots.length} shots, ${rings.length} rings, ${dialogs.length} dialogs, ${dialogRings.length} dialog rings, ${labels.length} labels, ${states.length} state fades, ${narration.length} narration clips${music.length ? ', music' : ''}`);
