// Turn the capture into the static, read-only demo page.
//
//   node replica/build-replica.mjs
//
// Reads .cache/replica/capture.json (from capture-replica.mjs) and writes
// storyraise-analytics/demo/{index.html, replica.css, fonts/, img/}. The DOM is
// transformed inside a headless page (no HTML parser dependency): interactive
// controls get data-* hooks for replica.js, anything that would change data is
// made inert, and each tour stop gets a stable data-tour anchor.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PurgeCSS } from 'purgecss';
import sharp from 'sharp';
import { config, FIXTURES_DIR, SITE_DIR, TOOLS_DIR, readJson } from '../scripts/lib/identity.mjs';

const CACHE = path.join(TOOLS_DIR, '.cache');
const DEMO = path.join(SITE_DIR, 'demo');
const BUILDER_PUBLIC = path.join(config.builder.path, 'public');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const capture = readJson(path.join(CACHE, 'replica', 'capture.json'));
const summary = readJson(path.join(FIXTURES_DIR, 'insights-summary.json'));
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);

fs.mkdirSync(path.join(DEMO, 'fonts'), { recursive: true });
fs.mkdirSync(path.join(DEMO, 'img'), { recursive: true });

// ---------------------------------------------------------------------------
// 1. Transform the captured DOM.
// ---------------------------------------------------------------------------
const rangeTemplates = Object.entries(capture.rangeFragments)
    .map(([days, f]) => `<template data-range="${days}">${f.heatmap}${f.trend}</template>`)
    .join('\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body>${capture.dashboardHtml}${rangeTemplates}</body></html>`);

const transformed = await page.evaluate(() => {
    const root = document.querySelector('#dashboard');
    const templates = Array.from(document.querySelectorAll('template[data-range]'));
    const scopes = [root, ...templates.map((t) => t.content)];
    const fail = (message) => { throw new Error(message); };
    const one = (scope, selector, label) => scope.querySelector(selector) || fail(`missing: ${label || selector}`);
    const byText = (scope, selector, pattern) =>
        Array.from(scope.querySelectorAll(selector)).find((el) => pattern.test(el.textContent)) || fail(`missing: ${selector} ${pattern}`);

    // The dashboard offsets its content for the sidebar; the replica has no sidebar.
    one(root, '[data-dashboard-main]').classList.remove('md:pl-64');

    // Tabs.
    const tablist = one(root, '[data-insights-tabs]');
    tablist.setAttribute('role', 'tablist');
    tablist.querySelectorAll('a.tab').forEach((tab) => {
        const view = /Story/.test(tab.textContent) ? 'summary' : 'overview';
        tab.setAttribute('data-tab', view);
        tab.setAttribute('role', 'tab');
        tab.setAttribute('tabindex', '0');
        tab.setAttribute('aria-selected', tab.classList.contains('tab-active') ? 'true' : 'false');
    });

    // Detail modals and map controls.
    const mapCard = one(root, '[data-worldmap-canvas]').closest('figure');
    byText(mapCard, 'button', /See more/).setAttribute('data-open-modal', 'locations-modal');
    const constituentsCard = one(root, '[data-insights-constituents] figure');
    byText(constituentsCard, 'button', /How it works/).setAttribute('data-open-modal', 'engagement-score-modal');
    byText(constituentsCard, 'button', /See more/).setAttribute('data-open-modal', 'constituents-modal');
    mapCard.querySelectorAll('.sr-worldmap-zoom button').forEach((b) => {
        b.setAttribute('data-map-zoom', /in/i.test(b.getAttribute('aria-label')) ? '1.4' : '0.72');
    });

    // Range chips, in the live DOM and every pre-rendered range.
    const RANGE = { '7 days': 7, '30 days': 30, '3 Months': 90, '6 Months': 180, '1 Year': 365 };
    scopes.forEach((scope) => {
        scope.querySelectorAll('button.heatmap-chip').forEach((chip) => {
            const days = RANGE[chip.textContent.trim()] || fail(`unknown chip ${chip.textContent}`);
            chip.setAttribute('data-range', String(days));
            chip.setAttribute('aria-pressed', chip.classList.contains('is-active') ? 'true' : 'false');
        });
    });

    // Section Retention arrows.
    one(root, '.reader-flow__nav--left').setAttribute('data-flow-page', '-1');
    one(root, '.reader-flow__nav--right').setAttribute('data-flow-page', '1');

    // The Story: jump links scroll; "Regenerate summary" is inert; download opens the sample PDF.
    root.querySelectorAll('[data-narrative-toc] a').forEach((a, i) => a.setAttribute('data-toc-index', String(i)));
    one(root, '[data-narrative-download]').setAttribute('data-download-pdf', '');

    // Everything else that navigates is inert (links, regenerate, clicked-link URLs).
    root.querySelectorAll('a[href]').forEach((a) => {
        if (a.hasAttribute('data-toc-index')) return;
        a.removeAttribute('href');
        a.removeAttribute('target');
        a.setAttribute('data-inert', '');
        a.setAttribute('role', 'link');
        a.setAttribute('tabindex', '0');
        a.setAttribute('aria-disabled', 'true');
    });

    // Regions & Cities: start collapsed; replica.js expands on click.
    root.querySelectorAll('li[data-drill-row]').forEach((row) => {
        row.setAttribute('data-expanded', 'false');
        if (row.getAttribute('data-drill-row') === 'true') {
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
            row.setAttribute('aria-expanded', 'false');
        }
    });
    root.querySelectorAll('li[data-cities-panel]').forEach((panel) => { panel.style.display = 'none'; });

    // Modal close labels are keyboard reachable.
    root.querySelectorAll('.insights-modal label[for]').forEach((label) => {
        label.setAttribute('role', 'button');
        label.setAttribute('tabindex', '0');
    });

    // Tour anchors.
    const tour = (el, id) => (el || fail(`tour target: ${id}`)).setAttribute('data-tour', id);
    tour(tablist, 'tabs');
    tour(root.querySelector('[data-insights-highlights]'), 'highlights');
    const kpis = root.querySelectorAll('[data-insights-overview="1"] > div');
    tour(kpis[0], 'constituents');
    (kpis[1] || fail('kpi 2')).setAttribute('data-tour-also', 'constituents');
    tour(kpis[2], 'views');
    tour(kpis[3], 'avg-time');
    tour(mapCard, 'map');
    tour(constituentsCard, 'engaged');
    tour(constituentsCard.querySelector('[data-card-intent-badge] .intent-badge'), 'badges');
    tour(root.querySelector('[data-link-clicks] figure'), 'clicks');
    tour(root.querySelector('[data-insights-overview="6"]'), 'how-they-read');
    tour(root.querySelector('[data-reader-flow-wrap] figure'), 'retention');
    scopes.forEach((scope) => {
        tour(scope.querySelector('[data-engagement-heatmap-wrap] figure'), 'heatmap');
        tour(scope.querySelector('[data-visits-trend-wrap] figure'), 'trend');
    });
    tour(root.querySelector('[data-insights-narrative]'), 'story');

    const symbols = new Set();
    const icons = new Set();
    scopes.forEach((scope) => {
        scope.querySelectorAll('.material-symbols-outlined').forEach((el) => symbols.add(el.textContent.trim()));
        scope.querySelectorAll('.material-icons').forEach((el) => icons.add(el.textContent.trim()));
    });

    return {
        dashboard: root.outerHTML,
        templates: templates.map((t) => t.outerHTML).join('\n'),
        symbols: Array.from(symbols).filter(Boolean).sort(),
        icons: Array.from(icons).filter(Boolean).sort(),
    };
});
await browser.close();

// ---------------------------------------------------------------------------
// 2. Fonts: Material Symbols subset (only the glyphs used), brand fonts from /assets.
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

let materialCss = await vendorFont(
    await googleFontCss('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
        + `&icon_names=${transformed.symbols.join(',')}&display=block`),
    'material-symbols-outlined.woff2');
if (transformed.icons.length) {
    materialCss += await vendorFont(await googleFontCss('https://fonts.googleapis.com/icon?family=Material+Icons&display=block'), 'material-icons.woff2');
}

const BRAND_FONTS = `
@font-face{font-family:"PPFragment GlareExtraBold";src:url("/assets/fonts/PPFragment-GlareExtraBold.woff2") format("woff2"),url("/assets/fonts/PPFragment-GlareExtraBold.woff") format("woff");font-display:swap}
@font-face{font-family:"PPFragment TextRegular";src:url("/assets/fonts/PPFragment-TextRegular.woff2") format("woff2"),url("/assets/fonts/PPFragment-TextRegular.woff") format("woff");font-display:swap}
`;

// ---------------------------------------------------------------------------
// 3. CSS: the dashboard's stylesheets in their original order, trimmed to this page.
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
// The dashboard's own PPFragment faces point at Firebase Storage; the docs site hosts the same fonts.
const productCss = parts.join('\n').replace(/@font-face\s*{[^}]*PPFragment[^}]*}/g, '');

