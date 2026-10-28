// Render the deployed Storyraise Send app locally against the frozen fixture and save
// every state the Send screen is built from.
//
//   node replica/send/capture.mjs
//
// States (each rendered by Send's own code):
//   draft       the composer (/?report-id=…): the email Send drafts for the report,
//               with its View the Report button and the Review & send button
//   preview     /send/ step 1, with the "2026 Impact Report donors" list selected,
//               previewing as the first recipient (Emily Wilson)
//   recipients  step 2, the list selected: 6 recipients
//   schedule    step 3
// Firebase is fake-firebase.js (in memory, writes discarded) and every Cloud Function is
// answered from the fixtures, so nothing reaches production.
// Output: .cache/replica/send/capture.json and app-shots/*.png.
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../scripts/lib/identity.mjs';
import { openHarness, SEND_ROOT } from './harness.mjs';
import { CACHE, LIST_ID, LIST_NAME } from './seed.mjs';
import { execFileSync } from 'node:child_process';

const SHOTS = path.join(CACHE, 'app-shots');
fs.mkdirSync(SHOTS, { recursive: true });

// Copied from replica/report/capture-report.mjs (same serialization the report screens use).
const FREEZE = () => {
    const freeze = (doc, depth) => {
        doc.querySelectorAll('input[type=checkbox], input[type=radio]').forEach((el) => {
            if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked');
        });
        doc.querySelectorAll('select').forEach((sel) => Array.from(sel.options).forEach((o) => {
            if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected');
        }));
        doc.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea').forEach((el) => {
            if (el.tagName === 'TEXTAREA') el.textContent = el.value; else el.setAttribute('value', el.value);
        });
        // Whatever does not render in this state is left out of it (each state carries
        // its own markup), which keeps the builder's many closed panels out of the demo.
        const view = doc.defaultView;
        const hidden = Array.from(doc.body.querySelectorAll('*')).filter((el) => {
            if (el.tagName === 'DATALIST') return true;
            // A closed daisyUI drawer is only translated off-screen.
            if (el.matches('.drawer-toggle:not(:checked) ~ .drawer-side')) return true;
            if (el.tagName === 'INPUT' || el.closest('svg, template, select, datalist')) return false;
            const cs = view.getComputedStyle(el);
            if (cs.display === 'none') return true;
            // Closed drawers and modals: hidden, with nothing inside that shows.
            if (cs.visibility === 'hidden') {
                return !Array.from(el.querySelectorAll('*')).some((d) => view.getComputedStyle(d).visibility === 'visible' && view.getComputedStyle(d).display !== 'none');
            }
            return false;
        });
        hidden.forEach((el) => el.setAttribute('data-sr-prune', ''));
        const frames = [];
        const liveFrames = Array.from(doc.querySelectorAll('iframe'));
        liveFrames.forEach((f, i) => f.setAttribute('data-sr-frame-index', String(i)));
        const clone = doc.documentElement.cloneNode(true);
        hidden.forEach((el) => el.removeAttribute('data-sr-prune'));
        clone.querySelectorAll('[data-sr-prune]').forEach((el) => el.remove());
        liveFrames.forEach((f, i) => {
            f.removeAttribute('data-sr-frame-index');
            let inner = null;
            try { inner = f.contentDocument; } catch (e) { inner = null; }
            const cf = clone.querySelector(`iframe[data-sr-frame-index="${i}"]`);
            if (inner && inner.documentElement && depth < 2 && f.getBoundingClientRect().width > 50) {
                frames.push({ index: i, ...freeze(inner, depth + 1), scrollY: inner.defaultView.scrollY, scrollX: inner.defaultView.scrollX });
            } else if (cf) {
                cf.setAttribute('data-sr-frame-dropped', f.src || '');
            }
        });
        clone.querySelectorAll('script, noscript').forEach((s) => s.remove());
        const walker = doc.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
        const comments = [];
        while (walker.nextNode()) comments.push(walker.currentNode);
        comments.forEach((c) => c.remove());
        const sheets = Array.from(doc.styleSheets).map((s) => {
            let text = null;
            try { text = Array.from(s.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { text = null; }
            // CSSOM text drops shorthands written with var() (they serialize as empty
            // longhands), so the build prefers the source: the file for linked sheets, the
            // element's own text for inline ones that nothing inserted rules into.
            const own = !s.href && s.ownerNode ? s.ownerNode.textContent : null;
            return { href: s.href, text, ownText: own, ruleCount: text === null ? null : s.cssRules.length, media: s.media && s.media.mediaText };
        });
        const attrs = (el) => Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]));
        return {
            url: doc.location.href,
            htmlAttrs: attrs(doc.documentElement),
            bodyAttrs: doc.body ? attrs(doc.body) : {},
            head: clone.querySelector('head') ? clone.querySelector('head').innerHTML : '',
            body: clone.querySelector('body') ? clone.querySelector('body').innerHTML : '',
            sheets,
            frames,
            fonts: Array.from(doc.fonts).filter((ff) => ff.status === 'loaded')
                .map((ff) => ({ family: ff.family.replace(/^["']|["']$/g, ''), weight: ff.weight, style: ff.style, unicodeRange: ff.unicodeRange })),
        };
    };
    return freeze(document, 0);
};

// Every rendered string, for the text-parity check.
const TEXTS = () => {
    const out = new Set();
    const walk = (doc) => {
        const w = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
            const n = w.currentNode;
            const t = n.textContent.replace(/\s+/g, ' ').trim();
            if (!t) continue;
            const el = n.parentElement;
            if (!el) continue;
            const cs = doc.defaultView.getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
            if (el.closest('script,style,noscript,datalist,template')) continue;
            // Closed drawers sit translated off the side of the page.
            if (el.closest('.drawer-toggle:not(:checked) ~ .drawer-side')) continue;
            if (r.right <= 0 || r.left >= doc.defaultView.innerWidth) continue;
            out.add(t);
        }
        doc.querySelectorAll('iframe').forEach((f) => { try { if (f.contentDocument && f.contentDocument.body) walk(f.contentDocument); } catch (e) { /* cross-origin */ } });
    };
    walk(document);
    return Array.from(out);
};

// Anchor boxes (viewport coordinates of the top document) for the 2px parity check.
const BOXES = (map) => {
    const firstShown = (doc, css) => Array.from(doc.querySelectorAll(css)).find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !e.closest('.drawer-toggle:not(:checked) ~ .drawer-side');
    }) || null;
    const out = {};
    for (const [id, sel] of Object.entries(map)) {
        let el = null; let offX = 0; let offY = 0;
        if (sel.frame) {
            const f = document.querySelector(sel.frame);
            const fr = f.getBoundingClientRect();
            el = firstShown(f.contentDocument, sel.css);
            offX = fr.left + f.clientLeft; offY = fr.top + f.clientTop;
        } else {
            el = firstShown(document, sel.css);
        }
        if (!el) { out[id] = null; continue; }
        const r = el.getBoundingClientRect();
        out[id] = { x: r.left + offX, y: r.top + offY, w: r.width, h: r.height };
    }
    return out;
};


