// Check the built report screens against the live capture.
//
//   node replica/report/verify-report.mjs
//
// For every screen and state, at the capture viewport:
//   - each tour anchor's box matches the live app's box within 2px;
//   - every string the live app rendered is rendered by the demo (after the host rename);
//   - the demo requests nothing off the page and logs no console error;
// and each preview state shows exactly the fund update and the story cards the live one did.
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

const server = await serveStatic(DOCS_ROOT, 5064);
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
    await page.goto(`${server.url}/collect-stories/demo/${screen}.html`, { waitUntil: 'load' });
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
        if (screen === 'preview' && st.storyScroll !== undefined) {
            const got = await page.evaluate(() => ({
                fund: (document.querySelector('[data-tour="fund-update"] h2') || {}).textContent || null,
                stories: Array.from(document.querySelectorAll('#sr-mount [data-tour-part="story-cards"]')).map((c) => (c.querySelector('h2') || {}).textContent.trim()),
            }));
            const want = capture.screens.preview.checks[state];
            const wantNames = want.stories.length ? want.stories : ['@@student_name@@'];
            if (got.stories.join('|') !== wantNames.join('|')) failures.push(`preview/${state}: demo cards ${got.stories.join(', ')} (want ${wantNames.join(', ')})`);
            await page.evaluate((y) => window.scrollTo(0, y), st.storyScroll);
            await page.waitForTimeout(300);
            await check(st.storyBoxes, ' @story');
            await page.screenshot({ path: path.join(SHOTS, `${screen}-${state}-story.png`) });
            extra = ` cards=${got.stories.join(',')}${got.fund ? ` fund=${got.fund.trim()}` : ''}`;
        }
        summary.push(`${screen}/${state}: ${[...placed].join(' ')} | ${st.texts.length} strings${extra}`);
    }
    if (offsite.length) failures.push(`${screen}: ${offsite.length} off-page requests: ${[...new Set(offsite)].slice(0, 5).join(', ')}`);
    if (errors.length) failures.push(`${screen}: ${errors.length} console errors: ${errors.slice(0, 3).join(' | ')}`);
    await page.close();
}
await browser.close();
await server.close();
summary.forEach((s) => console.log(s));
if (failures.length) { console.log(`\nFAIL (${failures.length})`); failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log('\nPASS');
