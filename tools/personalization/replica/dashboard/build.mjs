// Turn the dashboard capture into two static, read-only screens.
//
//   node replica/dashboard/build.mjs
//
// Reads .cache/replica/dashboard/capture.json and writes, under personalization/demo/:
//   constituents.html  states list, add-csv, map
//   profile.html       state profile (Emily Wilson's drawer)
//   dashboard.css      the product CSS both screens use, purged
//   fonts/material-symbols-outlined-dash.woff2, img/dash-*
//
// Each state is the captured fragment, transformed in a headless page: every control
// becomes inert (a "read-only demo" toast) except the few that move between states,
// which get data-sr-action. The build fails if a tour anchor is missing from a state.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PurgeCSS } from 'purgecss';
import { config, SITE_DIR, TOOLS_DIR, readJson } from '../../scripts/lib/identity.mjs';
import { CHROMIUM, PORT } from './lib.mjs';

const CACHE = path.join(TOOLS_DIR, '.cache');
const DEMO = path.join(SITE_DIR, 'demo');
const BUILDER_PUBLIC = path.join(config.builder.path, 'public');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const capture = readJson(path.join(CACHE, 'replica', 'dashboard', 'capture.json'));
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);

fs.mkdirSync(path.join(DEMO, 'fonts'), { recursive: true });
fs.mkdirSync(path.join(DEMO, 'img'), { recursive: true });

const SCREENS = {
    constituents: { title: 'Constituents', states: ['list', 'add-csv', 'map'] },
    profile: { title: 'Constituent profile', states: ['profile'] },
};

// ---------------------------------------------------------------------------
// 1. Images: relative assets/ paths in the builder. Copy them local.
// ---------------------------------------------------------------------------
const imageMap = {};
for (const src of new Set(Object.values(capture.states).flatMap((s) => s.images))) {
    const file = path.join(BUILDER_PUBLIC, src.split('?')[0]);
    const name = `dash-${path.basename(file)}`;
    fs.copyFileSync(file, path.join(DEMO, 'img', name));
    imageMap[src] = `img/${name}`;
}
const localiseImages = (html) => Object.entries(imageMap).reduce(
    (s, [from, to]) => s.split(`src="${from}"`).join(`src="${to}"`), html);

// ---------------------------------------------------------------------------
// 2. Transform each state's fragment.
// ---------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();
const transformed = {};
for (const [name, state] of Object.entries(capture.states)) {
    await page.setContent(`<!doctype html><html><body>${localiseImages(state.html)}</body></html>`);
    transformed[name] = await page.evaluate(({ name, anchors }) => {
        const root = document.querySelector('#dashboard');
        const fail = (m) => { throw new Error(`${name}: ${m}`); };
        const byText = (sel, re) => Array.from(root.querySelectorAll(sel)).find((el) => re.test(el.textContent.trim()));
        const act = (el, action, label) => (el || fail(`missing control: ${label || action}`)).setAttribute('data-sr-action', action);

        // The add card opens by focus in the product; the replica drives it by state, so
        // nothing in it may take focus and reopen it behind the state machine's back.
        root.querySelectorAll('.dropdown [tabindex]').forEach((el) => el.removeAttribute('tabindex'));
        root.querySelectorAll('.modal-toggle').forEach((el) => el.setAttribute('tabindex', '-1'));

        const add = root.querySelector('#connect_constituents') || fail('Add constituents');
        const rows = Array.from(root.querySelectorAll('ul[data-constituents] > li')).filter((li) => /@/.test(li.textContent));
        if (rows.length !== 6) fail(`expected 6 rows, got ${rows.length}`);
        const emily = rows.find((li) => /Emily Wilson/.test(li.textContent)) || fail('Emily row');

        if (name === 'list') {
            act(add, 'state:add-csv', 'Add constituents');
            act(emily, 'screen:profile', 'Emily row');
        } else if (name === 'add-csv') {
            act(add, 'state:list', 'Add constituents');
            act(byText('.dropdown-content .tab', /^CSV File$/), 'none', 'CSV File tab');
            act(byText('.dropdown-content button', /Upload CSV$/), 'state:map', 'Upload CSV');
            act(root.querySelector('.page.dimmed'), 'state:list', 'dimmed page');
        } else if (name === 'map') {
            const cancel = byText('#import-mapping-modal + .modal .modal-action label, #import-mapping-modal + .modal .modal-action button', /^Cancel$/);
            act(cancel, 'state:list', 'Cancel');
            cancel.removeAttribute('for');
        } else if (name === 'profile') {
            act(byText('[data-detail-view] button', /^Done Editing$/), 'screen:constituents', 'Done Editing');
            act(emily, 'none', 'Emily row');
        }

        // Everything else that reacts in the product is inert here.
        const RO = 'This is a read-only demo.';
        const interactive = 'a, button, label, input, select, textarea, li, [role="button"], .tab';
        root.querySelectorAll(interactive).forEach((el) => {
            if (el.closest('[data-sr-action]')) return;
            if (el.matches('li') && !rows.includes(el)) return;
            if (el.matches('label') && !el.matches('.btn, [for]') && !el.querySelector('input')) return;
            el.setAttribute('data-inert', RO);
            el.setAttribute('aria-disabled', 'true');
        });
        root.querySelectorAll('input[type="text"], input:not([type]), input[type="search"], textarea').forEach((el) => el.setAttribute('readonly', ''));
        root.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', '#'));
        root.querySelectorAll('input[type="file"]').forEach((el) => el.remove());

        for (const id of anchors) root.querySelector(`[data-tour="${id}"]`) || fail(`tour anchor ${id} missing`);
        root.setAttribute('data-sr-state', name);
        return root.outerHTML;
    }, { name, anchors: Object.keys(state.rects) });
}
await browser.close();

