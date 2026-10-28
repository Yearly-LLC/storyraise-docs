// Check the built Collect screens against the live capture.
//
//   node replica/collect/verify-collect.mjs
//
// For every screen and state, at the capture viewport:
//   - each tour anchor's box matches the live app's box within 2px;
//   - every string the live app rendered is rendered by the demo (after the origin rename);
//   - the demo requests nothing off the page and logs no console error;
// then a click-through of the demo's own navigation. Shots: .cache/replica/collect/built-shots/.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, DOCS_ROOT } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';
import { CACHE } from './harness.mjs';

const capture = JSON.parse(fs.readFileSync(path.join(CACHE, 'capture.json'), 'utf8'));
const SHOTS = path.join(CACHE, 'built-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const rename = (s) => s.split(capture.origin).join('https://collect.harborlights.example');
const TOL = 2;

const server = await serveStatic(DOCS_ROOT, 5068);
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const context = await browser.newContext({ viewport: config.capture.viewport, deviceScaleFactor: 1, timezoneId: config.capture.timezone, locale: config.capture.locale, reducedMotion: 'reduce' });
const failures = [];
const summary = [];

const TEXTS = () => {
    const out = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
        const n = w.currentNode;
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        const el = n.parentElement;
        if (!t || !el) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
        if (el.closest('script,style,noscript,datalist,template')) continue;
        out.add(t);
    }
    return Array.from(out);
};
const watch = (page) => {
    const offsite = []; const errors = [];
    page.on('request', (r) => { const u = r.url(); if (!u.startsWith(server.url) && !/^(data|about|blob):/.test(u)) offsite.push(u); });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    return { offsite, errors };
};

for (const [screen, sc] of Object.entries(capture.screens)) {
    const page = await context.newPage();
    const { offsite, errors } = watch(page);
    await page.goto(`${server.url}/collect-stories/demo/${screen}.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SRScreen, null, { timeout: 10000 });
    for (const [state, st] of Object.entries(sc.states)) {
        await page.evaluate(async (s) => { window.scrollTo(0, 0); await window.SRScreen.setState(s); await document.fonts.ready; }, state);
        if (st.scrollY) await page.evaluate((y) => window.scrollTo(0, y), st.scrollY);
        await page.waitForTimeout(400);
        const placed = new Set(await page.evaluate(() => window.SRScreen.getTargets()));
        const built = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
            const r = window.SRScreen.getTargetRect(id);
            return [id, r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null];
        })), Object.keys(st.boxes));
        for (const [id, live] of Object.entries(st.boxes)) {
            if (!live) continue;
            const b = built[id];
            if (!placed.has(id) || !b) { failures.push(`${screen}/${state}: anchor ${id} missing in demo`); continue; }
            const d = Math.max(Math.abs(b.x - live.x), Math.abs(b.y - live.y), Math.abs(b.w - live.w), Math.abs(b.h - live.h));
            if (d > TOL) failures.push(`${screen}/${state}: ${id} off by ${d.toFixed(1)}px (live ${JSON.stringify(live)} demo ${JSON.stringify(b)})`);
        }
        const builtTexts = new Set((await page.evaluate(TEXTS)).map((t) => t.toLowerCase()));
        const joined = [...builtTexts].join(' \u0001 ');
        const missing = st.texts.map(rename).filter((t) => !builtTexts.has(t.toLowerCase()) && !joined.includes(t.toLowerCase()));
        if (missing.length) failures.push(`${screen}/${state}: ${missing.length} live strings missing: ${missing.slice(0, 6).map((t) => JSON.stringify(t.slice(0, 60))).join(', ')}`);
        await page.screenshot({ path: path.join(SHOTS, `${screen}-${state}.png`) });
        summary.push(`${screen}/${state}: ${[...placed].join(' ')} | ${st.texts.length} live strings, all present: ${!missing.length}`);
    }
    if (offsite.length) failures.push(`${screen}: ${offsite.length} off-page requests: ${[...new Set(offsite)].slice(0, 5).join(', ')}`);
    if (errors.length) failures.push(`${screen}: ${errors.length} console errors: ${errors.slice(0, 3).join(' | ')}`);
    await page.close();
}

// Click-through: the demo's own controls move between states, and between screens on
// their own (no host page), and an inert control explains itself.
{
    const page = await context.newPage();
    const { offsite, errors } = watch(page);
    const at = async (file) => { await page.waitForURL(`**/${file}*`); await page.waitForFunction(() => window.SRScreen); };
    const state = () => page.evaluate(() => `${window.SRScreen.name}/${window.SRScreen.getState()}`);
    const steps = [];
    await page.goto(`${server.url}/collect-stories/demo/collect-new.html`);
    await page.waitForFunction(() => window.SRScreen);
    await page.click('[data-sr-action="state:types"]'); steps.push(await state());
    await page.click('[data-sr-action="navigate:collect-editor"]'); await at('collect-editor.html'); steps.push(await state());
    await page.click('[data-sr-action="state:fund"]'); steps.push(await state());
    await page.click('[data-sr-action="state:field"]'); steps.push(await state());
    await page.click('[data-sr-action="state:upload"]'); steps.push(await state());
    await page.click('[data-sr-action="state:form"]'); steps.push(await state());
    await page.click('[data-sr-action="navigate:collect-link"]'); await at('collect-link.html'); steps.push(await state());
    await page.click('#modal_get_link [data-sr-action="navigate:collect-form"]'); await at('collect-form.html'); steps.push(await state());
    await page.goto(`${server.url}/collect-stories/demo/collect-grid.html`); await page.waitForFunction(() => window.SRScreen);
    await page.locator('[data-sr-action="state:drawer"]').first().click(); steps.push(await state());
    await page.click('label[data-sr-action="state:grid"]'); steps.push(await state());
    await page.locator('button[data-inert]', { hasText: 'Import CSV' }).dispatchEvent('click');
    await page.waitForTimeout(200);
    const toast = await page.evaluate(() => document.getElementById('sr-replica-toast').classList.contains('is-visible'));
    const want = ['collect-new/types', 'collect-editor/form', 'collect-editor/fund', 'collect-editor/field', 'collect-editor/upload', 'collect-editor/form', 'collect-link/link', 'collect-form/filled', 'collect-grid/drawer', 'collect-grid/grid'];
    if (steps.join() !== want.join()) failures.push(`click-through: ${steps.join(' → ')}`);
    if (!toast) failures.push('click-through: inert control showed no toast');
    if (offsite.length || errors.length) failures.push(`click-through: ${offsite.length} off-page, ${errors.length} errors ${errors.slice(0, 2).join(' | ')}`);
    summary.push(`click-through: ${steps.join(' → ')}; toast ${toast}`);
    await page.close();
}
await browser.close();
await server.close();
summary.forEach((s) => console.log(s));
if (failures.length) { console.log(`\nFAIL (${failures.length})`); failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log('\nPASS');