const replicaJs = fs.readFileSync(path.join(DEMO, 'replica.js'), 'utf8');
const [purged] = await new PurgeCSS().purge({
    content: [
        { raw: `<html id="root" class="${capture.htmlAttrs.class}"><body id="body" class="${capture.bodyAttrs.class}">${transformed.dashboard}${transformed.templates}</body></html>`, extension: 'html' },
        { raw: replicaJs, extension: 'js' },
    ],
    css: [{ raw: productCss }],
    // Tailwind's responsive and fractional classes (md:pl-64, lg:px-8, w-1/2)
    // contain ":" and "/"; the default extractor splits on them and the trim
    // would silently drop every breakpoint rule.
    defaultExtractor: (content) => content.match(/[\w-/:.%]+(?<!:)/g) || [],
    fontFace: false,
    keyframes: true,
    variables: false,
    rejected: false,
    dynamicAttributes: ['data-p', 'data-expanded', 'data-theme', 'data-tip', 'data-tooltip', 'data-drill-row', 'aria-expanded', 'aria-selected', 'aria-pressed'],
    safelist: {
        standard: ['tab-active', 'is-active', 'is-hidden', 'is-dragging', 'is-live', 'filled', 'active', 'tooltip--enhanced', /^a11y-tooltip/, /^modal/],
    },
});

