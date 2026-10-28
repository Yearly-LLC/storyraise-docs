// Turn the Collect capture into five static, read-only demo screens.
//
//   node replica/collect/build-collect.mjs
//
// Reads .cache/replica/collect/capture.json and writes, in collect-stories/demo/:
//   collect-new.html      the collections list, then "What do you want to collect?"
//   collect-editor.html   the form editor; the field editor on the note and on the photo
//   collect-link.html     the "Your form link." modal over the editor
//   collect-form.html     the public form, filled in as Sophia Ramirez
//   collect-grid.html     the response grid, and Sophia's row drawer
//   collect.css           one purged stylesheet for the app screens (they share their CSS)
//   form.css              the public form's own
//   fonts/col-*, img/col-*
// Each state is a <template>; screen.js swaps them. Nothing on the page loads off-site.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import postcss from 'postcss';
import { PurgeCSS } from 'purgecss';
import { DOCS_ROOT, SITE_DIR } from '../../scripts/lib/identity.mjs';
import { CACHE, WORKTREE } from './harness.mjs';
import { LOGO } from './seed.mjs';

const DEMO = path.join(SITE_DIR, 'demo');
const CSS_CACHE = path.join(CACHE, 'css');
const MEDIA_CACHE = path.join(CACHE, 'media');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
export const PUBLIC_ORIGIN = 'https://collect.harborlights.example';
[DEMO, path.join(DEMO, 'fonts'), path.join(DEMO, 'img'), CSS_CACHE, MEDIA_CACHE].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const capture = JSON.parse(fs.readFileSync(path.join(CACHE, 'capture.json'), 'utf8'));
const LOCAL_ORIGIN = capture.origin;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const fail = (m) => { throw new Error(m); };
const isLocal = (u) => u.startsWith(LOCAL_ORIGIN + '/');
// The capture's local origin is the product's collect.storyraise.com; on the demo it is
// the fictional org's own host.
export const renameOrigin = (s) => s.split(LOCAL_ORIGIN).join(PUBLIC_ORIGIN);

