// Turn the capture into the static, read-only demo page.
//
//   node replica/build-replica.mjs
//
// Reads .cache/replica/capture.json and writes connections-and-sync/demo/. The DOM is
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
// 1. Vendor logos: relative assets/ paths in the builder. Copy them local.
// ---------------------------------------------------------------------------
const logoMap = {};
for (const src of capture.logos) {
    const file = path.join(BUILDER_PUBLIC, src.split('?')[0]);
    const name = `logo-${path.basename(file)}`;
    fs.copyFileSync(file, path.join(DEMO, 'img', name));
    logoMap[src] = `img/${name}`;
}
const localiseLogos = (html) => Object.entries(logoMap).reduce(
    (s, [from, to]) => s.split(`src="${from}"`).join(`src="${to}"`), html);
console.log(`logos: ${Object.keys(logoMap).length} local`);

// ---------------------------------------------------------------------------
// 2. Transform the captured DOM.
// ---------------------------------------------------------------------------
const dialogTemplates = Object.entries(capture.dialogs).filter(([, v]) => v)
    .map(([key, html]) => `<template data-dialog="${key}">${html}</template>`).join('\n');

const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body>${localiseLogos(capture.dashboardHtml)}${dialogTemplates}</body></html>`);

const transformed = await page.evaluate(() => {
    const root = document.querySelector('#dashboard');
    const dialogTpls = Array.from(document.querySelectorAll('template[data-dialog]'));
    const fail = (m) => { throw new Error(m); };
    const one = (scope, sel, label) => scope.querySelector(sel) || fail(`missing: ${label || sel}`);

    // No sidebar in the replica.
    one(root, '[data-dashboard-main]').classList.remove('md:pl-64');

    const section = one(root, 'section[data-connections]');
    const rowsBox = one(section, 'h3 ~ *', 'add grid').previousElementSibling.previousElementSibling;
    const rows = Array.from(rowsBox.children);
    if (rows.length !== 2) fail(`expected 2 connected rows, got ${rows.length}`);
    const [re, sf] = rows;
    const byText = (scope, sel, re) => Array.from(scope.querySelectorAll(sel)).find((el) => re.test(el.textContent)) || fail(`missing text ${re}`);
    const RO = 'This is a read-only demo.';

    rows.forEach((row, i) => {
        const vendor = i === 0 ? 'blackbaud' : 'salesforce';
        row.setAttribute('data-sr-vendor', vendor);
        // "Sync now" reopens the scope picker, exactly as the product does.
        const sync = one(row, 'button[title="Sync now"]');
        sync.setAttribute('data-open-dialog', vendor === 'blackbaud' ? 'bb-list' : 'sf-scope');
        byText(row, 'button', /Add data/).setAttribute('data-inert', 'Adding data needs a live connection. This is a read-only demo.');
        byText(row, 'button', /Send to/).setAttribute('data-open-dialog', `wb-${vendor}`);
        one(row, '.dropdown').setAttribute('data-sr-menu', vendor);
        row.querySelectorAll('.dropdown-content a').forEach((a) => a.setAttribute('data-inert', RO));
    });

    // Nothing in the catalog can actually connect from here.
    const grid = one(section, '.cxn-add-grid');
    grid.querySelectorAll('button').forEach((b) => b.setAttribute('data-inert', 'Connecting needs a Storyraise account. This is a read-only demo.'));
    root.querySelectorAll('input[type="search"]').forEach((i) => { i.setAttribute('readonly', ''); i.setAttribute('data-inert', RO); });

    dialogTpls.forEach((t) => {
        const key = t.getAttribute('data-dialog');
        t.content.querySelectorAll('.modal-action .btn, .modal-action label').forEach((b) => {
            const label = (b.textContent || '').trim();
            if (/^(cancel|close)$/i.test(label)) { b.setAttribute('data-dialog-close', ''); b.removeAttribute('for'); return; }
            // Send now shows the result line the product prints after a run.
            if (/send now/i.test(label) && t.content.ownerDocument && !/-sent$/.test(key)) {
                b.setAttribute('data-open-dialog', `${key}-sent`);
                return;
            }
            b.setAttribute('data-inert', /sync/i.test(label)
                ? 'Syncing needs a live connection. This is a read-only demo.' : RO);
        });
        // Whichever dialog is open is the tour's "dialog" target.
        t.content.querySelector('.modal-box')?.setAttribute('data-tour', 'dialog');
        // The daisyUI checkbox would close the modal on its own label clicks.
        t.content.querySelectorAll('.modal-toggle').forEach((c) => c.setAttribute('tabindex', '-1'));
    });

    // Tour anchors.
    const tour = (el, id) => { if (el) el.setAttribute('data-tour', id); };
    const chip = (row, re) => Array.from(row.querySelectorAll('span')).find((s) => re.test(s.textContent) && s.children.length <= 2);
    tour(rowsBox, 'rows');
    tour(re, 'row-re');
    tour(sf, 'row-sf');
    tour(chip(re, /^\s*group\s*Constituents/), 'scope');
    tour(Array.from(re.querySelectorAll('span')).find((s) => /^\s*·?\s*synced /.test(s.textContent)), 'synced');
    tour(Array.from(re.querySelectorAll('span')).find((s) => /^\s*schedule\s+daily/.test(s.textContent)), 'cadence');
    tour(Array.from(re.querySelectorAll('span')).find((s) => /^\s*ios_share\s+\d+ sent/.test(s.textContent)), 'sent');
    tour(one(re, 'button[title="Sync now"]'), 'sync-now');
    tour(one(re, '[data-sr-menu]'), 'menu');
    tour(byText(re, 'button', /Send to/), 'send-re');
    tour(byText(sf, 'button', /Send to/), 'send-sf');
    tour(byText(re, 'button', /Add data/), 'add-data');
    tour(grid, 'catalog');
    ['scope', 'synced', 'cadence', 'sent'].forEach((id) => root.querySelector(`[data-tour="${id}"]`) || fail(`tour anchor ${id}`));

    const symbols = new Set();
    [root, ...dialogTpls.map((t) => t.content)].forEach((scope) => scope.querySelectorAll('.material-symbols-outlined')
        .forEach((el) => symbols.add(el.textContent.trim())));

    return {
        dashboard: root.outerHTML,
        templates: dialogTpls.map((t) => t.outerHTML).join('\n'),
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
    dynamicAttributes: ['data-theme', 'aria-expanded'],
    safelist: { standard: ['dropdown-open', /^dropdown/, /^modal/, /^toggle/, /^select/, /^textarea/, /^input/] },
});

const REPLICA_ADDITIONS = `
/* ---- Replica additions (not product CSS) ---- */
#dashboard [data-dashboard-main]{left:0!important;width:100%!important}
[data-inert]{cursor:not-allowed}
[data-open-dialog]{cursor:pointer}
#replica-dialog .modal{z-index:999}
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
  <title>Connections demo | Storyraise</title>
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="https://docs.storyraise.com/connections-and-sync/" />
  <link rel="stylesheet" href="replica.css?v=${hash(css)}" />
  <script src="replica.js?v=${hash(replicaJs)}" defer></script>
</head>
<!-- Read-only replica of the Storyraise Connections page with fabricated data for a
     fictional community foundation. Captured from builder ${config.builder.sha.slice(0, 8)} on ${capture.capturedAt.slice(0, 10)}
     by tools/connections-and-sync/replica. -->
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
