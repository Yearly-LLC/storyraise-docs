// Turn the report-screen capture into three static, read-only demo screens.
//
//   node replica/report/build-report.mjs
//
// Reads .cache/replica/report/capture.json and writes, in personalization/demo/:
//   preview.html + report.css    the web preview, one state per recipient + the lookup drawer
//   builder.html + builder.css   the builder, Use Data > Show When for each level
//   share.html                   the Share modal over the builder (shares builder.css)
//   canvas.css                   the builder canvas document (loaded inside its srcdoc iframe)
//   fonts/rep-*, img/rep-*       every font and image, local
// Each state is a <template>; screen.js swaps them. Nothing on the page loads off-site.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import postcss from 'postcss';
import { PurgeCSS } from 'purgecss';
import { config, SITE_DIR } from '../../scripts/lib/identity.mjs';
import { BUILDER_PATH, CACHE } from './seed.mjs';

const DEMO = path.join(SITE_DIR, 'demo');
const PUBLIC = path.join(BUILDER_PATH, 'public');
const CSS_CACHE = path.join(CACHE, 'css');
const MEDIA_CACHE = path.join(CACHE, 'media');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const LINK_HOST = config.identity.link_host;
const PROD_HOST = `${config.identity.org_slug}.yearly.report`;
[DEMO, path.join(DEMO, 'fonts'), path.join(DEMO, 'img'), CSS_CACHE, MEDIA_CACHE].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const capture = JSON.parse(fs.readFileSync(path.join(CACHE, 'capture.json'), 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const fail = (m) => { throw new Error(m); };
const isLocal = (u) => /^https?:\/\/127\.0\.0\.1:\d+\//.test(u);

// ---------------------------------------------------------------------------
// Fetching (cached), local copies.
// ---------------------------------------------------------------------------
async function fetchBuffer(url) {
    if (isLocal(url)) {
        const file = path.join(PUBLIC, decodeURIComponent(new URL(url).pathname));
        if (!fs.existsSync(file)) return null;
        return fs.readFileSync(file);
    }
    const cached = path.join(MEDIA_CACHE, sha(url));
    if (fs.existsSync(cached)) return fs.readFileSync(cached);
    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) { console.warn(`  fetch ${resp.status}: ${url.slice(0, 120)}`); return null; }
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(cached, buf);
    return buf;
}
async function fetchText(url) {
    const b = await fetchBuffer(url);
    return b ? b.toString('utf8') : null;
}
const sniffExt = (buf, url) => {
    const h = buf.subarray(0, 12).toString('hex');
    if (h.startsWith('ffd8ff')) return '.jpg';
    if (h.startsWith('89504e47')) return '.png';
    if (h.startsWith('47494638')) return '.gif';
    if (h.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP') return '.webp';
    if (buf.subarray(0, 4).toString() === 'wOF2') return '.woff2';
    if (buf.subarray(0, 4).toString() === 'wOFF') return '.woff';
    if (/<svg[\s>]/.test(buf.subarray(0, 400).toString())) return '.svg';
    if (h.startsWith('0001000000') || buf.subarray(0, 4).toString() === 'OTTO') return '.ttf';
    const m = new URL(url).pathname.match(/\.(\w{2,5})$/);
    return m ? `.${m[1].toLowerCase()}` : '.bin';
};
const localised = new Map();
/** Copy a remote/local asset into demo/img or demo/fonts; returns the page-relative path. */
async function localise(url) {
    if (!/^https?:/.test(url)) return url;
    if (localised.has(url)) return localised.get(url);
    const buf = await fetchBuffer(url);
    if (!buf) { localised.set(url, null); return null; }
    const ext = sniffExt(buf, url);
    const dir = /^\.(woff2?|ttf|otf)$/.test(ext) ? 'fonts' : 'img';
    const name = `rep-${sha(url)}${ext}`;
    const file = path.join(DEMO, dir, name);
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, buf);
        // Full-size Unsplash originals run 2-3 MB; the screens never show them wider than 1600px.
        if (/^\.(jpg|png)$/.test(ext) && buf.length > 400 * 1024) {
            execFileSync('sips', ['-Z', '1600', ...(ext === '.jpg' ? ['-s', 'formatOptions', '80'] : []), file], { stdio: 'ignore' });
        }
    }
    const rel = `${dir}/${name}`;
    localised.set(url, rel);
    return rel;
}