// Tour anchors are marked on the live page (data-sr-anchor) before it is frozen, so the
// box check and the built markup point at the very same element. A spec is a selector,
// or { text, tag, closest } for things only their label identifies.
const MARK = (spec) => {
    const out = {};
    document.querySelectorAll('[data-sr-anchor]').forEach((el) => el.removeAttribute('data-sr-anchor'));
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    for (const [id, s] of Object.entries(spec)) {
        let el = null;
        if (typeof s === 'string') el = Array.from(document.querySelectorAll(s)).find(shown) || null;
        else {
            const cands = Array.from(document.querySelectorAll(s.tag || '*')).filter((e) => shown(e) && e.textContent.replace(/\s+/g, ' ').trim().includes(s.text))
                .sort((a, b) => a.textContent.length - b.textContent.length);
            el = cands[0] || null;
            if (el && s.closest) el = el.closest(s.closest);
        }
        if (el) el.setAttribute('data-sr-anchor', id);
        out[id] = !!el;
    }
    return out;
};

const ANCHORS = {
    draft: {
        email: '#emailEditorjs',
        'view-button': 'a.custom-button-final',
        'review-send': 'a.nav-link-primary',
    },
    preview: {
        steps: ':has(> .send-step)',
        email: 'iframe.preview-iframe',
        'list-banner': '.list-seed-banner',
        'preview-as': { text: '1 of 6', tag: 'button, div', closest: 'button, [role="button"], .preview-recipient, div' },
    },
    recipients: {
        steps: ':has(> .send-step)',
        recipients: 'section.recipient-pane-selected',
        list: { text: LIST_NAME, tag: 'button' },
    },
    schedule: {
        steps: ':has(> .send-step)',
        schedule: { text: 'Sending now to 6', tag: 'div' },
    },
};

