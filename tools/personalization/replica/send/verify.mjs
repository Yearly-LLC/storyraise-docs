// Check the built Send screen against the live capture.
//
//   node replica/send/verify.mjs
//
// For every state, at the capture viewport:
//   - each tour anchor's box matches the live app's box within 2px;
//   - every string the live app rendered is rendered by the demo (after the host rename);
//   - the demo requests nothing off the page and logs no console error;
// and the preview's email is personalized for Emily (Hi Emily,) with its View the Report button.
// Screenshots go to .cache/replica/send/built-shots/. Adapted from replica/report/verify-report.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, DOCS_ROOT } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';
import { CACHE } from './seed.mjs';

const capture = JSON.parse(fs.readFileSync(path.join(CACHE, 'capture.json'), 'utf8'));
const SHOTS = path.join(CACHE, 'built-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const PROD_HOST = `${config.identity.org_slug}.yearly.report`;
const TOL = 2;

const server = await serveStatic(DOCS_ROOT, 5078);
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const context = await browser.newContext({ viewport: capture.viewport, deviceScaleFactor: 1, timezoneId: config.capture.timezone, locale: config.capture.locale, reducedMotion: 'reduce' });
const failures = [];
const summary = [];

const TEXTS = () => {
    const out = new Set();
    const walk = (doc) => {
        const w = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
            const n = w.currentNode;
            const t = n.textContent.replace(/\s+/g, ' ').trim();
            const el = n.parentElement;
            if (!t || !el) continue;
            const cs = doc.defaultView.getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
            if (el.closest('script,style,noscript,datalist,template')) continue;
            out.add(t);
        }
        doc.querySelectorAll('iframe').forEach((f) => { try { if (f.contentDocument && f.contentDocument.body) walk(f.contentDocument); } catch (e) { /* ignore */ } });
    };
    walk(document);
    return Array.from(out);
};

for (const [screen, sc] of Object.entries({ send: { states: capture.states } })) {
    const page = await context.newPage();
    const offsite = [];
    const errors = [];
    page.on('request', (r) => { const u = r.url(); if (!u.startsWith(server.url) && !/^(data|about|blob):/.test(u)) offsite.push(u); });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${server.url}/personalization/demo/${screen}.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SRScreen, null, { timeout: 10000 });
    for (const [state, st] of Object.entries(sc.states)) {
        await page.evaluate(async (s) => { window.scrollTo(0, 0); await window.SRScreen.setState(s); await document.fonts.ready; }, state);
        await page.waitForTimeout(400);
        // Each state anchors only what it shows (build-report.mjs fails on a missing one).
        const placed = new Set(await page.evaluate(() => window.SRScreen.getTargets()));
        const check = async (allLive, label) => {
            const liveBoxes = Object.fromEntries(Object.entries(allLive).filter(([id]) => placed.has(id)));
            const built = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
                const r = window.SRScreen.getTargetRect(id);
                if (!r) return [id, null];
                const u = r.unclipped || r;
                return [id, { x: u.x, y: u.y, w: u.width, h: u.height }];
            })), Object.keys(liveBoxes));
            for (const [id, live] of Object.entries(liveBoxes)) {
                const b = built[id];
                if (!live && !b) continue;
                if (!live || !live.w || !live.h) continue; // anchor not shown on the live page in this state
                if (!b) { failures.push(`${screen}/${state}${label}: anchor ${id} missing in demo`); continue; }
                const d = Math.max(Math.abs(b.x - live.x), Math.abs(b.y - live.y), Math.abs(b.w - live.w), Math.abs(b.h - live.h));
                if (d > TOL) failures.push(`${screen}/${state}${label}: ${id} off by ${d.toFixed(1)}px (live ${JSON.stringify(live)} demo ${JSON.stringify(b)})`);
            }
            return built;
        };
        await check(st.boxes, '');
        const builtTexts = new Set((await page.evaluate(TEXTS)).map((t) => t.toLowerCase()));
        const builtJoined = [...builtTexts].join(' \u0001 ');
        const missing = st.texts.map((t) => t.split(PROD_HOST).join(config.identity.link_host))
            .filter((t) => !builtTexts.has(t.toLowerCase()) && !builtJoined.includes(t.toLowerCase()));
        if (missing.length) failures.push(`${screen}/${state}: ${missing.length} live strings missing: ${missing.slice(0, 6).map((t) => JSON.stringify(t.slice(0, 60))).join(', ')}`);
        await page.screenshot({ path: path.join(SHOTS, `${screen}-${state}.png`) });
        let extra = '';
        if (state === 'preview') {
            const mail = await page.evaluate(() => { const f = document.querySelector('#sr-mount iframe[srcdoc]'); const b = f && f.contentDocument && f.contentDocument.body; return b ? b.textContent.replace(/\s+/g, ' ') : ''; });
            if (!/Hi Emily,/.test(mail) || !/View the Report/.test(mail)) failures.push(`send/preview: email not personalized (${mail.slice(0, 80)})`);
            extra = ' email=Hi Emily';
        }
        summary.push(`${screen}/${state}: ${[...placed].join(' ')} | ${st.texts.length} strings${extra}`);
    }
    if (offsite.length) failures.push(`${screen}: ${offsite.length} off-page requests: ${[...new Set(offsite)].slice(0, 5).join(', ')}`);
    if (errors.length) failures.push(`${screen}: ${errors.length} console errors: ${errors.slice(0, 3).join(' | ')}`);
    await page.close();
}
// Click-through: the flow moves the way the product does, and inert controls explain themselves.
{
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${server.url}/personalization/demo/send.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SRScreen);
    const seen = [await page.evaluate(() => window.SRScreen.getState())];
    const step = async (sel, text) => {
        await (text ? page.locator(sel, { hasText: text }) : page.locator(sel)).first().click();
        await page.waitForTimeout(300);
        seen.push(await page.evaluate(() => window.SRScreen.getState()));
    };
    await step('a', 'Review & send');
    await step('button', 'Next');
    await step('button', 'Next');
    await step('button.send-btn-secondary', '');
    await step('.send-step', 'Preview');
    await step('button, a', 'Back to editor');
    await page.locator('#sr-mount [data-inert]:visible').first().click({ force: true });
    await page.waitForTimeout(200);
    const toast = await page.evaluate(() => document.getElementById('sr-replica-toast').classList.contains('is-visible'));
    const want = 'draft,preview,recipients,schedule,recipients,preview,draft';
    if (seen.join(',') !== want) failures.push(`click-through: ${seen.join(' -> ')} (want ${want.split(',').join(' -> ')})`);
    if (!toast) failures.push('click-through: inert control showed no toast');
    if (errors.length) failures.push(`click-through errors: ${errors.join(' | ')}`);
    summary.push(`click-through: ${seen.join(' -> ')}, toast ${toast}`);
    await page.close();
}
await browser.close();
await server.close();
summary.forEach((s) => console.log(s));
if (failures.length) { console.log(`\nFAIL (${failures.length})`); failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log('\nPASS');
