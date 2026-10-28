// Check the built dashboard screens against the live capture.
//
//   node replica/dashboard/verify.mjs
//
// For every state: every tour anchor's box matches the live app's within 2px, every text
// run the live app rendered in the viewport renders in the replica, and the page makes no
// request off this server and logs no console error. Then clicks through the state
// machine (Add constituents -> Upload CSV -> Cancel, Emily's row -> profile -> Done Editing).
// Built screenshots land in .cache/replica/dashboard/built-shots/.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, DOCS_ROOT, TOOLS_DIR, readJson } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';
import { CHROMIUM } from './lib.mjs';

const OUT = path.join(TOOLS_DIR, '.cache', 'replica', 'dashboard');
const SHOTS = path.join(OUT, 'built-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const capture = readJson(path.join(OUT, 'capture.json'));
const PORT = Number(process.env.SR_DASH_VERIFY_PORT || 5076);
const SCREEN_OF = { list: 'constituents', 'add-csv': 'constituents', map: 'constituents', profile: 'profile' };
const TOLERANCE = 2;

const server = await serveStatic(DOCS_ROOT, PORT);
const browser = await chromium.launch({ executablePath: CHROMIUM });
const context = await browser.newContext({
    viewport: capture.viewport,
    timezoneId: config.capture.timezone,
    locale: config.capture.locale,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
});
const failures = [];
const fail = (m) => { failures.push(m); console.log(`  FAIL ${m}`); };

async function open(screen) {
    const page = await context.newPage();
    const offPage = [];
    const errors = [];
    page.on('request', (r) => { if (!r.url().startsWith(server.url) && !r.url().startsWith('data:')) offPage.push(r.url()); });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${server.url}/personalization/demo/${screen}.html`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    return { page, offPage, errors };
}

const VISIBLE_TEXT = () => {
    const out = [];
    const walker = document.createTreeWalker(document.querySelector('#sr-mount'), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const t = walker.currentNode.textContent.replace(/\s+/g, ' ').trim();
        if (!t) continue;
        const el = walker.currentNode.parentElement;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
        if (r.bottom < 0 || r.top > innerHeight) continue;
        out.push(t);
    }
    return out;
};

for (const [name, live] of Object.entries(capture.states)) {
    const screen = SCREEN_OF[name];
    const { page, offPage, errors } = await open(screen);
    await page.evaluate((s) => window.SRScreen.setState(s), name);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });

    let worst = 0;
    for (const [id, want] of Object.entries(live.rects)) {
        const got = await page.evaluate((id) => {
            const el = window.SRScreen.getTarget(id);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
        }, id);
        if (!got) { fail(`${name}: anchor ${id} missing`); continue; }
        const d = Math.max(...['x', 'y', 'width', 'height'].map((k) => Math.abs(got[k] - want[k])));
        worst = Math.max(worst, d);
        if (d > TOLERANCE) fail(`${name}: ${id} box off by ${d.toFixed(1)}px (live ${JSON.stringify(want)} vs ${JSON.stringify(got)})`);
    }
    const text = new Set(await page.evaluate(VISIBLE_TEXT));
    const missing = [...new Set(live.text)].filter((t) => !text.has(t));
    if (missing.length) fail(`${name}: ${missing.length} live text runs not rendered: ${missing.slice(0, 6).map((t) => JSON.stringify(t)).join(', ')}`);
    if (offPage.length) fail(`${name}: off-page requests: ${[...new Set(offPage)].join(', ')}`);
    if (errors.length) fail(`${name}: console errors: ${errors.join(' | ')}`);
    console.log(`${name}: ${Object.keys(live.rects).length} anchors (worst ${worst.toFixed(1)}px), ${new Set(live.text).size} text runs, ${missing.length} missing, ${offPage.length} off-page, ${errors.length} errors`);
    await page.close();
}

// The state machine, standalone (no host frame): clicks move between states and screens.
{
    const { page } = await open('constituents');
    const state = () => page.evaluate(() => window.SRScreen.getState());
    const click = async (id) => { await page.evaluate((id) => window.SRScreen.getTarget(id).click(), id); await page.waitForTimeout(150); };
    await click('add');
    if (await state() !== 'add-csv') fail('Add constituents did not open the CSV card');
    await click('upload');
    if (await state() !== 'map') fail('Upload CSV did not open Map your columns');
    await page.evaluate(() => Array.from(document.querySelectorAll('#sr-mount [data-sr-action]')).find((el) => el.textContent.trim() === 'Cancel').click());
    await page.waitForTimeout(150);
    if (await state() !== 'list') fail('Cancel did not return to the list');
    const toast = await page.evaluate(() => { document.querySelector('#sr-mount [data-inert]').click(); return document.getElementById('replica-toast').classList.contains('is-visible'); });
    if (!toast) fail('an inert control did not show the read-only toast');
    await Promise.all([
        page.waitForURL(/profile\.html$/),
        page.evaluate(() => document.querySelector('#sr-mount [data-sr-action="screen:profile"]').click()),
    ]);
    await page.evaluate(() => document.fonts.ready);
    if (await page.evaluate(() => window.SRScreen.name) !== 'profile') fail("Emily's row did not open the profile");
    await Promise.all([
        page.waitForURL(/constituents\.html$/),
        page.evaluate(() => document.querySelector('#sr-mount [data-sr-action="screen:constituents"]').click()),
    ]);
    console.log('state machine: list -> add-csv -> map -> list -> profile -> constituents');
    await page.close();
}

await browser.close();
await server.close();
if (failures.length) { console.log(`\n${failures.length} failure(s)`); process.exit(1); }
console.log('\nall checks passed');
