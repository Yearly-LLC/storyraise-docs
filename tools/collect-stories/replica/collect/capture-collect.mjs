// Render the real Collect app (storyraise-collect worktree) locally against the frozen
// fixture and save every state the Collect screens are built from.
//
//   node replica/collect/capture-collect.mjs
//
// The product's own Vue renders each state: the collections list, the "What do you want
// to collect?" picker, the form editor and its field editor, the "Your form link." modal,
// the public form filled in as a student, and the response grid with its row drawer.
// Firebase is the in-memory fake (writes discarded) and Cloud Functions are stubbed, so
// nothing reaches production. Output: .cache/replica/collect/capture.json + app-shots/.
import fs from 'node:fs';
import path from 'node:path';
import { config, writeJson } from '../../scripts/lib/identity.mjs';
import { CACHE, openHarness } from './harness.mjs';

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

/*
    Anchors are marked on the live page first (data-sr-anchor), by selector or by the
    visible text of a label or button, so the capture's boxes and the build's data-tour
    attributes come from the same element.
*/
const MARK = (map) => {
    document.querySelectorAll('[data-sr-anchor]').forEach((el) => el.removeAttribute('data-sr-anchor'));
    document.querySelectorAll('[data-sr-anchor-also]').forEach((el) => el.removeAttribute('data-sr-anchor-also'));
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    // Visible words only: icon ligatures (the info tooltips, arrows) are not text.
    const text = (el) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('.material-symbols-outlined, .material-icons').forEach((i) => i.remove());
        return c.textContent.replace(/\s+/g, ' ').trim();
    };
    const missing = [];
    for (const [id, spec] of Object.entries(map)) {
        let el = null;
        if (spec.css) el = Array.from(document.querySelectorAll(spec.css)).find(shown) || null;
        if (spec.text) {
            const scope = spec.within ? document.querySelector(spec.within) : document;
            el = scope && Array.from(scope.querySelectorAll(spec.tag || 'button, a, label')).filter(shown)
                .find((e) => (spec.exact ? text(e) === spec.text : text(e).includes(spec.text))) || null;
        }
        if (el && spec.up) el = el.closest(spec.up) || (spec.up === 'parent' ? el.parentElement : null) || el;
        if (el && spec.parent) el = el.parentElement;
        if (el) el.setAttribute('data-sr-anchor', id); else missing.push(id);
        // More elements of the same stop (a column's cells under its header): one box.
        if (el && spec.also) document.querySelectorAll(spec.also).forEach((a) => { if (shown(a)) a.setAttribute('data-sr-anchor-also', id); });
    }
    return missing;
};
const ANCHOR_BOXES = (ids) => Object.fromEntries(ids.map((id) => {
    const els = [...document.querySelectorAll(`[data-sr-anchor="${id}"], [data-sr-anchor-also="${id}"]`)];
    if (!els.length) return [id, null];
    const rs = els.map((e) => e.getBoundingClientRect());
    const x = Math.min(...rs.map((r) => r.left)); const y = Math.min(...rs.map((r) => r.top));
    return [id, { x, y, w: Math.max(...rs.map((r) => r.right)) - x, h: Math.max(...rs.map((r) => r.bottom)) - y }];
}));

const h = await openHarness({
    stubs: {
        // Any AI call answers empty; the "Dynamic Link" path is never pressed.
        gpt_chat_completion: (route, url, json) => json(route, { choices: [{ message: { content: '' } }] }),
    },
});
const { page, seed, log } = h;
const base = h.server.url;
const settle = (ms) => page.waitForTimeout(ms);
const capture = { capturedAt: new Date().toISOString(), collectSha: config.builder.collect_sha, viewport: config.capture.viewport, origin: base, seed: { org: seed.org, storiesId: seed.storiesId, newId: seed.newId }, screens: {} };

