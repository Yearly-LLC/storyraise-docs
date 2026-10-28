// Turn the Send capture into one static, read-only demo screen.
//
//   node replica/send/build.mjs
//
// Reads .cache/replica/send/capture.json and writes, in personalization/demo/:
//   send.html          four states: draft (the composer), preview, recipients, schedule
//   send.css           the /send/ flow's stylesheet (preview, recipients, schedule)
//   send-editor.css    the composer's stylesheet (draft); the runtime enables one at a time
//   fonts/send-*, img/send-*   every font and image, local
// Each state is a <template>; screen.js swaps them and the stylesheet. Nothing loads off-site.
// The fetch/CSS/purge/markup helpers are copied from replica/report/build-report.mjs.
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import postcss from 'postcss';
import { PurgeCSS } from 'purgecss';
import { config, SITE_DIR } from '../../scripts/lib/identity.mjs';
import { SEND_ROOT } from './harness.mjs';
import { CACHE } from './seed.mjs';

const DEMO = path.join(SITE_DIR, 'demo');
const PUBLIC = SEND_ROOT;
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
    const name = `send-${sha(url)}${ext}`;
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
async function localiseHtml(html) {
    html = html.split(PROD_HOST).join(LINK_HOST);
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
@media (prefers-reduced-motion: reduce){#sr-replica-toast{transition:none}}
`;

function pageHtml({ title, screen, sheets, dom, templates, defaultState, meta }) {
    const links = sheets.map((s) => `  <link rel="stylesheet" data-sr-css="${s.key}" href="${s.file}?v=${sha(s.text)}" />`).join('\n');
    return `<!DOCTYPE html>
<html lang="en"${attrs(dom.htmlAttrs, ['lang'])}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | Storyraise</title>
  <meta name="robots" content="noindex" />
${links}
</head>
<!-- Read-only replica of Storyraise Send with fabricated data for a fictional community
     foundation. Captured from deploy-send ${capture.sendSha.slice(0, 8)} (stepper) on ${capture.capturedAt.slice(0, 10)}
     by tools/personalization/replica/send. -->
<body data-sr-screen="${screen}">
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

// ---------------------------------------------------------------------------
// States.
// ---------------------------------------------------------------------------
const STATES = ['draft', 'preview', 'recipients', 'schedule'];
const DOC = { draft: 'editor', preview: 'send', recipients: 'send', schedule: 'send' };
const STEP_OF = { preview: 1, recipients: 2, schedule: 3 };
const built = {};
const symbolsBy = { editor: new Set(), send: new Set() };
const miBy = { editor: false, send: false };

// The preview's email is an iframe whose srcdoc carries its own styles: localise inside it.
async function localiseSrcdoc(html) {
    const docs = await page.evaluate((html) => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        return Array.from(tpl.content.querySelectorAll('iframe[srcdoc]')).map((f) => f.getAttribute('srcdoc'));
    }, html);
    const out = [];
    for (const d of docs) out.push(await localiseHtml(d));
    return page.evaluate(({ html, out }) => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        Array.from(tpl.content.querySelectorAll('iframe[srcdoc]')).forEach((f, i) => {
            // Links inside the email go nowhere in the demo.
            // Links inside the email go nowhere in the demo, and the frame is sandboxed, so
            // any script in it would only log a blocked-execution error.
            f.setAttribute('srcdoc', out[i].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<a\s([^>]*?)href="[^"]*"/g, '<a $1href="#"'));
            f.removeAttribute('data-sr-canvas');
            f.setAttribute('tabindex', '-1');
        });
        const w = document.createElement('div'); w.appendChild(tpl.content.cloneNode(true)); return w.innerHTML;
    }, { html, out });
}