// ---------------------------------------------------------------------------
// 3. Fonts: Material Symbols subset to the glyphs in use; PPFragment from the site.
//    Typekit (futura-pt, the drawer's name line) is dropped; see the CSS step.
// ---------------------------------------------------------------------------
const symbols = [...new Set(Object.values(capture.states).flatMap((s) => s.symbols))].filter(Boolean).sort();
const fontCssResp = await fetch('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
    + `&icon_names=${symbols.join(',')}&display=block`, { headers: { 'User-Agent': UA } });
if (!fontCssResp.ok) throw new Error(`Google Fonts ${fontCssResp.status}`);
let materialCss = await fontCssResp.text();
const fontUrl = materialCss.match(/url\((https:[^)]+)\)/)[1];
const FONT_FILE = 'material-symbols-outlined-dash.woff2';
fs.writeFileSync(path.join(DEMO, 'fonts', FONT_FILE), Buffer.from(await (await fetch(fontUrl)).arrayBuffer()));
materialCss = materialCss.replace(fontUrl, `fonts/${FONT_FILE}`);

const BRAND_FONTS = `
@font-face{font-family:"PPFragment TextRegular";src:url("/assets/fonts/PPFragment-TextRegular.woff2") format("woff2"),url("/assets/fonts/PPFragment-TextRegular.woff") format("woff");font-display:swap}
`;

// ---------------------------------------------------------------------------
// 4. CSS.
// ---------------------------------------------------------------------------
const SHEETS = [
    [/daisyui@2\.42\.1/, path.join(CACHE, 'css', 'daisyui-2.42.1.full.css')],
    [/tailwindcss@2\.2/, path.join(CACHE, 'css', 'tailwind-2.2.min.css')],
];
const SKIPPED = /typekit|Material\+Icons|Material\+Symbols|Roboto|materialdesignicons|tourguide|jspreadsheet/;
const LOCAL = new RegExp(`^http://127\\.0\\.0\\.1:${PORT}/`);
const parts = [];
for (const sheet of capture.stylesheets) {
    if (!sheet.href) { parts.push(sheet.inline); continue; }
    if (SKIPPED.test(sheet.href)) continue;
    if (LOCAL.test(sheet.href)) { parts.push(fs.readFileSync(path.join(BUILDER_PUBLIC, sheet.href.replace(LOCAL, '').split('?')[0]), 'utf8')); continue; }
    const match = SHEETS.find(([pattern]) => pattern.test(sheet.href));
    if (!match) { console.warn(`skipping unmapped stylesheet ${sheet.href}`); continue; }
    parts.push(fs.readFileSync(match[1], 'utf8'));
}
const productCss = parts.join('\n').replace(/@font-face\s*{[^}]*PPFragment[^}]*}/g, '');

