// Turn the capture into the static, read-only demo page.
//
//   node replica/build-replica.mjs
//
// Reads .cache/replica/capture.json and writes donor-signals/demo/. The DOM is
// transformed inside a headless page: the tile buttons and the view switcher get
// data-* hooks for replica.js, anything that would write is made inert, and each
// tour stop gets a stable data-tour anchor. Every tile x view state and every
// dialog rides along as a <template> so the demo can be clicked without Vue.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PurgeCSS } from 'purgecss';
import { config, SITE_DIR, TOOLS_DIR, readJson } from '../scripts/lib/identity.mjs';

const CACHE = path.join(TOOLS_DIR, '.cache');
const DEMO = path.join(SITE_DIR, 'demo');
const BUILDER_PUBLIC = path.join(config.builder.path, 'public');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const capture = readJson(path.join(CACHE, 'replica', 'capture.json'));
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);

fs.mkdirSync(path.join(DEMO, 'fonts'), { recursive: true });
fs.mkdirSync(path.join(DEMO, 'img'), { recursive: true });

// ---------------------------------------------------------------------------
// 1. Template covers: the action cards point at Firebase Storage. Pull them
//    local so the demo makes no third-party requests.
// ---------------------------------------------------------------------------
/*
    Every cover across every captured fragment, not only the ones in the live DOM:
    each group draws from its own template shelf, so the At risk state references
    covers the New gifts state never shows. Missing them left the built page making
    live requests to Firebase Storage.
*/
const allHtml = [capture.dashboardHtml, ...Object.values(capture.states), ...Object.values(capture.dialogs).filter(Boolean)].join('');
const coverUrls = new Set([
    ...capture.covers,
    ...[...allHtml.matchAll(/https:\/\/firebasestorage\.googleapis\.com\/[^"'\s>]+/g)].map((m) => m[0].replace(/&amp;/g, '&')),
]);
const coverMap = {};
for (const url of coverUrls) {
    const name = `cover-${hash(url)}.jpg`;
    const dest = path.join(DEMO, 'img', name);
    if (!fs.existsSync(dest)) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`cover ${resp.status}: ${url.slice(0, 80)}`);
        fs.writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
    }
    coverMap[url] = `img/${name}`;
}
console.log(`covers: ${Object.keys(coverMap).length} local`);

const localiseCovers = (html) =>
    Object.entries(coverMap).reduce(
        (s, [remote, local]) => s.split(remote).join(local).split(remote.replace(/&/g, '&amp;')).join(local),
        html);

// ---------------------------------------------------------------------------
// 2. Transform the captured DOM.
// ---------------------------------------------------------------------------
const stateTemplates = Object.entries(capture.states)
    .map(([key, html]) => `<template data-state="${key}">${localiseCovers(html)}</template>`).join('\n');
const dialogTemplates = Object.entries(capture.dialogs).filter(([, v]) => v)
    .map(([key, html]) => `<template data-dialog="${key}">${localiseCovers(html)}</template>`).join('\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body>${localiseCovers(capture.dashboardHtml)}${stateTemplates}${dialogTemplates}</body></html>`);

const transformed = await page.evaluate(() => {
    const root = document.querySelector('#dashboard');
    const stateTpls = Array.from(document.querySelectorAll('template[data-state]'));
    const dialogTpls = Array.from(document.querySelectorAll('template[data-dialog]'));
    const scopes = [root, ...stateTpls.map((t) => t.content), ...dialogTpls.map((t) => t.content)];
    const fail = (m) => { throw new Error(m); };
    const one = (scope, sel, label) => scope.querySelector(sel) || fail(`missing: ${label || sel}`);

    // No sidebar in the replica.
    one(root, '[data-dashboard-main]').classList.remove('md:pl-64');

    const TILES = ['new_gifts', 'upgrade', 'warming', 'engaged', 'at_risk', 'stable'];
    scopes.forEach((scope) => {
        // Tiles, in DOM order, carry their key so a click can swap state.
        const tiles = scope.querySelectorAll('.sig-kpis-filter .sig-kpi-btn');
        tiles.forEach((btn, i) => {
            if (!TILES[i]) return;
            btn.setAttribute('data-tile', TILES[i]);
            btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        });
        // Overview / Table.
        const views = scope.querySelectorAll('.sig-view button');
        if (views[0]) views[0].setAttribute('data-view', 'feed');
        if (views[1]) views[1].setAttribute('data-view', 'table');
        // The two action cards open the dialog they belong to.
        const cards = scope.querySelectorAll('.sig-do-card');
        cards.forEach((c) => {
            const video = /camera|video|Record|Say hello|Invite them|Thank them anyway/i.test(c.textContent);
            c.setAttribute('data-open-dialog', video ? 'video' : 'report-ai');
        });
        // Anything that would write, or leave the page, is inert.
        scope.querySelectorAll('.sig-feed-row .btn, .sig-td-action button, .sig-cols button, .sig-wide, [data-signals] input[type=search]')
            .forEach((el) => el.setAttribute('data-inert', ''));
        scope.querySelectorAll('.sig-clear').forEach((a) => { a.setAttribute('data-inert', ''); a.removeAttribute('href'); });
    });

    // Dialog routes switch inside the dialog; the primary button is inert.
    dialogTpls.forEach((t) => {
        t.content.querySelectorAll('.sig-route').forEach((b) => {
            const label = b.querySelector('b')?.textContent || '';
            const src = /draft/i.test(label) ? 'ai' : /template/i.test(label) ? 'template' : 'existing';
            b.setAttribute('data-route', src);
        });
        t.content.querySelectorAll('.sig-modal-actions .btn, .sig-modal button').forEach((b) => {
            if (!b.hasAttribute('data-route')) b.setAttribute('data-inert', '');
        });
        const back = t.content.querySelector('.sig-modal-backdrop');
        if (back) back.setAttribute('data-dialog-backdrop', '');
    });

    // Tour anchors, on the live DOM and in every state so they survive a swap.
    const tour = (el, id) => { if (el) el.setAttribute('data-tour', id); };
    scopes.forEach((scope) => {
        tour(scope.querySelector('.sig-strip'), 'health');
        tour(scope.querySelector('.sig-do-intro'), 'headline');
        tour(scope.querySelector('.sig-kpis-filter'), 'tiles');
        tour(scope.querySelectorAll('.sig-kpi-btn')[4], 'at-risk-tile');
        tour(scope.querySelector('.sig-view'), 'views');
        tour(scope.querySelector('.sig-feed-row, .sig-tr:not(.sig-th)'), 'row');
        tour(scope.querySelector('.sig-do'), 'actions');
        tour(scope.querySelector('#signals-health'), 'giving-health');
    });

    const symbols = new Set();
    scopes.forEach((scope) => scope.querySelectorAll('.material-symbols-outlined')
        .forEach((el) => symbols.add(el.textContent.trim())));

    return {
        dashboard: root.outerHTML,
        templates: [...stateTpls, ...dialogTpls].map((t) => t.outerHTML).join('\n'),
        symbols: Array.from(symbols).filter(Boolean).sort(),
    };
});
await browser.close();

// ---------------------------------------------------------------------------
// 3. Fonts.
// ---------------------------------------------------------------------------
async function googleFontCss(url) {
    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) throw new Error(`Google Fonts ${resp.status}: ${url}`);
    return resp.text();
}
async function vendorFont(css, fileName) {
    const src = css.match(/url\((https:[^)]+)\)/);
    if (!src) throw new Error(`no font url in: ${css.slice(0, 200)}`);
    const resp = await fetch(src[1]);
    fs.writeFileSync(path.join(DEMO, 'fonts', fileName), Buffer.from(await resp.arrayBuffer()));
    return css.replace(src[1], `fonts/${fileName}`);
}
const materialCss = await vendorFont(
    await googleFontCss('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
        + `&icon_names=${transformed.symbols.join(',')}&display=block`),
    'material-symbols-outlined.woff2');