const h = await openHarness();
const { page, seed, log } = h;
const base = h.server.url;
const settle = (ms) => page.waitForTimeout(ms);
const sha = execFileSync('git', ['-C', SEND_ROOT, 'rev-parse', 'HEAD']).toString().trim();
const capture = { capturedAt: new Date().toISOString(), sendSha: sha, viewport: { width: 1440, height: 1100 }, seed: { reportId: seed.reportId, org: seed.org, slug: seed.slug, list: LIST_ID }, states: {} };

// Scrolled containers (the preview stage centres a 1920px email by scrolling it) keep
// their offsets: recorded on the element, re-applied by the runtime after mounting.
const MARK_SCROLL = () => {
    document.querySelectorAll('[data-sr-scroll]').forEach((el) => el.removeAttribute('data-sr-scroll'));
    document.querySelectorAll('body *').forEach((el) => {
        if (el.scrollLeft || el.scrollTop) el.setAttribute('data-sr-scroll', `${el.scrollLeft},${el.scrollTop}`);
    });
    return { x: window.scrollX, y: window.scrollY };
};

async function grab(state) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(300);
    const winScroll = await page.evaluate(MARK_SCROLL);
    if (winScroll.x || winScroll.y) throw new Error(`${state}: window did not scroll to the top (${JSON.stringify(winScroll)})`);
    const marked = await page.evaluate(MARK, ANCHORS[state]);
    const missing = Object.entries(marked).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new Error(`${state}: anchors not found live: ${missing.join(', ')}`);
    const boxSpec = Object.fromEntries(Object.keys(ANCHORS[state]).map((id) => [id, { css: `[data-sr-anchor="${id}"]` }]));
    capture.states[state] = {
        dom: await page.evaluate(FREEZE),
        texts: await page.evaluate(TEXTS),
        boxes: await page.evaluate(BOXES, boxSpec),
        url: page.url(),
    };
    await page.screenshot({ path: path.join(SHOTS, `send-${state}.png`) });
    console.log(`${state}: ${capture.states[state].texts.length} strings, anchors ${Object.keys(ANCHORS[state]).join(' ')}`);
}

// ---- The composer: the email Send drafts for this report ----
await page.goto(`${base}/?report-id=${seed.reportId}&org=${seed.org}`, { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('#emailEditorjs a.custom-button-final'), null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await settle(2500);
await grab('draft');

// ---- /send/: the list link selects all six; the preview renders for the first ----
await page.goto(`${base}/send/?report-id=${seed.reportId}&org=${seed.org}&list=${LIST_ID}`, { waitUntil: 'load' });
await page.waitForFunction(() => {
    const a = document.body._x_dataStack && document.body._x_dataStack[0];
    const f = document.querySelector('iframe.preview-iframe');
    return a && !a.contentLoading && a.email.recipients && a.email.recipients.size === 6 && f && f.contentDocument && /Hi Emily/.test(f.contentDocument.body.textContent);
}, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await settle(2000);
await grab('preview');
for (const [state, step] of [['recipients', 2], ['schedule', 3]]) {
    await page.evaluate((s) => { window.scrollTo(0, 0); document.body._x_dataStack[0].setStep(s); }, step);
    await settle(1500);
    await grab(state);
}

capture.functions = [...new Set(log.functions)];
capture.consoleErrors = log.console;
capture.fakeWrites = await page.evaluate(() => (window.__SR_FAKE_WRITES || []).length);
writeJson(path.join(CACHE, 'capture.json'), capture);
console.log(`functions called: ${capture.functions.join(', ')}`);
console.log(`console errors during capture: ${log.console.length}`);
log.console.slice(0, 6).forEach((e) => console.log('  ', e));
await h.close();
