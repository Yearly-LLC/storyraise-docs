// Render the real builder, web preview, and Share modal locally against the frozen
// fixture and save every state the report screens are built from.
//
//   node replica/report/capture-report.mjs
//
// The product's own code renders each state: report.js runs the merge-tag replacement
// and Show When conditions for each ?for= recipient, and the builder's own Vue/GrapesJS
// fill the Use Data panel and the Share modal. Firebase is fake-firebase.js (in memory,
// writes discarded) and Cloud Functions are stubbed, so nothing reaches production.
// Output: .cache/replica/report/capture.json and app-shots/*.png.
import fs from 'node:fs';
import path from 'node:path';
import { config, writeJson } from '../../scripts/lib/identity.mjs';
import { openHarness } from './harness.mjs';
import { BUILDER_SOURCE, CACHE, constituentId } from './seed.mjs';

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

const h = await openHarness({
    stubs: {
        get_org_email_config: (route, url, json) => json(route, { ok: true, hasDomain: true }),
        // Mailchimp is a known ESP token, so no completion is requested; any other
        // vendor would ask the model. Never let that leave the page.
        gpt_chat_completion: (route, url, json) => json(route, { choices: [{ message: { content: '' } }] }),
    },
});
const { page, seed, log } = h;
const base = h.server.url;
const capture = { capturedAt: new Date().toISOString(), builderSha: BUILDER_SOURCE.sha, builderSource: BUILDER_SOURCE, viewport: config.capture.viewport, seed: { reportId: seed.reportId, pageId: seed.pageId, org: seed.org, slug: seed.slug }, screens: {} };
const settle = (ms) => page.waitForTimeout(ms);

// ---------------------------------------------------------------------------
// Preview: one state per recipient, plus the lookup drawer.
// ---------------------------------------------------------------------------
const PREVIEW_ANCHORS = {
    'previewing-as': { css: 'label[for="constituents-drawer"].btn' },
    greeting: { css: '#ibnu21_dupe' },
    'level-section': { css: 'section[data-merge-tag-target="donor_level"]:not([data-merge-hidden="1"])' },
    lookup: { css: '#constituent_search' },
    'letter-line': { css: '#izt0l' },
};
const LEVEL_IDS = { Gold: 'ipjzh_dupe', Silver: 'iudpl4_dupe', Bronze: 'ibzrch_dupe' };
const preview = { states: {}, checks: {} };
async function openPreview(email) {
    const forId = email ? constituentId(email) : '';
    await page.goto(`${base}/preview/${forId ? `?for=${forId}` : ''}#/${seed.org}/${seed.reportId}/${seed.pageId}`, { waitUntil: 'commit' }).catch(() => {});
    await page.waitForFunction(() => {
        const vm = document.querySelector('#report-preview-app') && document.querySelector('#report-preview-app').__vue__;
        return vm && vm.report && vm.report.current_page && document.querySelector('#ibnu21_dupe');
    }, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await settle(3500);
    // Splitting/counter/scroll-reveal settle; land at the top.
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(500);
}
for (const [state, person] of [['emily', 'emily.wilson@harborlights.example'], ['james', 'james.taylor@harborlights.example']]) {
    await openPreview(person);
    const who = seed.people.find((p) => p.email === person);
    const check = await page.evaluate(({ ids }) => Object.fromEntries(Object.entries(ids).map(([lvl, id]) => {
        const el = document.getElementById(id);
        return [lvl, !!el && getComputedStyle(el).display !== 'none'];
    })), { ids: LEVEL_IDS });
    const visible = Object.entries(check).filter(([, v]) => v).map(([k]) => k);
    if (visible.length !== 1 || visible[0] !== who.donor_level) throw new Error(`${state}: visible levels ${visible.join(',')} (expected ${who.donor_level})`);
    preview.checks[state] = { donor_level: who.donor_level, visible };
    preview.states[state] = {
        dom: await page.evaluate(FREEZE),
        texts: await page.evaluate(TEXTS),
        boxes: await page.evaluate(BOXES, PREVIEW_ANCHORS),
        docHeight: await page.evaluate(() => document.documentElement.scrollHeight),
    };
    await page.screenshot({ path: path.join(SHOTS, `preview-${state}.png`) });
    // The visible level section, scrolled into view, for the box check at depth.
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'start' }), PREVIEW_ANCHORS['level-section'].css);
    await settle(1200);
    preview.states[state].levelScroll = await page.evaluate(() => window.scrollY);
    preview.states[state].levelBoxes = await page.evaluate(BOXES, PREVIEW_ANCHORS);
    await page.screenshot({ path: path.join(SHOTS, `preview-${state}-level.png`) });
}
// Lookup: Emily's preview with the drawer opened by the product's own button.
await openPreview('emily.wilson@harborlights.example');
await page.click('label[for="constituents-drawer"].btn');
await page.waitForFunction(() => document.querySelectorAll('[data-constituents] li').length >= 6, null, { timeout: 15000 });
await settle(800);
preview.states.lookup = {
    dom: await page.evaluate(FREEZE),
    texts: await page.evaluate(TEXTS),
    boxes: await page.evaluate(BOXES, PREVIEW_ANCHORS),
};
await page.screenshot({ path: path.join(SHOTS, 'preview-lookup.png') });
capture.screens.preview = preview;
console.log('preview:', JSON.stringify(preview.checks));