const BRAND_FONTS = `
@font-face{font-family:"PPFragment GlareExtraBold";src:url("/assets/fonts/PPFragment-GlareExtraBold.woff2") format("woff2"),url("/assets/fonts/PPFragment-GlareExtraBold.woff") format("woff");font-display:swap}
@font-face{font-family:"PPFragment TextRegular";src:url("/assets/fonts/PPFragment-TextRegular.woff2") format("woff2"),url("/assets/fonts/PPFragment-TextRegular.woff") format("woff");font-display:swap}
`;

// ---------------------------------------------------------------------------
// 4. CSS.
// ---------------------------------------------------------------------------
const SHEETS = [
    [/daisyui@2\.42\.1/, path.join(CACHE, 'css', 'daisyui-2.42.1.full.css')],
    [/tailwindcss@2\.2/, path.join(CACHE, 'css', 'tailwind-2.2.min.css')],
    [/\/css\/builder-style\.css/, path.join(BUILDER_PUBLIC, 'css', 'builder-style.css')],
    [/\/css\/template-gallery\.css/, path.join(BUILDER_PUBLIC, 'css', 'template-gallery.css')],
];
const SKIPPED = /typekit|Material\+Icons|Material\+Symbols|Roboto|materialdesignicons|tourguide|jspreadsheet/;
const parts = [];
for (const sheet of capture.stylesheets) {
    if (!sheet.href) { parts.push(sheet.inline); continue; }
    if (SKIPPED.test(sheet.href)) continue;
    const match = SHEETS.find(([pattern]) => pattern.test(sheet.href));
    if (!match) { console.warn(`skipping unmapped stylesheet ${sheet.href}`); continue; }
    parts.push(fs.readFileSync(match[1], 'utf8'));
}
const productCss = parts.join('\n').replace(/@font-face\s*{[^}]*PPFragment[^}]*}/g, '');
const replicaJs = fs.readFileSync(path.join(DEMO, 'replica.js'), 'utf8');