// ---------------------------------------------------------------------------
// Fetching (cached), local copies.
// ---------------------------------------------------------------------------
async function fetchBuffer(url) {
    if (isLocal(url)) {
        const file = path.join(WORKTREE, decodeURIComponent(new URL(url).pathname));
        if (!fs.existsSync(file)) return null;
        return fs.readFileSync(file);
    }
    // The brand fonts the app's CSS loads from Storage: the same files ship with the docs site.
    if (/firebasestorage\.googleapis\.com\/.*PPFragment-(TextRegular|GlareExtraBold)\.woff2/.test(url)) {
        const face = url.match(/PPFragment-(TextRegular|GlareExtraBold)/)[0];
        return fs.readFileSync(path.join(DOCS_ROOT, 'assets', 'fonts', `${face}.woff2`));
    }
    if (/firebasestorage\.googleapis\.com|yearly-bv3/.test(url)) return null; // never fetched from production
    // The demo's own media (fixture photos, the org logo), served by the harness.
    if (/^https:\/\/files\.harborlights\.example\//.test(url)) {
        const p = new URL(url).pathname;
        if (p === '/brand/harbor-lights-logo.svg') return LOGO;
        const file = path.join(CACHE, 'img', `col-${path.basename(p)}`);
        return fs.existsSync(file) ? fs.readFileSync(file) : null;
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
    const name = `col-${sha(url)}${ext}`;
    const file = path.join(DEMO, dir, name);
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, buf);
        if (/^\.(jpg|png)$/.test(ext) && buf.length > 400 * 1024) {
            execFileSync('sips', ['-Z', '1200', ...(ext === '.jpg' ? ['-s', 'formatOptions', '80'] : []), file], { stdio: 'ignore' });
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
// Weights are compared as numbers ('normal' is 400), and where one face is declared once
// per format (the Collect app's PPFragment faces: ttf, otf, woff, woff2), only the woff2
// rule is kept.
const normWeight = (w) => String(w || '400').replace(/\s+/g, ' ').replace(/^normal$/, '400').replace(/^bold$/, '700');
function filterFontFaces(css, loaded) {
    const want = new Set(loaded.map((f) => `${f.family}|${normWeight(f.weight)}|${f.style}`.toLowerCase()));
    const root = postcss.parse(css);
    const info = (rule) => {
        const get = (p) => { let v = ''; rule.walkDecls(p, (d) => { v = d.value; }); return v; };
        const family = get('font-family').replace(/^["']|["']$/g, '');
        const key = `${family}|${normWeight(get('font-weight'))}|${get('font-style') || 'normal'}`.toLowerCase();
        return { key, src: get('src'), range: get('unicode-range') };
    };
    const hasWoff2 = new Set();
    root.walkAtRules('font-face', (rule) => { const i = info(rule); if (/\.woff2|format\(['"]?woff2/.test(i.src)) hasWoff2.add(i.key); });
    root.walkAtRules('font-face', (rule) => {
        const i = info(rule);
        const keep = want.has(i.key) && coversLatin(i.range) && (!hasWoff2.has(i.key) || /\.woff2|format\(['"]?woff2/.test(i.src));
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
        have.add(`${fam}|${normWeight(w)}`.toLowerCase());
    });
    let out = '';
    for (const f of loaded) {
        if (/^(Material |PPFragment)/.test(f.family) || have.has(`${f.family}|${normWeight(f.weight)}`.toLowerCase())) continue;
        have.add(`${f.family}|${normWeight(f.weight)}`.toLowerCase());
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
/*
    daisyUI 5 ships CSS nesting (&:has(>input:checked) inside .collapse, and so on).
    PurgeCSS judges each rule's selector on its own, so a nested "&..." rule never
    matches and every open-state rule went: the drawer's "Assign to..." stayed shut.
    Flatten nesting first: & becomes the parent selector, a nested at-rule wraps a copy
    of the parent.
*/
function unnest(css) {
    const root = postcss.parse(css);
    // Split a selector list on top-level commas only (not those inside :is(), :not(), ...).
    const splitList = (sel) => {
        const out = []; let depth = 0; let cur = '';
        for (const ch of sel) {
            if (ch === '(' || ch === '[') depth++;
            else if (ch === ')' || ch === ']') depth--;
            if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
        }
        out.push(cur);
        return out.map((x) => x.trim()).filter(Boolean);
    };
    // Distributed over both lists rather than wrapped in :is(): PurgeCSS drops a rule
    // whose :is() list names any element the page does not have (h1..h6 for one h2).
    const join = (parent, child) => splitList(parent).flatMap((p) => splitList(child)
        .map((c) => (c.includes('&') ? c.replace(/&/g, p) : `${p} ${c}`))).join(',');
    const flatten = (rule) => {
        const after = [];
        rule.each((node) => {
            if (node.type === 'rule') {
                node.selector = join(rule.selector, node.selector);
                after.push(node);
            } else if (node.type === 'atrule' && node.nodes && /^(media|supports|container|layer)$/.test(node.name)) {
                const inner = postcss.rule({ selector: rule.selector });
                node.each((c) => { inner.append(c.clone()); });
                node.removeAll();
                node.append(inner);
                after.push(node);
            }
        });
        after.forEach((n) => n.remove());
        // Insert every child after the parent first, then flatten each in turn, so a
        // node that empties out and is removed never breaks the insertion chain.
        rule.after(after);
        for (const n of after) {
            if (n.type === 'rule') flatten(n);
            else n.each((r) => { if (r.type === 'rule') flatten(r); });
        }
    };
    const tops = [];
    const insideRule = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === 'rule') return true; return false; };
    root.walkRules((rule) => { if (!insideRule(rule) && rule.nodes && rule.nodes.some((n) => n.type === 'rule' || (n.type === 'atrule' && n.nodes))) tops.push(rule); });
    tops.forEach(flatten);
    root.walkRules((rule) => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
    return root.toString();
}
async function purge(css, htmls, extraJs = '', safelist = []) {
    css = unnest(css);
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
        safelist: { standard: [/^modal/, /^drawer/, /^tab-active$/, /^sr-replica/, ...safelist], greedy: [/gjs-/, /collapse/, /drawer/, /modal/] },
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

/** Rename the origin, localise media URLs in attributes and inline styles. */
async function localiseHtml(html) {
    html = renameOrigin(html);
    const urls = new Set();
    for (const m of html.matchAll(/\s(?:src|poster)="(https?:[^"]+)"/g)) urls.add(m[1].replace(/&amp;/g, '&'));
    for (const m of html.matchAll(/url\((?:&quot;|["']?)(https?:[^"')&]+(?:&amp;[^"')&]+)*)(?:&quot;|["']?)\)/g)) urls.add(m[1].replace(/&amp;/g, '&'));
    const map = {};
    for (const u of urls) map[u] = await localise(u.split(PUBLIC_ORIGIN).join(LOCAL_ORIGIN));
    for (const [u, rel] of Object.entries(map)) {
        const esc = u.replace(/&/g, '&amp;');
        html = html.split(esc).join(rel || '').split(u).join(rel || '');
    }
    return html;
}

/*
    Shared transforms: the capture's data-sr-anchor marks become data-tour, controls go
    inert, and the few that move the demo along get an action. Actions are matched by
    selector or by visible label (icon ligatures ignored).
*/
const TRANSFORM = ({ html, actions }) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const root = tpl.content;
    const anchors = [];
    root.querySelectorAll('[data-sr-anchor]').forEach((el) => {
        el.setAttribute('data-tour', el.getAttribute('data-sr-anchor'));
        el.removeAttribute('data-sr-anchor');
        anchors.push(el.getAttribute('data-tour'));
    });
    root.querySelectorAll('[data-sr-anchor-also]').forEach((el) => {
        el.setAttribute('data-tour-also', el.getAttribute('data-sr-anchor-also'));
        el.removeAttribute('data-sr-anchor-also');
    });
    const words = (el) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('.material-symbols-outlined, .material-icons').forEach((i) => i.remove());
        return c.textContent.replace(/\s+/g, ' ').trim();
    };
    for (const a of actions) {
        const els = a.css ? Array.from(root.querySelectorAll(a.css))
            : Array.from(root.querySelectorAll(a.tag || 'a, button, label')).filter((el) => words(el).startsWith(a.text));
        // An action label must not also drive the (inert) control it is for.
        els.forEach((el) => { el.setAttribute('data-sr-action', a.action); el.removeAttribute('for'); });
    }
    root.querySelectorAll('a, button, label, input, select, textarea, [role="button"], .btn, [onclick]').forEach((el) => {
        if (el.closest('[data-sr-action]')) return;
        // No aria-disabled: daisyUI 5 greys out [aria-disabled=true], and these controls
        // must look as they do in the product. The toast (aria-live) says it is read-only.
        el.setAttribute('data-inert', '');
    });
    root.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea').forEach((el) => el.setAttribute('readonly', ''));
    root.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', '#'));
    root.querySelectorAll('[target="_blank"]').forEach((a) => a.removeAttribute('target'));
    root.querySelectorAll('[contenteditable]').forEach((el) => el.setAttribute('contenteditable', 'false'));
    root.querySelectorAll('[draggable]').forEach((el) => el.setAttribute('draggable', 'false'));
    const symbols = new Set();
    let materialIcons = false;
    root.querySelectorAll('.material-symbols-outlined').forEach((el) => symbols.add(el.textContent.trim()));
    root.querySelectorAll('.material-icons').forEach((el) => { if (!el.classList.contains('material-symbols-outlined')) materialIcons = true; symbols.add(el.textContent.trim()); });
    const wrap = document.createElement('div');
    wrap.appendChild(root.cloneNode(true));
    return { html: wrap.innerHTML, anchors, symbols: [...symbols].filter((s) => /^[a-z0-9_]+$/.test(s)), materialIcons };
};

const attrs = (obj, drop = []) => Object.entries(obj || {}).filter(([k]) => !drop.includes(k))
    .map(([k, v]) => ` ${k}="${String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join('');
const SCREEN_JS = fs.readFileSync(new URL('./screen.js', import.meta.url), 'utf8');
const SCREEN_CSS = `
/* ---- Replica additions (not product CSS) ---- */
[data-inert]{cursor:not-allowed}
[data-sr-action]{cursor:pointer}
/* The app's opened <dialog> sits in the top layer; the static copy is an ordinary
   element, so it is held open and centered the same way. */
dialog.modal[open]{position:fixed;inset:0}
#sr-replica-toast{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);opacity:0;pointer-events:none;z-index:2147483000;
  background:#1b2734;color:#fff;border:1px solid #395061;border-radius:.6rem;padding:.6rem 1rem;font:500 .85rem/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .2s,transform .2s}
#sr-replica-toast.is-visible{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion: reduce){#sr-replica-toast{transition:none}}
`;

function pageHtml({ title, screen, cssFile, cssText, dom, templates, defaultState, meta }) {
    return `<!DOCTYPE html>
<html lang="en"${attrs(dom.htmlAttrs, ['lang'])}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | Storyraise Collect</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="${cssFile}?v=${sha(cssText)}" />
</head>
<!-- Read-only replica of Storyraise Collect (${title.toLowerCase()}) with fabricated data for a fictional
     community foundation. Captured from storyraise-collect ${String(capture.collectSha).slice(0, 8)} on ${capture.capturedAt.slice(0, 10)}
     by tools/collect-stories/replica/collect. -->
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
// Screens: states, the anchors each must carry, and what clicks do.
// ---------------------------------------------------------------------------
const formLink = renameOrigin(capture.formLink);
const SCREENS = {
    'collect-new': {
        title: 'New collection', default: 'list', scroll: 'none',
        want: { list: ['start-new'], types: ['types', 'type-thanks'] },
        actions: {
            list: [{ text: 'Start new collection', tag: 'a', action: 'state:types' }],
            types: [{ text: 'Continue', tag: 'button', action: 'navigate:collect-editor' }, { text: 'Collections', tag: 'a', action: 'state:list' }],
        },
    },
    'collect-editor': {
        title: 'Form editor', default: 'form', scroll: 'none',
        want: { form: ['add-fields', 'f-short', 'f-long', 'f-upload', 'get-link'], field: ['field-editor', 'save-variable'], fund: ['field-editor', 'save-variable', 'fund-field'], upload: ['field-editor', 'allowed-types'] },
        actions: {
            '*': [
                { css: 'label.form_item_label[for="f3"]', action: 'state:fund' },
                { css: 'label.form_item_label[for="f5"]', action: 'state:field' },
                { css: 'label.form_item_label[for="f6"]', action: 'state:upload' },
                { text: 'Done editing', tag: 'button', action: 'state:form' },
                { text: 'Get form link', tag: 'button', action: 'navigate:collect-link' },
                { text: 'View form', tag: 'a', action: 'navigate:collect-form' },
            ],
        },
    },
    'collect-link': {
        title: 'Form link', default: 'link', scroll: 'none',
        want: { link: ['standard-link', 'copy-link'] },
        actions: {
            link: [
                { css: '#modal_get_link #close-modal', action: 'navigate:collect-editor' },
                { text: 'Copy form link', tag: '#modal_get_link button', action: 'copy-link' },
                { text: 'View form', tag: '#modal_get_link a', action: 'navigate:collect-form' },
            ],
        },
    },
    'collect-form': {
        // The public form page carries its own styles, which the editor's would override.
        title: 'Form', default: 'filled', scroll: 'window', css: 'form.css',
        want: { filled: ['form-head', 'f-note', 'f-photo', 'submit'], photo: ['f-photo', 'submit'] },
        actions: { '*': [{ css: 'button[data-submit]', action: 'toast:Submitting is turned off in this read-only demo. Sophia\'s story is already in the collection.' }] },
    },
    'collect-grid': {
        title: 'Responses', default: 'grid', scroll: 'none',
        want: { grid: ['grid', 'toolbar', 'row-1', 'col-fund'], drawer: ['drawer', 'assign'] },
        actions: {
            grid: [{ css: 'revo-grid .rgRow', action: 'state:drawer' }, { text: 'Open form editor', tag: 'button', action: 'navigate:collect-editor' }],
            drawer: [{ css: '.drawer-side .drawer-overlay', action: 'state:grid' }, { text: 'Save and Close', tag: 'label', action: 'state:grid' }],
        },
    },
};

const built = {};
const groups = {}; // stylesheet -> { html: [], docs: [], symbols, materialIcons }
for (const [screen, cfg] of Object.entries(SCREENS)) {
    const g = groups[cfg.css || 'collect.css'] ||= { html: [], docs: [], symbols: new Set(), materialIcons: false };
    const sc = capture.screens[screen] || fail(`capture has no ${screen}`);
    built[screen] = {};
    for (const [state, st] of Object.entries(sc.states)) {
        const actions = [...(cfg.actions['*'] || []), ...(cfg.actions[state] || [])];
        const res = await page.evaluate(TRANSFORM, { html: await localiseHtml(st.dom.body), actions });
        const missing = (cfg.want[state] || []).filter((id) => !res.anchors.includes(id));
        if (missing.length) fail(`${screen}/${state}: anchors missing: ${missing.join(', ')}`);
        res.symbols.forEach((s) => g.symbols.add(s));
        g.materialIcons = g.materialIcons || res.materialIcons;
        built[screen][state] = res.html;
        g.html.push(res.html);
        g.docs.push(st.dom);
    }
}

const cssText = {};
for (const [file, g] of Object.entries(groups)) {
    const raw = await collectCss(g.docs);
    const loaded = g.docs.flatMap((d) => d.fonts);
    const faces = filterFontFaces(raw, loaded);
    const purged = await purge(faces + await missingFaces(faces, loaded), g.html, SCREEN_JS, [/^rg/, /^revo/]);
    cssText[file] = `${await iconCss([...g.symbols].sort(), g.materialIcons)}\n${await localiseCssUrls(purged)}\n${SCREEN_CSS}`;
    write(file, cssText[file]);
}

for (const [screen, cfg] of Object.entries(SCREENS)) {
    const states = built[screen];
    const sc = capture.screens[screen];
    write(`${screen}.html`, pageHtml({
        title: cfg.title, screen, cssFile: cfg.css || 'collect.css', cssText: cssText[cfg.css || 'collect.css'], dom: sc.states[cfg.default].dom, defaultState: cfg.default,
        templates: Object.entries(states).map(([s, h]) => `<template data-sr-state="${s}">${h}</template>`).join('\n'),
        // A state captured scrolled (the form's photo) opens at the same place.
        meta: { states: Object.keys(states), scroll: cfg.scroll, links: { link: formLink }, stateScroll: Object.fromEntries(Object.entries(sc.states).filter(([, st]) => st.scrollY).map(([k, st]) => [k, st.scrollY])) },
    }));
}
await browser.close();

const missingMedia = [...localised.entries()].filter(([, v]) => !v).map(([k]) => k);
if (missingMedia.length) console.warn(`media not localised (blanked):\n  ${missingMedia.join('\n  ')}`);
for (const f of [...Object.keys(groups), ...Object.keys(SCREENS).map((s) => `${s}.html`)]) {
    const text = fs.readFileSync(path.join(DEMO, f), 'utf8');
    const remote = [...new Set([...text.matchAll(/(?:url\(\s*["']?|\s(?:src|href|srcset|poster)=")(https?:[^"')\s]+)/g)].map((m) => m[1]))];
    if (remote.length) console.warn(`${f}: remote references left:\n  ${remote.slice(0, 10).join('\n  ')}`);
    if (text.includes('127.0.0.1') || /collect\.storyraise\.com|yearly-bv3/.test(text)) console.warn(`${f}: still names the capture origin or the production project`);
}
console.log(`assets: ${localised.size} localised; form link ${formLink}`);