// A hash change on the same page keeps the app's router state, so each route loads fresh.
async function open(route, ready) {
    await page.goto('about:blank');
    await page.goto(`${base}${route}`, { waitUntil: 'load' });
    await page.waitForFunction(ready, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await settle(1500);
}
const vm = (fn, arg) => page.evaluate(new Function('arg', `const vm = document.querySelector('#app').__vue__; return (${fn})(vm, arg);`), arg);

async function snap(screen, state, anchors, { shot } = {}) {
    const missing = await page.evaluate(MARK, anchors);
    if (missing.length) throw new Error(`${screen}/${state}: anchors not found live: ${missing.join(', ')}`);
    // Inner scrollers (the public form scrolls inside the app, not the window) keep their
    // position: screen.js restores data-sr-scroll-top after mounting the state.
    await page.evaluate(() => {
        document.querySelectorAll('[data-sr-scroll-top]').forEach((el) => el.removeAttribute('data-sr-scroll-top'));
        document.querySelectorAll('body *').forEach((el) => { if (el.scrollTop > 0) el.setAttribute('data-sr-scroll-top', String(Math.round(el.scrollTop))); });
    });
    const entry = {
        dom: await page.evaluate(FREEZE),
        texts: await page.evaluate(TEXTS),
        boxes: await page.evaluate(ANCHOR_BOXES, Object.keys(anchors)),
        scrollY: await page.evaluate(() => window.scrollY),
    };
    capture.screens[screen] = capture.screens[screen] || { states: {} };
    capture.screens[screen].states[state] = entry;
    await page.screenshot({ path: path.join(SHOTS, `${screen}-${state}.png`) });
    if (shot) await page.locator(shot).screenshot({ path: path.join(SHOTS, `${screen}-${state}-box.png`) });
    console.log(`${screen}/${state}: ${Object.keys(anchors).join(' ')} | ${entry.texts.length} strings`);
}

// ---------------------------------------------------------------------------
// 1. Start a collection: the list, then the picker.
// ---------------------------------------------------------------------------
await open(`/index.html#/${seed.org}`, () => document.querySelectorAll('#app [data-ui-loaded="true"], #app').length && document.body.textContent.includes('Scholarship Funds'));
await snap('collect-new', 'list', { 'start-new': { text: 'Start new collection', tag: 'a' } });
await open(`/compose/index.html#/${seed.org}/${seed.newId}`, () => document.querySelector('[data-message-templates] a'));
await page.locator('[data-message-templates] a', { hasText: 'Thank-yous' }).click();
await settle(600);
if (!(await vm((v) => v.message.type && v.message.type.slug))) throw new Error('picker: no type selected');
await snap('collect-new', 'types', {
    types: { css: '[data-message-templates]' },
    'type-thanks': { css: '[data-message-templates] a.selected' },
});

// ---------------------------------------------------------------------------
// 2. The form editor, its field editor, and 3. the form link modal.
// ---------------------------------------------------------------------------
const PALETTE = '[data-message-builder="sidebar"]';
const palette = {
    'f-short': { text: 'Short text', tag: '[data-fields] button', within: PALETTE },
    'f-long': { text: 'Long text', tag: '[data-fields] button', within: PALETTE },
    'f-upload': { text: 'File upload', tag: '[data-fields] button', within: PALETTE },
};
await open(`/compose/index.html#/${seed.org}/${seed.storiesId}`, () => document.querySelectorAll('[data-message-builder="main-2"] [data-form-item]').length >= 7);
await snap('collect-editor', 'form', {
    'add-fields': { css: `${PALETTE} [data-fields]` },
    ...palette,
    'get-link': { text: 'Get form link', tag: 'button', within: PALETTE },
});
const fieldIndex = (name) => seed.fields.findIndex((f) => f.name === name);
const editor = { text: 'Label', tag: 'label', within: PALETTE, exact: true, up: 'div[style*="margin-top: 1rem"]' };
await vm((v, i) => { v.selected_form_item = i; }, fieldIndex('student_note'));
await settle(900);
await snap('collect-editor', 'field', {
    'field-editor': editor,
    'save-variable': { text: 'Save to Variable', tag: 'label', within: PALETTE, parent: true },
    ...palette,
});
await vm((v, i) => { v.selected_form_item = i; }, fieldIndex('fund_id'));
await settle(900);
const fundName = await vm((v) => v.message.project_data.source.json[v.selected_form_item].name);
if (fundName !== 'fund_id') throw new Error(`fund field saves to ${fundName}`);
await snap('collect-editor', 'fund', {
    'field-editor': editor,
    'save-variable': { text: 'Save to Variable', tag: 'label', within: PALETTE, parent: true },
    'fund-field': { text: 'Your scholarship fund code', tag: '[data-message-builder="main-2"] [data-form-item]' },
    ...palette,
});
await vm((v, i) => { v.selected_form_item = i; }, fieldIndex('student_photo'));
await settle(900);
const accept = await vm((v) => v.message.project_data.source.json[v.selected_form_item].accept);
if (accept !== 'image/*') throw new Error(`photo field accept is ${accept}`);
await snap('collect-editor', 'upload', {
    'field-editor': editor,
    'allowed-types': { text: 'Allowed File Types', tag: 'label', within: PALETTE, parent: true },
    ...palette,
});
await vm((v) => { v.selected_form_item = null; });
await settle(500);
await page.locator(`${PALETTE} button`, { hasText: 'Get form link' }).click();
await page.waitForFunction(() => document.getElementById('modal_get_link').open);
await settle(800);
capture.formLink = await page.inputValue('#modal_get_link input[readonly]');
await snap('collect-link', 'link', {
    'standard-link': { css: '#modal_get_link input[readonly]' },
    'copy-link': { text: 'Copy form link', tag: 'button', within: '#modal_get_link' },
}, { shot: '#modal_get_link .modal-box' });

// ---------------------------------------------------------------------------
// 4. The public form, filled in as Sophia Ramirez.
// ---------------------------------------------------------------------------
const sophia = seed.stories.find((s) => s.student_name === 'Sophia Ramirez');
await open(`/form/index.html#/${seed.org}/${seed.storiesId}`, () => document.querySelectorAll('[data-form-item] input, [data-form-item] textarea').length >= 6);
// Typed into the form's own model (each control is v-model'd to its field's value).
await vm((v, row) => {
    v.message.project_data.source.json.forEach((f) => { if (f.type !== 'file' && row[f.name] !== undefined) f.value = String(row[f.name]); });
}, sophia);
await settle(400);
await page.evaluate(() => { window.__SR_FAKE_DOWNLOAD_URL = 'https://files.harborlights.example/stories/sophia.jpg'; });
// The photo goes through the form's own upload button and file chooser.
const photoButton = page.locator('[data-form-item]', { hasText: 'A photo of you' }).last().locator('button').first();
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), photoButton.click()]);
await chooser.setFiles(path.join(CACHE, 'img', 'col-sophia.jpg'));
await settle(2500);
await page.evaluate(() => { const d = document.getElementById('modal_loading'); if (d && d.open) d.close(); window.scrollTo(0, 0); });
await settle(500);
await snap('collect-form', 'filled', {
    'form-head': { css: '[data-message-header]' },
    'f-note': { text: 'Your note to the donors', tag: '[data-form-item]' },
    'f-photo': { text: 'A photo of you', tag: '[data-form-item]' },
    submit: { css: 'button[data-submit]' },
});
capture.screens['collect-form'].states.filled.scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
// The upload, with the product's "File added. See it here.", in view.
await page.locator('[data-form-item]', { hasText: 'A photo of you' }).last().evaluate((el) => el.scrollIntoView({ block: 'center' }));
await settle(500);
await snap('collect-form', 'photo', {
    'f-photo': { text: 'A photo of you', tag: '[data-form-item]' },
    submit: { css: 'button[data-submit]' },
});