const RUNTIME = fs.readFileSync(path.join(TOOLS_DIR, 'replica', 'dashboard', 'screen.js'), 'utf8');
const allHtml = Object.values(transformed).join('\n');
const [purged] = await new PurgeCSS().purge({
    content: [
        { raw: `<html id="root" class="${capture.htmlAttrs.class}"><body id="body" class="${capture.bodyAttrs.class}">${allHtml}</body></html>`, extension: 'html' },
        { raw: RUNTIME, extension: 'js' },
    ],
    css: [{ raw: productCss }],
    // Tailwind's responsive and fractional classes contain ":" and "/"; the default
    // extractor splits on them and would drop every breakpoint rule.
    defaultExtractor: (content) => content.match(/[\w-/:.%]+(?<!:)/g) || [],
    fontFace: false, keyframes: true, variables: false, rejected: false,
    dynamicAttributes: ['data-theme', 'aria-expanded', 'data-tip'],
    safelist: { standard: ['dropdown-open', /^dropdown/, /^modal/, /^tooltip/, /^tab/] },
});

const REPLICA_ADDITIONS = `
/* ---- Replica additions (not product CSS) ---- */
/* No sidebar: builder-style.css offsets the main column by 16rem for it. */
#dashboard [data-dashboard-main]{left:0!important;width:100%!important}
[data-inert]{cursor:not-allowed}
[data-sr-action]{cursor:pointer}
#replica-toast{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;z-index:1000;
  background:#1b2734;color:#fff;border:1px solid #395061;border-radius:.6rem;padding:.6rem 1rem;font:500 .85rem/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .2s,transform .2s}
#replica-toast.is-visible{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion: reduce){#replica-toast{transition:none}}
`;
const productTrimmed = purged.css
    .replace(/url\(\s*["']?https:\/\/images\.unsplash\.com[^)]*\)/g, 'none')
    // Relative asset urls in builder-style.css point into the product; none render in these states.
    .replace(/url\(\s*["']?(?:\.\.\/)?(?:assets|img|images)\/[^)]*\)/g, 'none');
// futura-pt comes from the product's Typekit kit, which only serves the product's own
// domains. Give it the closest local faces (Futura ships with macOS) and a sans fallback,
// so the drawer's name line never drops to a serif default.
const productFonts = productTrimmed.replace(/font-family:\s*futura-pt\s*;/g,
    'font-family: futura-pt, Futura, "Avenir Next", "Century Gothic", ui-sans-serif, system-ui, sans-serif;');
const css = `${BRAND_FONTS}\n${materialCss}\n${productFonts}\n${REPLICA_ADDITIONS}`;
const remoteUrls = [...css.matchAll(/url\(\s*["']?(https?:[^"')]+)/g)].map((m) => m[1]);
if (remoteUrls.length) console.warn(`remote url() left in dashboard.css:\n  ${[...new Set(remoteUrls)].join('\n  ')}`);
fs.writeFileSync(path.join(DEMO, 'dashboard.css'), css);

// ---------------------------------------------------------------------------
// 5. The screens.
// ---------------------------------------------------------------------------
const attrs = (obj) => Object.entries(obj).map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`).join('');
for (const [screen, def] of Object.entries(SCREENS)) {
    const [first, ...rest] = def.states;
    const html = `<!DOCTYPE html>
<html lang="en"${attrs(capture.htmlAttrs)}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${def.title} demo | Storyraise</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="dashboard.css?v=${hash(css)}" />
</head>
<!-- Read-only replica of the Storyraise ${def.title} screen with fabricated data for a
     fictional community foundation. Captured from builder ${config.builder.sha.slice(0, 8)} on ${capture.capturedAt.slice(0, 10)}
     by tools/personalization/replica/dashboard. -->
<body${attrs(capture.bodyAttrs)} data-sr-screen="${screen}">
<div id="sr-mount">${transformed[first]}</div>
${rest.map((s) => `<template data-sr-state="${s}">${transformed[s]}</template>`).join('\n')}
<template data-sr-state="${first}">${transformed[first]}</template>
<div id="replica-toast" role="status" aria-live="polite"></div>
<script>
${RUNTIME}
</script>
</body>
</html>
`;
    fs.writeFileSync(path.join(DEMO, `${screen}.html`), html);
    console.log(`${screen}.html: ${(html.length / 1024).toFixed(0)} KB, states ${def.states.join(' ')}`);
}
console.log(`dashboard.css: ${(css.length / 1024).toFixed(0)} KB; symbols (${symbols.length}): ${symbols.join(' ')}`);
