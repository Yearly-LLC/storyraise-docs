// Render the real builder and web preview locally against the frozen fixtures and save
// every state the Collect stories report screens are built from.
//
//   node replica/report/capture-report.mjs
//
// The product's own code renders each state: report.js expands both repeaters for each
// ?for= recipient (funds row by fund_id, then that fund's stories), and the builder's own
// Vue/GrapesJS fill Use Data > Repeat For Each Item in... from the selected repeater. Firebase is fake-firebase.js (in memory,
// writes discarded) and Cloud Functions are stubbed, so nothing reaches production.
// Output: .cache/replica/report/capture.json and app-shots/*.png.
import fs from 'node:fs';
import path from 'node:path';
import { config, writeJson } from '../../scripts/lib/identity.mjs';
import { openHarness } from './harness.mjs';
import { CACHE, constituentId } from './seed.mjs';

const SHOTS = path.join(CACHE, 'app-shots');
fs.mkdirSync(SHOTS, { recursive: true });

// Serialize a document as it renders now: form state mirrored into attributes, scripts
// dropped, every same-origin iframe frozen recursively, stylesheets listed (CSSOM text
// for inline/same-origin sheets so rules inserted at runtime survive).
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
        // Scrolled panels (the Blocks list) keep their position in the demo.
        const scrolled = Array.from(doc.body.querySelectorAll('*')).filter((el) => el.scrollTop > 0);
        scrolled.forEach((el) => el.setAttribute('data-sr-scroll-top', String(el.scrollTop)));
        const frames = [];
        const liveFrames = Array.from(doc.querySelectorAll('iframe'));
        liveFrames.forEach((f, i) => f.setAttribute('data-sr-frame-index', String(i)));
        const clone = doc.documentElement.cloneNode(true);
        hidden.forEach((el) => el.removeAttribute('data-sr-prune'));
        scrolled.forEach((el) => el.removeAttribute('data-sr-scroll-top'));
        clone.querySelectorAll('[data-sr-prune]').forEach((el) => el.remove());
        liveFrames.forEach((f, i) => {
            f.removeAttribute('data-sr-frame-index');
            let inner = null;
            try { inner = f.contentDocument; } catch (e) { inner = null; }
            const cf = clone.querySelector(`iframe[data-sr-frame-index="${i}"]`);
            if (inner && inner.documentElement && depth < 2 && f.getBoundingClientRect().width > 50) {
                frames.push({ index: i, ...freeze(inner, depth + 1), scrollY: inner.defaultView.scrollY, scrollX: inner.defaultView.scrollX, width: inner.defaultView.innerWidth });
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

// Tour anchors are marked on the live page (data-tour on one element, data-tour-part on
// each piece of a multi-element anchor), so the build and the box check need no selectors.
const BOXES = () => {
    const out = {};
    const add = (doc, offX, offY) => {
        const groups = {};
        doc.querySelectorAll('[data-tour], [data-tour-part]').forEach((el) => {
            const id = el.getAttribute('data-tour') || el.getAttribute('data-tour-part');
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return;
            (groups[id] = groups[id] || []).push({ l: r.left + offX, t: r.top + offY, r: r.right + offX, b: r.bottom + offY });
        });
        for (const [id, rs] of Object.entries(groups)) {
            const l = Math.min(...rs.map((x) => x.l)); const t = Math.min(...rs.map((x) => x.t));
            const r = Math.max(...rs.map((x) => x.r)); const b = Math.max(...rs.map((x) => x.b));
            out[id] = { x: l, y: t, w: r - l, h: b - t };
        }
    };
    add(document, 0, 0);
    document.querySelectorAll('iframe').forEach((f) => {
        let d = null; try { d = f.contentDocument; } catch (e) { d = null; }
        if (!d || !d.body) return;
        const fr = f.getBoundingClientRect();
        add(d, fr.left + f.clientLeft, fr.top + f.clientTop);
    });
    return out;
};
const CLEAR_MARKS = () => {
    const clear = (d) => d.querySelectorAll('[data-tour], [data-tour-part]').forEach((el) => { el.removeAttribute('data-tour'); el.removeAttribute('data-tour-part'); });
    clear(document);
    document.querySelectorAll('iframe').forEach((f) => { try { if (f.contentDocument) clear(f.contentDocument); } catch (e) { /* ignore */ } });
};

const h = await openHarness({
    stubs: { get_org_email_config: (route, url, json) => json(route, { ok: true, hasDomain: true }) },
});
const { page, seed, log } = h;
const base = h.server.url;
const capture = { capturedAt: new Date().toISOString(), builderSha: config.builder.sha, viewport: config.capture.viewport, seed: { reportId: seed.reportId, pageId: seed.pageId, org: seed.org, slug: seed.slug }, screens: {} };
const settle = (ms) => page.waitForTimeout(ms);
async function snapshot(extra = {}) {
    return { dom: await page.evaluate(FREEZE), texts: await page.evaluate(TEXTS), boxes: await page.evaluate(BOXES), anchors: Object.keys(await page.evaluate(BOXES)), ...extra };
}

// ---------------------------------------------------------------------------
// Preview.
// ---------------------------------------------------------------------------
const preview = { states: {}, checks: {} };
async function openPreview(email, reportId) {
    const forId = email ? constituentId(email) : '';
    await page.goto(`${base}/preview/${forId ? `?for=${forId}` : ''}#/${seed.org}/${reportId}/${seed.pageId}`, { waitUntil: 'commit' }).catch(() => {});
    await page.waitForFunction(() => {
        const vm = document.querySelector('#report-preview-app') && document.querySelector('#report-preview-app').__vue__;
        return vm && vm.report && vm.report.current_page && document.querySelector('#iyqtzf');
    }, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await settle(5000); // repeaters expand 100ms after the page, then images
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(500);
}
// Mark the expanded rows: the funds row carries the fund's columns, each story row a student's.
const MARK_PREVIEW = () => {
    const tour = (el, id) => el && el.setAttribute('data-tour', id);
    tour(document.querySelector('label[for="constituents-drawer"].btn'), 'previewing-as');
    const rows = Array.from(document.querySelectorAll('[data-context]')).map((el) => { let c = {}; try { c = JSON.parse(el.dataset.context); } catch (e) { /* ignore */ } return { el, c }; });
    const fund = rows.find((r) => r.c.fund_name);
    const stories = rows.filter((r) => r.c.student_name);
    if (fund) tour(fund.el.querySelector(':scope > header'), 'fund-update');
    else tour(document.querySelector('#ihoyp > header'), 'fund-update');
    const cards = stories.length ? stories.map((r) => r.el) : Array.from(document.querySelectorAll('#idx0qx'));
    cards.forEach((el, i) => { el.setAttribute('data-tour-part', 'story-cards'); });
    cards.slice(0, 2).forEach((el, i) => {
        // card-N: the whole card; card-N-head: its name, class and major lines.
        el.setAttribute('data-tour-part', 'story-cards');
        const story = el.querySelector(':scope > section') || el;
        Array.from(story.querySelectorAll('h2, h3')).forEach((hd) => hd.setAttribute('data-tour-part', `card-${i + 1}-head`));
    });
    cards.slice(0, 2).forEach((el, i) => {
        // The row is part of story-cards; the card itself (its story block) is card-N.
        // story-N is kept as an alias of card-N (screen.js) for the first tour draft.
        tour(el.querySelector(':scope > section') || el.firstElementChild, `card-${i + 1}`);
    });
    return { fund: fund ? fund.c.fund_id : null, stories: stories.map((r) => r.c.student_name) };
};
const PREVIEW_STATES = [
    // No recipient: report.js never expands repeaters (get_block_data_from_collection runs
    // only once a constituent is loaded), so the reader shows the templates with their tags.
    ['all', '', seed.reportId, { fund: null, stories: [] }],
    // Unfiltered: the stories repeater alone, matching every row (see seed.unfilteredHtml).
    ['unfiltered', 'emily.wilson@harborlights.example', seed.reportIdAll, { fund: null, stories: seed.collect.stories.map((s) => s.student_name) }],
    ['emily', 'emily.wilson@harborlights.example', seed.reportId, { fund: 'F004', stories: ['Sophia Ramirez', 'David Chen'] }],
    ['james', 'james.taylor@harborlights.example', seed.reportId, { fund: 'F002', stories: ['Grace Johnson', 'Marcus Lee'] }],
];
for (const [state, email, reportId, want] of PREVIEW_STATES) {
    await openPreview(email, reportId);
    const got = await page.evaluate(MARK_PREVIEW);
    if (got.fund !== want.fund || got.stories.join('|') !== want.stories.join('|')) {
        throw new Error(`${state}: rendered fund ${got.fund} stories ${got.stories.join(', ')}; expected ${want.fund} ${want.stories.join(', ')}`);
    }
    preview.checks[state] = got;
    preview.states[state] = await snapshot({ docHeight: await page.evaluate(() => document.documentElement.scrollHeight) });
    await page.screenshot({ path: path.join(SHOTS, `preview-${state}.png`) });
    // The first story, scrolled into view, for the box check at depth.
    await page.evaluate(() => { const el = document.querySelector('[data-tour="card-1"]') || document.querySelector('[data-tour-part="story-cards"]'); el.scrollIntoView({ block: 'start' }); });
    await settle(1200);
    preview.states[state].storyScroll = await page.evaluate(() => window.scrollY);
    preview.states[state].storyBoxes = await page.evaluate(BOXES);
    await page.screenshot({ path: path.join(SHOTS, `preview-${state}-story.png`) });
}
capture.screens.preview = preview;
console.log('preview:', JSON.stringify(preview.checks));

// ---------------------------------------------------------------------------
// Builder: the stories repeater's Use Data panel, then the card's tags.
// ---------------------------------------------------------------------------
await page.goto(`${base}/builder/#/${seed.org}/${seed.reportId}/${seed.pageId}`, { waitUntil: 'commit' }).catch(() => {});
await page.waitForFunction(() => {
    const b = document.querySelector('#builder');
    const vm = b && b.__vue__;
    return vm && vm.editor && vm.editor.getWrapper && vm.editor.getWrapper() && vm.editor.getWrapper().find('#idx0qx').length && vm.env.loading === false && Object.keys(vm.collections || {}).length === 2;
}, null, { timeout: 90000 });
await settle(6000);
await page.evaluate(() => {
    const vm = document.querySelector('#builder').__vue__;
    vm.env.is_whats_new_drawer_visible = false;
    vm.env.is_temp_constituen_modal_visible = false;
    vm.env.is_locked = false;
    vm.env.is_canvas_dimmed = false;
});
await settle(800);
const builder = { states: {} };
const MARK_BUILDER = (state) => {
    const tour = (el, id) => el && el.setAttribute('data-tour', id);
    const part = (el, id) => el && el.setAttribute('data-tour-part', id);
    const shown = (sel, root = document) => Array.from(root.querySelectorAll(sel)).filter((e) => e.getBoundingClientRect().height > 0);
    tour(shown('.tabs .tab-variables')[0], 'use-data');
    const traitByLabel = (text) => shown('.gjs-trt-trait').find((t) => (t.querySelector('.gjs-label') || {}).textContent && t.querySelector('.gjs-label').textContent.trim().startsWith(text));
    if (state === 'repeater') {
        tour(traitByLabel('Select a Collection'), 'repeat-collection');
        const col = traitByLabel('Pick a column to check'); const cond = traitByLabel('Select Condition'); const val = traitByLabel('Enter the value to look for');
        [col, cond, val].forEach((t) => part(t, 'repeat-when'));
        part(shown('h3').find((h) => h.textContent.trim().startsWith('Repeat When')), 'repeat-when');
        tour(col && col.querySelector('input'), 'rw-column');
        tour(cond && cond.querySelector('select'), 'rw-condition');
        tour(val && val.querySelector('input'), 'rw-value');
        part(shown('h3').find((h) => h.textContent.trim() === 'Sort and Limit'), 'sort-limit');
        [traitByLabel('Sort by column'), traitByLabel('Limit (max rows'), traitByLabel('Case-insensitive')].forEach((t) => part(t, 'sort-limit'));
        // "Case-insensitive matching" is a label inside its own trait, not a .gjs-label-wrp.
        const ci = shown('.gjs-trt-trait').find((t) => /Case-insensitive matching/.test(t.textContent));
        part(ci, 'sort-limit');
    }
    if (state === 'photo') {
        const card = shown('[data-blocks-filters] .card').find((c) => /Override Media/.test(c.textContent));
        const trait = traitByLabel('Use Media from a Variable');
        part(card, 'override-media'); part(trait, 'override-media');
        tour(trait && trait.querySelector('input'), 'photo-var');
    }
    if (state === 'insert') {
        const block = shown('#blocks .gjs-blocks-c > *').find((b) => /\bRepeater\b/.test(b.textContent));
        tour(block, 'repeater-insert');
    }
    const d = document.querySelector('iframe.gjs-frame').contentDocument;
    tour(d.getElementById('idx0qx'), 'repeater-block');
    tour(d.querySelector('#ik1rq .content'), 'card-tags');
    if (state === 'photo') tour(d.querySelector('#ik1rq .imagery'), 'card-image');
};
async function builderState(name, { select, tab, scrollTo }) {
    await page.evaluate(async ({ select, tab, scrollTo }) => {
        const vm = document.querySelector('#builder').__vue__;
        const ed = vm.editor;
        if (select) ed.select(ed.getWrapper().find(`#${select}`)[0]); else ed.select();
        await new Promise((r) => setTimeout(r, 400));
        vm.render_blocks(tab);
        await new Promise((r) => setTimeout(r, 400));
        if (tab === 'scenes') {
            // The Blocks list, scrolled so the Repeater block is in view.
            const block = Array.from(document.querySelectorAll('#blocks .gjs-blocks-c > *')).find((b) => /\bRepeater\b/.test(b.textContent));
            if (block) block.scrollIntoView({ block: 'center' });
        }
        const win = ed.Canvas.getWindow();
        const target = ed.Canvas.getDocument().getElementById(scrollTo || select);
        win.scrollTo(0, Math.max(0, target.getBoundingClientRect().top + win.scrollY - 24));
        await new Promise((r) => setTimeout(r, 300));
        ed.refresh();
    }, { select, tab, scrollTo });
    await settle(1500);
    await page.evaluate(CLEAR_MARKS);
    await page.evaluate(MARK_BUILDER, name);
    builder.states[name] = await snapshot({
        scrollTo: scrollTo || select,
        scrollOffset: await page.evaluate((id) => document.querySelector('iframe.gjs-frame').contentDocument.getElementById(id).getBoundingClientRect().top, scrollTo || select),
        mediaVar: await page.evaluate(() => { const i = document.querySelector('[data-tour="photo-var"]'); return i ? i.value : null; }),
        panel: await page.evaluate(() => {
            const vm = document.querySelector('#builder').__vue__;
            return { tab: vm.current_block.type, type: vm.env.selected_component_type, attrs: { ...vm.collection_attributes } };
        }),
    });
    await page.screenshot({ path: path.join(SHOTS, `builder-${name}.png`) });
}
await builderState('repeater', { select: 'idx0qx', tab: 'variables' });
const a = builder.states.repeater.panel.attrs;
if (a.target !== '-HLScholarshipStories' || a.field !== 'fund_id' || a.condition !== '===' || a.value !== '@@fund_reference@@') throw new Error(`builder repeater: Repeat When reads ${JSON.stringify(a)}`);
// The card container, so the selection badge sits on the card's edge, not on its text.
await builderState('card', { select: 'ik1rq', tab: 'elements', scrollTo: 'idx0qx' });
// The card's image comes from the row: Use Data > Override Media on the story block.
await builderState('photo', { select: 'ik1rq', tab: 'variables', scrollTo: 'idx0qx' });
if (builder.states.photo.mediaVar !== '@@student_photo@@') throw new Error(`photo: Use Media from a Variable reads ${builder.states.photo.mediaVar}`);
// Adding a repeater: nothing selected, the Blocks list showing the Repeater block.
await builderState('insert', { select: null, tab: 'scenes', scrollTo: 'ifmuda' });
if (!builder.states.insert.anchors.includes('repeater-insert')) throw new Error('insert: no Repeater block in the Blocks list');
capture.screens.builder = builder;
console.log('builder:', Object.entries(builder.states).map(([k, v]) => `${k}=${v.panel.type}/${v.panel.tab} [${v.anchors.join(' ')}]`).join('  '));

capture.functions = log.functions;
capture.consoleErrors = log.console;
writeJson(path.join(CACHE, 'capture.json'), capture);
const kb = (o) => `${(JSON.stringify(o).length / 1024).toFixed(0)} KB`;
console.log(`capture.json: preview ${kb(preview)}, builder ${kb(builder)}`);
console.log(`functions called: ${[...new Set(log.functions)].join(', ')}`);
await h.close();