const [purged] = await new PurgeCSS().purge({
    content: [
        { raw: `<html id="root" class="${capture.htmlAttrs.class}"><body id="body" class="${capture.bodyAttrs.class}">${transformed.dashboard}${transformed.templates}</body></html>`, extension: 'html' },
        { raw: replicaJs, extension: 'js' },
    ],
    css: [{ raw: productCss }],
    // Tailwind's responsive and fractional classes contain ":" and "/"; the
    // default extractor splits on them and would drop every breakpoint rule.
    defaultExtractor: (content) => content.match(/[\w-/:.%]+(?<!:)/g) || [],
    fontFace: false, keyframes: true, variables: false, rejected: false,
    dynamicAttributes: ['data-tile', 'data-view', 'data-state', 'data-theme', 'aria-pressed', 'aria-selected', 'aria-expanded'],
    safelist: { standard: ['active', 'is-active', 'on', 'lead', 'solo', 'sig-modal-tall', /^sig-/, /^modal/] },
});

const REPLICA_ADDITIONS = `
/* ---- Replica additions (not product CSS) ---- */
#dashboard [data-dashboard-main]{left:0!important;width:100%!important}
[data-inert]{cursor:not-allowed}
[data-tile],[data-view],[data-open-dialog],[data-route]{cursor:pointer}
#replica-toast{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;z-index:1000;
  background:#1b2734;color:#fff;border:1px solid #395061;border-radius:.6rem;padding:.6rem 1rem;font:500 .85rem/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .2s,transform .2s}
#replica-toast.is-visible{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion: reduce){#replica-toast{transition:none}}
`;
const productTrimmed = purged.css.replace(/url\(\s*["']?https:\/\/images\.unsplash\.com[^)]*\)/g, 'none');
const css = `${BRAND_FONTS}\n${materialCss}\n${productTrimmed}\n${REPLICA_ADDITIONS}`;
const remoteUrls = [...css.matchAll(/url\(\s*["']?(https?:[^"')]+)/g)].map((m) => m[1]);
if (remoteUrls.length) console.warn(`remote url() left in replica.css:\n  ${[...new Set(remoteUrls)].join('\n  ')}`);
fs.writeFileSync(path.join(DEMO, 'replica.css'), css);

// ---------------------------------------------------------------------------
// 5. The page.
// ---------------------------------------------------------------------------
const attrs = (obj) => Object.entries(obj).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('');
const html = `<!DOCTYPE html>
<html lang="en"${attrs(capture.htmlAttrs)}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Donor Signals demo | Storyraise</title>
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="https://docs.storyraise.com/donor-signals/" />
  <link rel="stylesheet" href="replica.css?v=${hash(css)}" />
  <script src="replica.js?v=${hash(replicaJs)}" defer></script>
</head>
<!-- Read-only replica of the Storyraise Donor Signals page with fabricated data for a
     fictional food bank. Captured from builder ${config.builder.sha.slice(0, 8)} on ${capture.capturedAt.slice(0, 10)}
     by tools/donor-signals/replica. -->
<body${attrs(capture.bodyAttrs)}>
${transformed.dashboard}
${transformed.templates}
<div id="replica-toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
fs.writeFileSync(path.join(DEMO, 'index.html'), html);

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;
console.log(`symbols (${transformed.symbols.length}): ${transformed.symbols.join(' ')}`);
for (const f of ['index.html', 'replica.css', 'fonts/material-symbols-outlined.woff2']) {
    console.log(`${f}: ${kb(path.join(DEMO, f))}`);
}
