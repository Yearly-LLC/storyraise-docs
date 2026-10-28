// Check the built report screens against the live capture.
//
//   node replica/report/verify-report.mjs
//
// For every screen and state, at the capture viewport:
//   - each tour anchor's box matches the live app's box within 2px;
//   - every string the live app rendered is rendered by the demo (after the host rename);
//   - the demo requests nothing off the page and logs no console error;
// and the preview shows only Emily's Bronze section and only James's Gold section.
// Screenshots go to .cache/replica/report/built-shots/.
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

const server = await serveStatic(DOCS_ROOT, 5057);
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const context = await browser.newContext({ viewport: config.capture.viewport, deviceScaleFactor: 1, timezoneId: config.capture.timezone, locale: config.capture.locale, reducedMotion: 'reduce' });
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

for (const [screen, sc] of Object.entries(capture.screens)) {
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
        if (screen === 'preview' && st.levelScroll !== undefined) {
            const vis = await page.evaluate(() => Array.from(document.querySelectorAll('#sr-mount section[data-merge-tag-target="donor_level"]'))
                .filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.getAttribute('data-merge-tag-value')));
            const want = capture.screens.preview.checks[state].donor_level;
            if (vis.length !== 1 || vis[0] !== want) failures.push(`preview/${state}: demo shows ${vis.join(',')} (want ${want})`);
            await page.evaluate((y) => window.scrollTo(0, y), st.levelScroll);
            await page.waitForTimeout(300);
            await check(st.levelBoxes, ' @level');
            await page.screenshot({ path: path.join(SHOTS, `${screen}-${state}-level.png`) });
            extra = ` levels=${vis.join(',')}`;
        }
        if (screen === 'share' && state !== 'platform') {
            // The fixed product draws a small box with its label on one line beside it.
            const box = await page.evaluate(() => {
                const cb = document.querySelector('[data-tour="team-toggle"]');
                const label = cb.closest('label');
                const r = cb.getBoundingClientRect(); const l = label.getBoundingClientRect(); const m = cb.closest('.modal-box').getBoundingClientRect();
                return { w: r.width, h: r.height, labelH: l.height, labelRight: l.right, modalRight: m.right };
            });
            if (box.w > 24 || box.h > 24 || box.labelH > 28 || box.labelRight > box.modalRight) failures.push(`share/${state}: team checkbox ${JSON.stringify(box)}`);
            extra += ` checkbox=${box.w}x${box.h} label=${box.labelH.toFixed(0)}px`;
        }
        summary.push(`${screen}/${state}: ${[...placed].join(' ')} | ${st.texts.length} strings${extra}`);
    }
    if (offsite.length) failures.push(`${screen}: ${offsite.length} off-page requests: ${[...new Set(offsite)].slice(0, 5).join(', ')}`);
    if (errors.length) failures.push(`${screen}: ${errors.length} console errors: ${errors.slice(0, 3).join(' | ')}`);
    await page.close();
}
// At the tour's narrower design widths the canvas must still open on the selected block.
for (const width of [1200, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${server.url}/personalization/demo/builder.html`, { waitUntil: 'load' });
    for (const [state, id] of [['gold', 'gold-section'], ['silver', 'silver-section'], ['bronze', 'bronze-section'], ['tags', 'template-line']]) {
        await page.evaluate(async (s) => { await window.SRScreen.setState(s); }, state);
        await page.waitForTimeout(300);
        const r = await page.evaluate((id) => window.SRScreen.getTargetRect(id), id);
        const frame = await page.evaluate(() => document.querySelector('iframe[data-sr-canvas]').getBoundingClientRect().toJSON());
        if (!r || r.height < 40 || r.top > frame.top + frame.height * 0.6) failures.push(`builder/${state} @${width}: ${id} not in view (${JSON.stringify(r && { top: r.top, h: r.height })})`);
    }
    await page.close();
}
await browser.close();
await server.close();
summary.forEach((s) => console.log(s));
if (failures.length) { console.log(`\nFAIL (${failures.length})`); failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log('\nPASS');