const REPLICA_ADDITIONS = `
/* ---- Replica additions (not product CSS) ---- */
/* The dashboard shifts its content and modals right to clear the 240px sidebar;
   the replica has no sidebar. At a 1200px-wide frame the content column is the
   same 1140px it is in the app at 1440px. */
#dashboard [data-dashboard-main]{left:0!important;width:100%!important}
.insights-modal{padding-left:0!important}
[data-worldmap-canvas]:not(.is-live){background:url("img/map-fallback.webp") center/cover no-repeat}
[data-inert]{cursor:not-allowed}
[data-tab],[data-drill-row="true"],label[role="button"]{cursor:pointer}
#replica-toast{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;z-index:1000;
  background:#1b2734;color:#fff;border:1px solid #395061;border-radius:.6rem;padding:.6rem 1rem;font:500 .85rem/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .2s,transform .2s}
#replica-toast.is-visible{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion: reduce){#replica-toast{transition:none}}
`;

// The dashboard's login screen backgrounds (Unsplash photos on :root and body)
// survive the trim because their selectors match any page; they never paint
// here, so drop them rather than ship third-party image URLs.
const productTrimmed = purged.css.replace(/url\(\s*["']?https:\/\/images\.unsplash\.com[^)]*\)/g, 'none');
const css = `${BRAND_FONTS}\n${materialCss}\n${productTrimmed}\n${REPLICA_ADDITIONS}`;
const remoteUrls = [...css.matchAll(/url\(\s*["']?(https?:[^"')]+)/g)].map((m) => m[1]);
if (remoteUrls.length) console.warn(`remote url() references left in replica.css:\n  ${[...new Set(remoteUrls)].join('\n  ')}`);
fs.writeFileSync(path.join(DEMO, 'replica.css'), css);

// ---------------------------------------------------------------------------
// 4. Static map image (shown until ECharts takes over, and as the no-JS view).
// ---------------------------------------------------------------------------
await sharp(path.join(CACHE, 'replica', 'map@2x.png')).webp({ quality: 82 }).toFile(path.join(DEMO, 'img', 'map-fallback.webp'));

// ---------------------------------------------------------------------------
// 5. The page.
// ---------------------------------------------------------------------------
const attrs = (obj) => Object.entries(obj).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('');
const dataIsland = JSON.stringify({ geo_points: summary.geo_points }).replace(/</g, '\\u003c');
const html = `<!DOCTYPE html>
<html lang="en"${attrs(capture.htmlAttrs)}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Analytics demo: ${config.identity.report_title} | Storyraise</title>
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="https://docs.storyraise.com/storyraise-analytics/" />
  <link rel="stylesheet" href="replica.css?v=${hash(css)}" />
  <script src="vendor/accessible-tooltip.js" defer></script>
  <script src="replica.js?v=${hash(replicaJs)}" defer></script>
</head>
<!-- Read-only replica of the Storyraise Analytics page with sample data for a fictional organization.
     Captured from builder ${config.builder.sha.slice(0, 8)} on ${capture.capturedAt.slice(0, 10)} by tools/storyraise-analytics/replica. -->
<body${attrs(capture.bodyAttrs)}>
${transformed.dashboard}
${transformed.templates}
<script type="application/json" id="replica-data">${dataIsland}</script>
<div id="replica-toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
fs.writeFileSync(path.join(DEMO, 'index.html'), html);

const kb = (file) => `${(fs.statSync(file).size / 1024).toFixed(0)} KB`;
console.log(`symbols (${transformed.symbols.length}): ${transformed.symbols.join(' ')}`);
console.log(`material icons: ${transformed.icons.join(' ') || 'none'}`);
for (const f of ['index.html', 'replica.css', 'fonts/material-symbols-outlined.woff2', 'img/map-fallback.webp']) {
    console.log(`${f}: ${kb(path.join(DEMO, f))}`);
}