// ---------------------------------------------------------------------------
// Builder: the Intro page on the canvas, Use Data > Show When for each level.
// ---------------------------------------------------------------------------
await page.goto(`${base}/builder/#/${seed.org}/${seed.reportId}/${seed.pageId}`, { waitUntil: 'commit' }).catch(() => {});
await page.waitForFunction(() => {
    const b = document.querySelector('#builder');
    const vm = b && b.__vue__;
    return vm && vm.editor && vm.editor.getWrapper && vm.editor.getWrapper() && vm.editor.getWrapper().find('#ipjzh_dupe').length && vm.env.loading === false;
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

const FRAME = 'iframe.gjs-frame';
const BUILDER_ANCHORS = {
    'merge-tags': { frame: FRAME, css: '#ibnu21_dupe' },
    'template-line': { frame: FRAME, css: '#izt0l' },
    'publish-btn': { css: '[data-ui-top-bar] label[data-tg="7"]' },
    'use-data': { css: '.tabs .tab-variables' },
    'show-when': { css: '[data-blocks-filters] [data-theme-switcher] .card' },
    'sw-variable': { css: '#show-hide input[list="merge_tag_list"]' },
    'sw-condition': { css: '#show-hide select' },
    'sw-value': { css: '#show-hide input[type="text"]' },
    'gold-section': { frame: FRAME, css: '#ipjzh_dupe' },
    'silver-section': { frame: FRAME, css: '#iudpl4_dupe' },
    'bronze-section': { frame: FRAME, css: '#ibzrch_dupe' },
};
const builder = { states: {} };
async function builderState(name, { select, tab, scrollTo }) {
    await page.evaluate(async ({ select, tab, scrollTo }) => {
        const vm = document.querySelector('#builder').__vue__;
        const ed = vm.editor;
        const comp = ed.getWrapper().find(`#${select}`)[0];
        ed.select(comp);
        await new Promise((r) => setTimeout(r, 400));
        vm.render_blocks(tab);
        if (tab === 'variables') vm.update_merge_tag_attr_on_selection();
        const win = ed.Canvas.getWindow();
        const target = ed.Canvas.getDocument().getElementById(scrollTo || select);
        win.scrollTo(0, Math.max(0, target.getBoundingClientRect().top + win.scrollY - 24));
        await new Promise((r) => setTimeout(r, 300));
        ed.refresh();
    }, { select, tab, scrollTo });
    await settle(1500);
    builder.states[name] = {
        scrollTo: scrollTo || select,
        scrollOffset: await page.evaluate((id) => document.querySelector('iframe.gjs-frame').contentDocument.getElementById(id).getBoundingClientRect().top, scrollTo || select),
        dom: await page.evaluate(FREEZE),
        texts: await page.evaluate(TEXTS),
        boxes: await page.evaluate(BOXES, BUILDER_ANCHORS),
        panel: await page.evaluate(() => {
            const vm = document.querySelector('#builder').__vue__;
            return { tab: vm.current_block.type, attrs: { ...vm.merge_tag_attributes } };
        }),
    };
    await page.screenshot({ path: path.join(SHOTS, `builder-${name}.png`) });
}
// Merge tags in text: the "Prepared for" line selected, Edit tab, hero in view.
await builderState('tags', { select: 'ibnu21_dupe', tab: 'elements', scrollTo: 'ieofhp_dupe' });
builder.states.tags.scrollTop = true;
for (const [name, id] of [['gold', 'ipjzh_dupe'], ['silver', 'iudpl4_dupe'], ['bronze', 'ibzrch_dupe']]) {
    await builderState(name, { select: id, tab: 'variables' });
}
for (const [name, lvl] of [['gold', 'Gold'], ['silver', 'Silver'], ['bronze', 'Bronze']]) {
    const a = builder.states[name].panel.attrs;
    if (a.target !== 'donor_level' || a.condition !== '===' || a.value !== lvl) throw new Error(`builder ${name}: Show When reads ${JSON.stringify(a)}`);
}
capture.screens.builder = builder;
console.log('builder:', Object.entries(builder.states).map(([k, v]) => `${k}=${v.panel.tab}:${v.panel.attrs.target || ''}/${v.panel.attrs.value || ''}`).join(' '));

// ---------------------------------------------------------------------------
// Share: the "Share Your Report" modal, over the builder as it stands (Gold selected).
// ---------------------------------------------------------------------------
const SHARE_ANCHORS = {
    platform: { css: '#my-modal-2 + .modal input[list="crm_vendors"]' },
    'get-link': { css: '#my-modal-2 + .modal .form-item button.btn' },
    'copy-link': { css: '#my-modal-2 + .modal fieldset button.btn-primary' },
    'team-toggle': { css: '#my-modal-2 + .modal fieldset input[type="checkbox"]' },
    'send-card': { css: '#my-modal-2 + .modal .sr-send' },
    'share-btn': { css: '[data-ui-top-bar] label[for="my-modal-2"]' },
    'publish-btn': { css: '[data-ui-top-bar] label[data-tg="7"]' },
};
const share = { states: {}, scrollTo: 'ipjzh_dupe' };
// The published report: the toolbar reads Share + Republish ("Publish, then open Share").
await page.goto('about:blank');
await page.goto(`${base}/builder/#/${seed.org}/${seed.reportIdPub}/${seed.pageId}`, { waitUntil: 'commit' }).catch(() => {});
await page.waitForFunction(() => {
    const b = document.querySelector('#builder');
    const vm = b && b.__vue__;
    return vm && vm.editor && vm.editor.getWrapper && vm.editor.getWrapper() && vm.editor.getWrapper().find('#ipjzh_dupe').length && vm.env.loading === false;
}, null, { timeout: 90000 });
await settle(6000);
await page.evaluate(async () => {
    const vm = document.querySelector('#builder').__vue__;
    vm.env.is_whats_new_drawer_visible = false;
    vm.env.is_temp_constituen_modal_visible = false;
    vm.env.is_locked = false;
    vm.env.is_canvas_dimmed = false;
    const ed = vm.editor;
    const win = ed.Canvas.getWindow();
    const target = ed.Canvas.getDocument().getElementById('ipjzh_dupe');
    win.scrollTo(0, Math.max(0, target.getBoundingClientRect().top + win.scrollY - 24));
    await new Promise((r) => setTimeout(r, 800));
});
await settle(800);
if (!(await page.evaluate(() => !!document.querySelector('[data-ui-top-bar] label[for="my-modal-2"]')))) throw new Error('published toolbar: no Share button');
await page.evaluate(async () => {
    const vm = document.querySelector('#builder').__vue__;
    vm.editor.select();
    vm.env.expected_crm_vendor.name = 'Mailchimp';
    vm.env.expected_crm_vendor.video_link = false;
    document.getElementById('my-modal-2').checked = true;
});
await settle(1200);
share.scrollOffset = await page.evaluate(() => document.querySelector('iframe.gjs-frame').contentDocument.getElementById('ipjzh_dupe').getBoundingClientRect().top);
const personalized = await page.evaluate(() => document.querySelector('#builder').__vue__.env.is_report_personalized);
if (!personalized) throw new Error('builder did not flag the report as personalized; the Share modal shows the plain branch');
share.states.platform = { dom: await page.evaluate(FREEZE), texts: await page.evaluate(TEXTS), boxes: await page.evaluate(BOXES, SHARE_ANCHORS) };
await page.locator('#my-modal-2 + .modal .modal-box').screenshot({ path: path.join(SHOTS, 'share-platform.png') });
await page.screenshot({ path: path.join(SHOTS, 'share-platform-full.png') });
// The product's own button produces the link.
await page.locator('#my-modal-2 + .modal button', { hasText: 'Get report link' }).click();
await page.waitForFunction(() => {
    const vm = document.querySelector('#builder').__vue__;
    return vm.env.expected_crm_vendor.video_link && !vm.env.expected_crm_vendor.is_working;
}, null, { timeout: 15000 });
await settle(800);
share.link = await page.evaluate(() => document.querySelector('#builder').__vue__.crm_link());
share.states.link = { dom: await page.evaluate(FREEZE), texts: await page.evaluate(TEXTS), boxes: await page.evaluate(BOXES, SHARE_ANCHORS) };
await page.locator('#my-modal-2 + .modal .modal-box').screenshot({ path: path.join(SHOTS, 'share-link.png') });
await page.screenshot({ path: path.join(SHOTS, 'share-link-full.png') });
// The team box, ticked: the same link with /nr, so staff visits are not recorded.
await page.locator('#my-modal-2 + .modal fieldset input[type="checkbox"]').check();
await settle(600);
share.teamLink = await page.evaluate(() => document.querySelector('#builder').__vue__.crm_link());
share.states.team = { dom: await page.evaluate(FREEZE), texts: await page.evaluate(TEXTS), boxes: await page.evaluate(BOXES, SHARE_ANCHORS) };
await page.locator('#my-modal-2 + .modal .modal-box').screenshot({ path: path.join(SHOTS, 'share-team.png') });
capture.screens.share = share;
console.log('share link:', share.link, '| team:', share.teamLink);

capture.functions = log.functions;
capture.consoleErrors = log.console;
capture.fakeWrites = await page.evaluate(() => (window.__SR_FAKE_WRITES || []).length);
writeJson(path.join(CACHE, 'capture.json'), capture);
const kb = (o) => `${(JSON.stringify(o).length / 1024).toFixed(0)} KB`;
console.log(`capture.json: preview ${kb(preview)}, builder ${kb(builder)}, share ${kb(share)}`);
console.log(`functions called: ${[...new Set(log.functions)].join(', ')}`);
console.log(`console errors during capture: ${log.console.length}`);
await h.close();