// ---------------------------------------------------------------------------
// 5. The response grid, and the row drawer for Sophia.
// ---------------------------------------------------------------------------
await open(`/index.html#/${seed.org}/${seed.storiesId}`, () => document.querySelectorAll('revo-grid .rgRow').length >= 5);
const GRID = {
    grid: { css: '#grid-table' },
    toolbar: { text: 'Open form editor', tag: 'button', up: 'parent' },
    'row-1': { css: 'revo-grid revogr-data[type="rgRow"] .rgRow, revo-grid .main-viewport .rgRow' },
    // The fund column, header and cells: what the report's Repeat When matches on.
    'col-fund': { css: 'revo-grid .rgHeaderCell[aria-colindex="1"]', also: 'revo-grid .rgCell[data-rgcol="1"]' },
};
const gridCols = await page.evaluate(() => document.querySelector('revo-grid').columns.map((c) => c.prop));
if (gridCols.slice(0, 4).join() !== 'constituents,fund_id,student_name,major') throw new Error(`grid column order ${gridCols.join()}`);
// Auto-size leaves the narrow headers cut short ("f…", "student_…"). The view options
// that would change that are commented out in this build, so widen the first columns the
// way a person would, by dragging their edges (the grid has resize on).
await page.evaluate(() => {
    const g = document.querySelector('revo-grid');
    const sizes = { fund_id: 110, student_name: 170, major: 170, class_year: 136 };
    // Every other column keeps the width auto-size gave it.
    const was = Object.fromEntries([...g.querySelectorAll('.rgHeaderCell[aria-colindex]')].map((h) => [g.columns[+h.getAttribute('aria-colindex')].prop, Math.round(h.getBoundingClientRect().width)]));
    g.columns = g.columns.map((c) => ({ ...c, size: sizes[c.prop] || was[c.prop], autoSize: false }));
});
await settle(800);
await snap('collect-grid', 'grid', GRID);
const sophiaKey = Object.entries(seed.db.rtdb.collections[seed.storiesId].responses).find(([, r]) => r.student_name === 'Sophia Ramirez')[0];
// Sophia's story is tagged to Emily Wilson, whose fund (F004) pays her scholarship.
const emilyId = h.constituentId('emily.wilson@harborlights.example');
await vm((v, a) => {
    v.selected_message_response = v.message.responses[a.key];
    v.selected_message_response.constituents = [a.id];
    v.is_table_editor_visible = true;
}, { key: sophiaKey, id: emilyId });
await settle(900);
// Assign to... opens, as when a team member tags the story to a donor.
await page.locator('.drawer-side .collapse', { hasText: 'Assign to...' }).locator('input[type="checkbox"]').first().check({ force: true });
await settle(600);
await snap('collect-grid', 'drawer', {
    ...GRID,
    drawer: { css: '.drawer-side > div.bg-base-200' },
    assign: { css: '.drawer-side .collapse.collapse-arrow' },
});

capture.functions = log.functions;
capture.consoleErrors = log.console;
capture.aborted = log.aborted;
capture.fakeWrites = await page.evaluate(() => (window.__SR_FAKE_WRITES || []).length);
writeJson(path.join(CACHE, 'capture.json'), capture);
console.log(`form link: ${capture.formLink}`);
console.log(`functions called: ${[...new Set(log.functions)].join(', ') || 'none'}; aborted: ${log.aborted.length}; console errors: ${log.console.length}`);
log.console.slice(0, 6).forEach((e) => console.log('  ', e.split('\n')[0].slice(0, 160)));
await h.close();