for (const state of STATES) {
    const st = capture.states[state] || fail(`capture has no state ${state}`);
    const anchors = Object.fromEntries(Object.keys(st.boxes).map((id) => [id, `[data-sr-anchor="${id}"]`]));
    let html = await localiseHtml(st.dom.body);
    html = await localiseSrcdoc(html);
    const t = await transform(html, anchors, []);
    html = t.html;
    // The flow can be clicked through: stepper steps, Next/Back, Review & send, Back to editor.
    html = await labelActions(html, [
        [null, 'a', 'Review & send', 'state:preview'],
        [null, 'button', 'Next', STEP_OF[state] ? `state:${['preview', 'recipients', 'schedule', 'info'][STEP_OF[state]]}` : 'noop'],
        // "Back" first: its prefix also matches "Back to editor", which is set after it.
        [null, 'button', 'Back', STEP_OF[state] > 1 ? `state:${['', 'preview', 'recipients', 'schedule'][STEP_OF[state] - 1]}` : 'noop'],
        [null, 'button, a', 'Back to editor', 'state:draft'],
        [null, 'a, button', 'Editor', 'state:draft'],
    ]);
    html = await page.evaluate((html) => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const names = ['preview', 'recipients', 'schedule', 'info'];
        tpl.content.querySelectorAll('.send-step').forEach((el, i) => {
            el.removeAttribute('data-inert'); el.removeAttribute('aria-disabled');
            el.setAttribute('data-sr-action', i < 3 ? `state:${names[i]}` : 'toast:Send info is where you confirm the sender and subject. This is a read-only demo.');
        });
        // The anchor marker is the capture's; the tour reads data-tour.
        tpl.content.querySelectorAll('[data-sr-anchor]').forEach((el) => el.removeAttribute('data-sr-anchor'));
        const w = document.createElement('div'); w.appendChild(tpl.content.cloneNode(true)); return w.innerHTML;
    }, html);
    html = html.split('state:info').join('toast:Send info is where you confirm the sender and subject. This is a read-only demo.');
    t.symbols.forEach((s) => symbolsBy[DOC[state]].add(s));
    miBy[DOC[state]] = miBy[DOC[state]] || t.materialIcons;
    built[state] = html;
}

// Body attributes the product's CSS keys on (class, data-channel, data-no-tabs …); Alpine's
// own directives are dropped.
const bodyOf = (s) => Object.fromEntries(Object.entries(capture.states[s].dom.bodyAttrs || {}).filter(([k]) => !/^(x-|:|@)/.test(k)));
const sheets = [];
for (const [key, file] of [['send', 'send.css'], ['editor', 'send-editor.css']]) {
    const states = STATES.filter((s) => DOC[s] === key);
    const docs = states.map((s) => capture.states[s].dom);
    const raw = await collectCss(docs);
    const loaded = docs.flatMap((d) => d.fonts);
    const faces = filterFontFaces(raw, loaded);
    // The runtime puts each state's body attributes back (body.send-page, data-no-tabs …),
    // so they count as content too.
    const bodies = states.map((s) => `<html${attrs(capture.states[s].dom.htmlAttrs)}><body${attrs(bodyOf(s))}>${built[s]}</body></html>`);
    const purged = await purge(faces + await missingFaces(faces, loaded), bodies, SCREEN_JS, [/^is-/, /^x-/]);
    const css = `${await iconCss([...symbolsBy[key]].sort(), miBy[key])}\n${await localiseCssUrls(purged)}\n${SCREEN_CSS}\n#sr-mount{display:contents}`;
    write(file, css);
    sheets.push({ key, file, text: css });
}
write('send.html', pageHtml({
    title: 'Storyraise Send', screen: 'send', sheets, dom: capture.states.preview.dom, defaultState: 'draft',
    templates: STATES.map((s) => `<template data-sr-state="${s}" data-sr-css="${DOC[s]}">${built[s]}</template>`).join('\n'),
    meta: { states: STATES, body: Object.fromEntries(STATES.map((s) => [s, bodyOf(s)])) },
}));
await browser.close();

const missingMedia = [...localised.entries()].filter(([, v]) => !v).map(([k]) => k);
if (missingMedia.length) console.warn(`media not localised (blanked):\n  ${missingMedia.join('\n  ')}`);
for (const f of ['send.css', 'send-editor.css', 'send.html']) {
    const text = fs.readFileSync(path.join(DEMO, f), 'utf8');
    const remote = [...new Set([...text.matchAll(/(?:url\(\s*["']?|\s(?:src|href|srcset|poster)=")(https?:[^"')\s]+)/g)].map((m) => m[1]))];
    if (remote.length) console.warn(`${f}: remote references left:\n  ${remote.slice(0, 10).join('\n  ')}`);
}
console.log(`assets: ${localised.size} localised`);