// ---------------------------------------------------------------------------
// Stylesheets: CSSOM text for same-origin/inline sheets, fetched text for the rest.
// ---------------------------------------------------------------------------
// Icon fonts come back below, subset to what the screens use.
const SKIP_SHEET = /fonts\.googleapis\.com\/(icon|css2\?family=Material)|materialdesignicons|font-awesome|calendly|tourguide|quill|splitting|use\.typekit/;
async function sheetText(sheet, docUrl) {
    const base = sheet.href || docUrl;
    let text = sheet.text;
    if (sheet.href) {
        // Linked sheets come from source (CSSOM loses var() shorthands).
        text = null;
    } else if (sheet.ownText && postcss.parse(sheet.ownText).nodes.filter((n) => n.type !== 'comment').length >= (sheet.ruleCount || 0)) {
        text = sheet.ownText;
    }
    if (text === null) {
        if (!sheet.href) return '';
        if (SKIP_SHEET.test(sheet.href)) return '';
        const cached = path.join(CSS_CACHE, `${sha(sheet.href)}.css`);
        if (fs.existsSync(cached)) text = fs.readFileSync(cached, 'utf8');
        else { text = await fetchText(sheet.href); if (text === null) fail(`stylesheet fetch failed: ${sheet.href}`); fs.writeFileSync(cached, text); }
    } else if (sheet.href && SKIP_SHEET.test(sheet.href)) {
        return '';
    }
    // Absolute url()s, so localisation has one form to deal with.
    text = text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
        if (/^(data:|#|about:)/.test(u)) return m;
        try { return `url("${new URL(u, base).href}")`; } catch (e) { return m; }
    });
    text = await inlineImports(text, 0);
    if (sheet.media && sheet.media !== 'all' && sheet.media !== '') text = `@media ${sheet.media}{\n${text}\n}`;
    return text;
}
// @import pulls whole libraries in (report-base.css imports Tailwind and daisyUI), so
// fold every import into the sheet before purging. URLs are already absolute here.
async function inlineImports(text, depth) {
    const re = /@import\s+(?:url\(\s*["']?([^"')]+)["']?\s*\)|["']([^"']+)["'])\s*([^;]*);/g;
    const found = [...text.matchAll(re)];
    for (const m of found) {
        const url = m[1] || m[2];
        const media = (m[3] || '').trim();
        let inner = '';
        if (depth < 4 && !SKIP_SHEET.test(url)) {
            const cached = path.join(CSS_CACHE, `${sha(url)}.css`);
            if (fs.existsSync(cached)) inner = fs.readFileSync(cached, 'utf8');
            else { inner = (await fetchText(url)) || ''; fs.writeFileSync(cached, inner); }
            inner = inner.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (mm, q, u) => {
                if (/^(data:|#|about:)/.test(u)) return mm;
                try { return `url("${new URL(u, url).href}")`; } catch (e) { return mm; }
            });
            inner = await inlineImports(inner, depth + 1);
            if (media && media !== 'all') inner = `@media ${media}{\n${inner}\n}`;
        }
        text = text.replace(m[0], () => inner);
    }
    return text;
}
async function collectCss(docs) {
    const seen = new Set();
    const parts = [];
    for (const d of docs) {
        for (const s of d.sheets) {
            const key = s.href || sha(s.text || '');
            if (seen.has(key)) continue;
            seen.add(key);
            parts.push(await sheetText(s, d.url));
        }
    }
    return parts.join('\n');
}

// Keep only the @font-face rules for faces the live page actually loaded, latin subset.
const coversLatin = (range) => {
    if (!range) return true;
    return range.split(',').some((r) => {
        const m = r.trim().match(/^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/i);
        if (!m) return false;
        const lo = parseInt(m[1].replace(/\?/g, '0'), 16);
        const hi = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'F'), 16);
        return lo <= 0x41 && hi >= 0x41;
    });
};
function filterFontFaces(css, loaded) {
    const want = new Set(loaded.map((f) => `${f.family}|${f.weight}|${f.style}`.toLowerCase()));
    const root = postcss.parse(css);
    root.walkAtRules('font-face', (rule) => {
        const get = (p) => { let v = ''; rule.walkDecls(p, (d) => { v = d.value; }); return v; };
        const family = get('font-family').replace(/^["']|["']$/g, '');
        const weight = get('font-weight') || '400';
        const style = get('font-style') || 'normal';
        const key = `${family}|${weight.replace(/\s+/g, ' ')}|${style}`.toLowerCase();
        const keep = want.has(key) && coversLatin(get('unicode-range'));
        if (!keep) rule.remove();
    });
    return root.toString();
}
// Faces the page added through the FontFace API (no stylesheet carries them): ask
// Google Fonts for the same family and weight.
async function missingFaces(css, loaded) {
    const have = new Set();
    postcss.parse(css).walkAtRules('font-face', (rule) => {
        let fam = ''; let w = '400';
        rule.walkDecls('font-family', (d) => { fam = d.value.replace(/^["']|["']$/g, ''); });
        rule.walkDecls('font-weight', (d) => { w = d.value; });
        have.add(`${fam}|${w}`.toLowerCase());
    });
    let out = '';
    for (const f of loaded) {
        if (/^Material /.test(f.family) || have.has(`${f.family}|${f.weight}`.toLowerCase())) continue;
        have.add(`${f.family}|${f.weight}`.toLowerCase());
        const ital = f.style === 'italic' ? 1 : 0;
        const fam = f.family.replace(/ /g, '+');
        const text = await fetchText(`https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${ital},${f.weight.split(' ')[0]}&display=swap`);
        if (!text) { console.warn(`  no Google face for ${f.family} ${f.weight}`); continue; }
        out += '\n' + text.replace(/url\((https:[^)]+)\)/g, (m, u) => `url("${u}")`);
    }
    return filterFontFaces(out, loaded);
}
async function localiseCssUrls(css) {
    const urls = [...new Set([...css.matchAll(/url\("(https?:[^"]+)"\)/g)].map((m) => m[1]))];
    const map = {};
    for (const u of urls) map[u] = await localise(u);
    return css.replace(/url\("(https?:[^"]+)"\)/g, (m, u) => (map[u] ? `url("${map[u]}")` : 'none'));
}

// Icon fonts, subset to the glyphs in use.
async function iconCss(symbols, hasMaterialIcons) {
    let out = '';
    if (symbols.length) {
        const css = await fetchText('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
            + `&icon_names=${symbols.join(',')}&display=block`);
        out += css;
    }
    if (hasMaterialIcons) out += await fetchText('https://fonts.googleapis.com/icon?family=Material+Icons&display=block');
    out = out.replace(/url\((https:[^)]+)\)/g, (m, u) => `url("${u}")`);
    return localiseCssUrls(out);
}

function extractDetailed(content) {
    const names = new Set(); const values = new Set(); const classes = new Set(); const ids = new Set(); const tags = new Set();
    for (const m of content.matchAll(/<([a-zA-Z][\w-]*)/g)) tags.add(m[1].toLowerCase());
    for (const m of content.matchAll(/\s([:@\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        const name = m[1].toLowerCase();
        const value = (m[2] ?? m[3] ?? m[4] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        names.add(name);
        if (value) { values.add(value); value.split(/\s+/).forEach((v) => v && values.add(v)); }
        if (name === 'class') value.split(/\s+/).forEach((c) => c && classes.add(c));
        if (name === 'id' && value) ids.add(value);
    }
    const undetermined = content.match(/[\w-/:.%@]+(?<!:)/g) || [];
    return { attributes: { names: [...names], values: [...values] }, classes: [...classes], ids: [...ids], tags: [...tags], undetermined };
}
async function purge(css, htmls, extraJs = '', safelist = []) {
    if (process.env.SR_NOPURGE) return css;
    const [res] = await new PurgeCSS().purge({
        // Fragments are wrapped so html/body rules (the report's 14px root) are kept.
        content: [...htmls.map((raw) => ({ raw: /<html[\s>]/.test(raw) ? raw : `<html><head></head><body>${raw}</body></html>`, extension: 'html' })), { raw: extraJs, extension: 'js' }],
        css: [{ raw: css }],
        // Detailed results so attribute selectors ([data-layout="i-t"], which the report
        // CSS is built on) survive; the token regex keeps Tailwind's md:/lg: classes.
        extractors: [{ extensions: ['html'], extractor: extractDetailed }],
        defaultExtractor: (content) => content.match(/[\w-/:.%@]+(?<!:)/g) || [],
        fontFace: false, keyframes: true, variables: false, rejected: false,
        dynamicAttributes: ['data-theme', 'aria-expanded', 'checked', 'open', 'data-merge-hidden'],
        safelist: { standard: [/^modal/, /^drawer/, /^tab-active$/, /^sr-replica/, ...safelist], greedy: [/gjs-/] },
    });
    // Source comments (and license banners) add a third to the size.
    const root = postcss.parse(res.css);
    root.walkComments((c) => c.remove());
    return root.toString();
}

// ---------------------------------------------------------------------------
// Markup: in a headless page, so the DOM API does the work.
// ---------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const page = await browser.newPage();

/** Rename hosts, localise media URLs in attributes and inline styles. */
async function localiseHtml(html, baseUrl) {
    html = html.split(PROD_HOST).join(LINK_HOST);
    // Relative media (../assets/…) resolves against the captured page, then goes local too.
    if (baseUrl) {
        html = html.replace(/(\s(?:src|poster)=")(?!data:|#|https?:|about:)([^"]+)"/g, (m, pre, u) => {
            try { return `${pre}${new URL(u.replace(/&amp;/g, '&'), baseUrl).href}"`; } catch (e) { return m; }
        });
    }
    const urls = new Set();
    for (const m of html.matchAll(/\s(?:src|poster)="(https?:[^"]+)"/g)) urls.add(m[1].replace(/&amp;/g, '&'));
    for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) m[1].split(',').forEach((p) => { const u = p.trim().split(/\s+/)[0]; if (/^https?:/.test(u)) urls.add(u.replace(/&amp;/g, '&')); });
    for (const m of html.matchAll(/url\((?:&quot;|["']?)(https?:[^"')&]+(?:&amp;[^"')&]+)*)(?:&quot;|["']?)\)/g)) urls.add(m[1].replace(/&amp;/g, '&'));
    const map = {};
    for (const u of urls) map[u] = await localise(u);
    for (const [u, rel] of Object.entries(map)) {
        const esc = u.replace(/&/g, '&amp;');
        const to = rel || '';
        html = html.split(esc).join(to).split(u).join(to);
    }
    return html;
}

const RO = 'This is a read-only demo.';
// Markup transforms shared by every screen: inert controls, readonly inputs, tour anchors.
const TRANSFORM = ({ html, anchors, actions, frameAnchors }) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const root = tpl.content;
    const missing = [];
    for (const [id, sel] of Object.entries(anchors)) {
        const el = root.querySelector(sel);
        if (el) el.setAttribute('data-tour', id); else missing.push(id);
    }
    for (const [sel, action] of actions) root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-sr-action', action));
    root.querySelectorAll('a, button, label, input, select, textarea, [role="button"], .btn, [onclick]').forEach((el) => {
        if (el.closest('[data-sr-action]')) return;
        el.setAttribute('data-inert', '');
        el.setAttribute('aria-disabled', 'true');
    });
    root.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea').forEach((el) => el.setAttribute('readonly', ''));
    root.querySelectorAll('a[href]').forEach((a) => { if (!a.closest('[data-sr-action]')) a.setAttribute('href', '#'); });
    root.querySelectorAll('[target="_blank"]').forEach((a) => a.removeAttribute('target'));
    // Frames are rebuilt from their own template by screen.js.
    root.querySelectorAll('iframe[data-sr-frame-dropped]').forEach((f) => { f.removeAttribute('src'); f.setAttribute('srcdoc', ''); });
    root.querySelectorAll('iframe:not([data-sr-frame-dropped])').forEach((f) => { f.removeAttribute('src'); f.setAttribute('data-sr-canvas', ''); });
    root.querySelectorAll('video').forEach((v) => { v.removeAttribute('src'); v.querySelectorAll('source').forEach((s) => s.remove()); v.removeAttribute('autoplay'); v.setAttribute('preload', 'none'); });
    root.querySelectorAll('[contenteditable]').forEach((el) => el.setAttribute('contenteditable', 'false'));
    const symbols = new Set();
    let materialIcons = false;
    root.querySelectorAll('.material-symbols-outlined').forEach((el) => symbols.add(el.textContent.trim()));
    root.querySelectorAll('.material-icons').forEach((el) => { if (!el.classList.contains('material-symbols-outlined')) materialIcons = true; symbols.add(el.textContent.trim()); });
    const wrap = document.createElement('div');
    wrap.appendChild(root.cloneNode(true));
    return { html: wrap.innerHTML, missing, symbols: [...symbols].filter((s) => /^[a-z0-9_]+$/.test(s)), materialIcons };
};
async function transform(html, anchors, actions = []) {
    const res = await page.evaluate(TRANSFORM, { html, anchors, actions });
    if (res.missing.length) fail(`anchors missing: ${res.missing.join(', ')}`);
    return res;
}
async function transformFrame(html, anchors) {
    const res = await page.evaluate(TRANSFORM, { html, anchors, actions: [] });
    if (res.missing.length) fail(`canvas anchors missing: ${res.missing.join(', ')}`);
    return res;
}

const attrs = (obj, drop = []) => Object.entries(obj || {}).filter(([k]) => !drop.includes(k))
    .map(([k, v]) => ` ${k}="${String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join('');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const SCREEN_JS = fs.readFileSync(new URL('./screen.js', import.meta.url), 'utf8');
const SCREEN_CSS = `
/* ---- Replica additions (not product CSS) ---- */
[data-inert]{cursor:not-allowed}
[data-sr-action]{cursor:pointer}
#sr-replica-toast{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;z-index:2147483000;
  background:#1b2734;color:#fff;border:1px solid #395061;border-radius:.6rem;padding:.6rem 1rem;font:500 .85rem/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .2s,transform .2s}
#sr-replica-toast.is-visible{opacity:1;transform:translate(-50%,0)}
/* The selection badge and toolbar were placed for the captured canvas width. */
.sr-canvas-resized .gjs-toolbar,.sr-canvas-resized .gjs-badge,.sr-canvas-resized .gjs-highlighter,.sr-canvas-resized .gjs-resizer-c,.sr-canvas-resized .gjs-offset-v,.sr-canvas-resized .gjs-offset-fixed-v{display:none!important}
@media (prefers-reduced-motion: reduce){#sr-replica-toast{transition:none}}
`;

function pageHtml({ title, screen, cssFile, cssText, dom, templates, defaultState, meta }) {
    return `<!DOCTYPE html>
<html lang="en"${attrs(dom.htmlAttrs, ['lang'])}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | Storyraise</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="${cssFile}?v=${sha(cssText)}" />
</head>
<!-- Read-only replica of the Storyraise ${title.toLowerCase()} with fabricated data for a fictional
     community foundation. Captured from builder ${(capture.builderSha || config.builder.sha).slice(0, 8)}${capture.builderSource ? ` (${capture.builderSource.branch})` : ''} on ${capture.capturedAt.slice(0, 10)}
     by tools/personalization/replica/report. -->
<body${attrs(dom.bodyAttrs)} data-sr-screen="${screen}">
<div id="sr-mount"></div>
${templates}
<div id="sr-replica-toast" role="status" aria-live="polite"></div>
<script id="sr-screen-meta" type="application/json">${JSON.stringify(meta).replace(/</g, '\\u003c')}</script>
<script>${SCREEN_JS.replace('__DEFAULT_STATE__', defaultState)}</script>
</body>
</html>
`;
}

const write = (name, text) => { fs.writeFileSync(path.join(DEMO, name), text); console.log(`  ${name}: ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB`); };

// ---------------------------------------------------------------------------
// 1. Preview.
// ---------------------------------------------------------------------------
console.log('preview');
const P = capture.screens.preview;
const PREVIEW_ANCHORS = {
    'previewing-as': 'label[for="constituents-drawer"].btn',
    greeting: '#ibnu21_dupe',
    'level-section': 'section[data-merge-tag-target="donor_level"]',
    'letter-line': '#izt0l',
};
const people = Object.fromEntries(['emily', 'james'].map((s) => [s, P.checks[s]]));
const previewStates = {};
let symbols = new Set();
let usesMaterialIcons = false;
for (const [state, st] of Object.entries(P.states)) {
    const anchors = { ...PREVIEW_ANCHORS, ...(state === 'lookup' ? { lookup: '#constituent_search' } : {}) };
    const actions = [
        ['label[for="constituents-drawer"].btn', 'open-lookup'],
        ['.drawer-side label[for="constituents-drawer"]', 'close-lookup'],
    ];
    const t = await transform(await localiseHtml(st.dom.body, st.dom.url), anchors, actions);
    // Lookup results: Emily and James switch the preview, the rest explain themselves.
    let html = t.html;
    if (state === 'lookup') {
        html = await page.evaluate((html) => {
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            tpl.content.querySelectorAll('[data-constituents] li a').forEach((a) => {
                const name = a.querySelector('strong').textContent.trim();
                a.removeAttribute('data-inert'); a.removeAttribute('aria-disabled');
                a.setAttribute('data-sr-action', name === 'Emily Wilson' ? 'state:emily' : name === 'James Taylor' ? 'state:james' : 'toast:This demo previews Emily Wilson and James Taylor.');
            });
            const w = document.createElement('div'); w.appendChild(tpl.content.cloneNode(true)); return w.innerHTML;
        }, html);
    }
    t.symbols.forEach((s) => symbols.add(s));
    usesMaterialIcons = usesMaterialIcons || t.materialIcons;
    previewStates[state] = html;
}
{
    const docs = Object.values(P.states).map((s) => s.dom);
    const raw = await collectCss(docs);
    const loaded = docs.flatMap((d) => d.fonts);
    const faces = filterFontFaces(raw, loaded);
    const purged = await purge(faces + await missingFaces(faces, loaded), Object.values(previewStates), SCREEN_JS);
    const css = `${await iconCss([...symbols].sort(), usesMaterialIcons)}\n${await localiseCssUrls(purged)}\n${SCREEN_CSS}`;
    const templates = Object.entries(previewStates).map(([s, h]) => `<template data-sr-state="${s}">${h}</template>`).join('\n');
    write('report.css', css);
    write('preview.html', pageHtml({
        title: 'Web preview', screen: 'preview', cssFile: 'report.css', cssText: css, dom: P.states.emily.dom, templates, defaultState: 'emily',
        meta: { states: Object.keys(previewStates), people, scroll: 'window' },
    }));
}

// ---------------------------------------------------------------------------
// 2. Builder + 3. Share (one stylesheet; the canvas has its own).
// ---------------------------------------------------------------------------
const B = capture.screens.builder;
const S = capture.screens.share;
const BUILDER_ANCHORS = {
    'publish-btn': '[data-ui-top-bar] label[data-tg="7"]',
    'use-data': '.tabs .tab-variables',
    'show-when': '[data-blocks-filters] [data-theme-switcher] .card',
    'sw-variable': '#show-hide input[list="merge_tag_list"]',
    'sw-condition': '#show-hide select',
    'sw-value': '#show-hide input[type="text"]',
};
const CANVAS_ANCHORS = {
    'merge-tags': '#ibnu21_dupe',
    'template-line': '#izt0l',
    'gold-section': '#ipjzh_dupe',
    'silver-section': '#iudpl4_dupe',
    'bronze-section': '#ibzrch_dupe',
};
const SHARE_ANCHORS = {
    platform: '#my-modal-2 + .modal input[list="crm_vendors"]',
    'get-link': '#my-modal-2 + .modal .form-item button.btn',
    'copy-link': '#my-modal-2 + .modal fieldset button.btn-primary',
    'team-toggle': '#my-modal-2 + .modal fieldset input[type="checkbox"]',
    'send-card': '#my-modal-2 + .modal .sr-send',
    'share-btn': '[data-ui-top-bar] label[for="my-modal-2"]',
    'publish-btn': '[data-ui-top-bar] label[data-tg="7"]',
};
symbols = new Set();
usesMaterialIcons = false;
const canvasSymbols = new Set();
const builderTemplates = {};
const shareTemplates = {};
const frameTemplates = {};
const canvasHtmls = [];
const frameDocs = [];
async function buildState(screen, state, st, anchors, actions, scrollTo, scrollOffset) {
    const frame = st.dom.frames[0] || fail(`${screen}/${state}: no canvas frame`);
    const ft = await transformFrame(await localiseHtml(frame.body, frame.url), CANVAS_ANCHORS);
    ft.symbols.forEach((s) => canvasSymbols.add(s));
    canvasHtmls.push(ft.html);
    frameDocs.push(frame);
    const frameKey = `${screen}-${state}`;
    frameTemplates[frameKey] = { html: ft.html, htmlAttrs: frame.htmlAttrs, bodyAttrs: frame.bodyAttrs, scrollY: frame.scrollY, scrollX: frame.scrollX, scrollTo, scrollOffset, width: frame.width };
    const t = await transform(await localiseHtml(st.dom.body, st.dom.url), anchors, actions);
    t.symbols.forEach((s) => symbols.add(s));
    usesMaterialIcons = usesMaterialIcons || t.materialIcons;
    return t.html.replace('data-sr-canvas=""', `data-sr-canvas="${frameKey}"`);
}
// Actions by visible label are set after the transform (selectors cannot match text).
async function labelActions(html, list) {
    return page.evaluate(({ html, list }) => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        for (const [scopeSel, tag, text, action] of list) {
            const scope = scopeSel ? tpl.content.querySelector(scopeSel) : tpl.content;
            if (!scope) continue;
            Array.from(scope.querySelectorAll(tag)).filter((el) => {
                const c = el.cloneNode(true);
                c.querySelectorAll('.material-symbols-outlined, .material-icons').forEach((i) => i.remove());
                return c.textContent.replace(/\s+/g, ' ').trim().startsWith(text);
            }).forEach((el) => {
                el.removeAttribute('data-inert'); el.removeAttribute('aria-disabled'); el.removeAttribute('for'); el.setAttribute('data-sr-action', action);
            });
        }
        const w = document.createElement('div'); w.appendChild(tpl.content.cloneNode(true)); return w.innerHTML;
    }, { html, list });
}
console.log('builder');
for (const [state, st] of Object.entries(B.states)) {
    const anchors = state === 'tags' ? { 'use-data': BUILDER_ANCHORS['use-data'], 'publish-btn': BUILDER_ANCHORS['publish-btn'] } : BUILDER_ANCHORS;
    let html = await buildState('builder', state, st, anchors, [], st.scrollTo, st.scrollOffset);
    html = await labelActions(html, [
        ['[data-ui-top-bar]', 'button, label', 'Preview', 'navigate:preview'],
        ['[data-ui-top-bar]', 'button, label', 'Publish', 'navigate:share'],
        [null, 'a', 'Use Data', state === 'tags' ? 'state:gold' : 'noop'],
    ]);
    builderTemplates[state] = html;
}
console.log('share');
// Before the link there is a platform field; after it, the link, copy, and team box.
const SHARE_BY_STATE = {
    platform: ['platform', 'get-link', 'send-card', 'share-btn', 'publish-btn'],
    link: ['copy-link', 'team-toggle', 'send-card', 'share-btn', 'publish-btn'],
    team: ['copy-link', 'team-toggle', 'send-card', 'share-btn', 'publish-btn'],
};
for (const [state, st] of Object.entries(S.states)) {
    const anchors = Object.fromEntries(SHARE_BY_STATE[state].map((id) => [id, SHARE_ANCHORS[id]]));
    let html = await buildState('share', state, st, anchors, [], S.scrollTo, S.scrollOffset);
    html = await labelActions(html, [
        ['[data-ui-top-bar]', 'label', 'Republish', 'toast:Republish updates the live report. This is a read-only demo.'],
        ['[data-ui-top-bar]', 'label', 'Share', 'noop'],
        ['#my-modal-2 + .modal', 'button', 'Get report link', 'state:link'],
        ['#my-modal-2 + .modal', 'a', 'Get a different link', 'state:platform'],
        ['#my-modal-2 + .modal', 'button', 'Copy link', 'copy-link'],
        ['#my-modal-2 + .modal', 'button', 'Copy team link', 'copy-team'],
        ['#my-modal-2 + .modal', 'label', 'Cancel', 'navigate:builder'],
        ['#my-modal-2 + .modal', 'a', 'Draft the email', 'toast:Draft the email opens Storyraise Send in a new tab. This is a read-only demo.'],
    ]);
    // The team box flips between the two captured links.
    html = await page.evaluate(({ html, state }) => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const box = tpl.content.querySelector('[data-tour="team-toggle"]');
        if (box) { box.removeAttribute('data-inert'); box.removeAttribute('aria-disabled'); box.setAttribute('data-sr-action', state === 'team' ? 'state:link' : 'state:team'); }
        const w = document.createElement('div'); w.appendChild(tpl.content.cloneNode(true)); return w.innerHTML;
    }, { html, state });
    shareTemplates[state] = html;
}
{
    const docs = [...Object.values(B.states), ...Object.values(S.states)].map((s) => s.dom);
    const raw = await collectCss(docs);
    const loaded = docs.flatMap((d) => d.fonts);
    const faces = filterFontFaces(raw, loaded);
    const purged = await purge(faces + await missingFaces(faces, loaded), [...Object.values(builderTemplates), ...Object.values(shareTemplates)], SCREEN_JS);
    const css = `${await iconCss([...symbols].sort(), usesMaterialIcons)}\n${await localiseCssUrls(purged)}\n${SCREEN_CSS}`;
    write('builder.css', css);

    const craw = await collectCss(frameDocs);
    const cloaded = frameDocs.flatMap((d) => d.fonts);
    const cfaces = filterFontFaces(craw, cloaded);
    const cpurged = await purge(cfaces + await missingFaces(cfaces, cloaded), canvasHtmls);
    const ccss = `${await iconCss([...canvasSymbols].sort(), false)}\n${await localiseCssUrls(cpurged)}\n[data-inert]{cursor:default}\n/* The in-canvas selection badge was placed for the captured width. */\nhtml.sr-canvas-resized #sr-badge-host{display:none!important}`;
    write('canvas.css', ccss);

    const frameTpl = (keys) => keys.map((k) => {
        const f = frameTemplates[k];
        return `<template data-sr-frame="${k}" data-scroll-y="${f.scrollY}" data-scroll-to="${f.scrollTo || ''}" data-scroll-offset="${f.scrollOffset ?? 24}" data-frame-width="${f.width || ''}" data-html-attrs="${escAttr(JSON.stringify(f.htmlAttrs))}" data-body-attrs="${escAttr(JSON.stringify(f.bodyAttrs))}">${f.html}</template>`;
    }).join('\n');
    const canvasMeta = { css: `canvas.css?v=${sha(ccss)}` };
    write('builder.html', pageHtml({
        title: 'Builder', screen: 'builder', cssFile: 'builder.css', cssText: css, dom: B.states.gold.dom, defaultState: 'gold',
        templates: Object.entries(builderTemplates).map(([s, h]) => `<template data-sr-state="${s}">${h}</template>`).join('\n') + '\n' + frameTpl(Object.keys(frameTemplates).filter((k) => k.startsWith('builder-'))),
        meta: { states: Object.keys(builderTemplates), canvas: canvasMeta, scroll: 'none', sections: { 'ipjzh_dupe': 'gold', 'iudpl4_dupe': 'silver', 'ibzrch_dupe': 'bronze', 'ibnu21_dupe': 'tags' } },
    }));
    write('share.html', pageHtml({
        title: 'Share', screen: 'share', cssFile: 'builder.css', cssText: css, dom: S.states.platform.dom, defaultState: 'platform',
        templates: Object.entries(shareTemplates).map(([s, h]) => `<template data-sr-state="${s}">${h}</template>`).join('\n') + '\n' + frameTpl(Object.keys(frameTemplates).filter((k) => k.startsWith('share-'))),
        meta: { states: Object.keys(shareTemplates), canvas: canvasMeta, scroll: 'none', links: { link: S.link.split(PROD_HOST).join(LINK_HOST), team: S.teamLink.split(PROD_HOST).join(LINK_HOST) } },
    }));
}
await browser.close();

const missingMedia = [...localised.entries()].filter(([, v]) => !v).map(([k]) => k);
if (missingMedia.length) console.warn(`media not localised (blanked):\n  ${missingMedia.join('\n  ')}`);
for (const f of ['report.css', 'builder.css', 'canvas.css', 'preview.html', 'builder.html', 'share.html']) {
    const text = fs.readFileSync(path.join(DEMO, f), 'utf8');
    const remote = [...new Set([...text.matchAll(/(?:url\(\s*["']?|\s(?:src|href|srcset|poster)=")(https?:[^"')\s]+)/g)].map((m) => m[1]))];
    if (remote.length) console.warn(`${f}: remote references left:\n  ${remote.slice(0, 10).join('\n  ')}`);
}
console.log(`assets: ${localised.size} localised`);
