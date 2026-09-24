// Render the real Donor Signals page locally against the frozen fixture and save
// everything the static replica is built from.
//
//   node replica/capture-replica.mjs
//
// Serves the builder's public/ folder, opens the dashboard with its auth redirect
// disabled and the signals endpoints stubbed, injects a signed-in state, and lets
// the product's own Vue code render the page. Output goes to .cache/replica/
// (on the external drive); build-replica.mjs turns it into the demo page.
//
// Six tiles x two list views are captured as fragments of the one card that
// changes, so the demo can be clicked through without re-running Vue.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, FIXTURES_DIR, TOOLS_DIR, readJson, writeJson } from '../scripts/lib/identity.mjs';
import { serveStatic } from '../scripts/lib/static-server.mjs';

const OUT = path.join(TOOLS_DIR, '.cache', 'replica');
const SHOTS = path.join(OUT, 'app-shots');
const TILES = ['new_gifts', 'upgrade', 'warming', 'engaged', 'at_risk', 'stable'];
const VIEWS = ['feed', 'table'];
const { identity, capture } = config;

fs.mkdirSync(SHOTS, { recursive: true });
const signals = readJson(path.join(FIXTURES_DIR, 'donor-signals.json'));
const gallery = readJson(path.join(FIXTURES_DIR, 'templates-index.json'));

const server = await serveStatic(path.join(config.builder.path, 'public'), capture.port);
const browser = await chromium.launch();
const context = await browser.newContext({
    viewport: capture.viewport,
    timezoneId: capture.timezone,
    locale: capture.locale,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
});
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const REDIRECT = "window.location.href = 'https://auth.storyraise.com?return_to=' + returnTo;";
await page.route(/\/js\/app-dashboard\.js/, async (route) => {
    const resp = await route.fetch();
    const body = await resp.text();
    if (!body.includes(REDIRECT)) throw new Error('Auth redirect line changed in app-dashboard.js; update REDIRECT.');
    await route.fulfill({ response: resp, body: body.replace(REDIRECT, '/* replica capture: auth redirect disabled */') });
});
await page.route(/get_donor_signals/, (r) => json(r, Object.assign({ org_slug: config.source.org_slug, status: 'ok' }, signals)));
// Never let a capture write: the tab logs actions and can ask for a rescore.
await page.route(/refresh_donor_signals|log_donor_signal_action|rollup_donor_signals/, (r) => json(r, { status: 'ok' }));
await page.route(/get_org_email_config|get_send_sender/, (r) => json(r, { ok: true }));
await page.route(/hs-scripts\.com|hubspot|googletagmanager|google-analytics|tracking-init\.js|idle-timeout\.js/, (r) => r.abort());

await page.goto(`${server.url}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
    const el = document.querySelector('#dashboard');
    return el && el.__vue__ && el.__vue__.user === 'anonymous';
}, null, { timeout: 60000 });

await page.evaluate(async ({ identity, gallery }) => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.user = {
        id: 'demo-admin',
        name: 'Demo Admin',
        email: null,
        orgs: { [identity.org_slug]: { role: 'admin' } },
        default_org: identity.org_slug,
    };
    vm.org = {
        slug: identity.org_slug,
        name: identity.org_name,
        subscription: { type: 'precision' },
        has_product: { video: true, collect: true, signals: true },
        fiscal_year_start_month: 7,
        reports: [],
    };
    vm.reports = {};
    vm.current_route = 'signals';
    // The covers come from RTDB, which a signed-out page cannot read.
    vm.env.gallery.index = gallery.index;
    await vm.$nextTick();
}, { identity, gallery });

await page.evaluate(() => document.querySelector('#dashboard').__vue__.fetch_signals(true));
await page.waitForFunction(() => document.querySelector('#dashboard').__vue__.signals.source === 'server', null, { timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const setState = async (tile, view) => {
    await page.evaluate(async ({ tile, view }) => {
        const vm = document.querySelector('#dashboard').__vue__;
        /*
            Go through the product's own setters, not the state. signal_set_segment_filter
            is what applies each group's default sort — money for At risk and Upgrade,
            recency for New gifts — so setting segment_filter directly captured At risk
            sorted by attention and put a $140 donor above a $22,000 one, which is not
            what the product does. It toggles back to 'all' when the group is already
            selected, hence the reset first.
        */
        vm.signals.segment_filter = 'all';
        vm.signal_set_segment_filter(tile);
        vm.signal_set_view(view);
        vm.signals.search = '';
        await vm.$nextTick();
    }, { tile, view });
    await page.waitForTimeout(250);
};

// ---- Per-state fragments of the one card that changes ----
const states = {};
for (const tile of TILES) {
    for (const view of VIEWS) {
        await setState(tile, view);
        states[`${tile}|${view}`] = await page.evaluate(() =>
            document.querySelector('section[data-signals] .sig-block').innerHTML);
    }
    await setState(tile, 'feed');
    await page.locator('section[data-signals] .sig-block').first().screenshot({ path: path.join(SHOTS, `tile-${tile}.png`) });
}

/*
    The follow-up dialog, one shot per route FOR EVERY GROUP. The dialog is written
    for the group you opened it from: its title, its count, its group chip, its money
    and its draft sentence all change. Capturing it once from New gifts left the demo
    showing "17 donors / New gifts / $4,050 received" whatever you had selected, which
    broke the moment the tour calls the point of the page.
*/
const dialogs = {};
for (const tile of TILES) {
    await setState(tile, 'feed');
    for (const [kind, source] of [['report', 'ai'], ['report', 'template'], ['report', 'existing'], ['video', null]]) {
        await page.evaluate(async ({ kind, source }) => {
            const vm = document.querySelector('#dashboard').__vue__;
            vm.signals.followup.open = false;
            vm.open_signal_followup(kind, vm.today_candidates, vm.today_group_name);
            if (source) vm.signals.followup.source = source;
            await vm.$nextTick();
        }, { kind, source });
        await page.waitForTimeout(500);
        const name = source ? `${kind}-${source}` : kind;
        dialogs[`${tile}|${name}`] = await page.evaluate(() => {
            const el = document.querySelector('.sig-modal-backdrop');
            return el ? el.outerHTML : null;
        });
        if (tile === 'new_gifts') {
            await page.locator('.sig-modal').screenshot({ path: path.join(SHOTS, `dialog-${name}.png`) });
        }
        await page.evaluate(async () => {
            const vm = document.querySelector('#dashboard').__vue__;
            vm.signals.followup.open = false;
            await vm.$nextTick();
        });
        await page.waitForTimeout(150);
    }
}
await page.evaluate(async () => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.signals.followup.open = false;
    await vm.$nextTick();
});
await setState('new_gifts', 'feed');
await page.waitForTimeout(300);

// ---- Full-page shot for the parity check ----
await page.locator('section[data-signals]').screenshot({ path: path.join(SHOTS, 'signals.png') });

// ---- The DOM, pruned to the signals core ----
const dom = await page.evaluate(() => {
    const live = document.querySelector('#dashboard');
    const clone = live.cloneNode(true);

    // Keep the page title and the signals section only: no sidebar, no chrome.
    const keep = [
        clone.querySelector('[data-dashboard-header] h1'),
        clone.querySelector('section[data-signals]'),
    ];
    if (keep.some((n) => !n)) throw new Error('A kept node was not found');
    const isKept = (el) => keep.some((k) => k === el || k.contains(el) || el.contains(k));
    for (const el of Array.from(clone.querySelectorAll('*'))) {
        if (clone.contains(el) && !isKept(el)) el.remove();
    }

    const sec = clone.querySelector('section[data-signals]');
    // The live rescore link and the refresh state are not things a demo can do.
    sec.querySelector('.sig-rescore')?.remove();

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    clone.querySelectorAll('script').forEach((s) => s.remove());

    const attrs = (el) => Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]));
    const glyphs = new Set();
    clone.querySelectorAll('.material-symbols-outlined, .material-icons').forEach((el) => glyphs.add(el.textContent.trim()));
    const fonts = new Set();
    for (const el of [live.querySelector('[data-dashboard-header] h1'), ...live.querySelectorAll('section[data-signals] *')]) {
        if (!el) continue;
        const cs = getComputedStyle(el);
        fonts.add(`${cs.fontFamily} | ${cs.fontWeight}`);
    }
    // Every template cover the action cards reference, for local download.
    const covers = new Set();
    live.querySelectorAll('section[data-signals] .sig-sheet img').forEach((img) => covers.add(img.src));

    return {
        htmlAttrs: attrs(document.documentElement),
        bodyAttrs: attrs(document.body),
        dashboardHtml: clone.outerHTML,
        glyphs: Array.from(glyphs).filter(Boolean).sort(),
        fonts: Array.from(fonts).sort(),
        covers: Array.from(covers),
        stylesheets: Array.from(document.styleSheets).map((s) => ({
            href: s.href,
            inline: s.href ? null : (s.ownerNode && s.ownerNode.textContent) || '',
        })),
    };
});

writeJson(path.join(OUT, 'capture.json'), {
    capturedAt: new Date().toISOString(),
    builderSha: config.builder.sha,
    timezone: capture.timezone,
    viewport: capture.viewport,
    consoleErrors,
    states,
    dialogs,
    ...dom,
});

console.log(`states: ${Object.keys(states).length}, dialogs: ${Object.keys(dialogs).filter((k) => dialogs[k]).length}`);
console.log(`glyphs (${dom.glyphs.length}): ${dom.glyphs.join(' ')}`);
console.log(`covers: ${dom.covers.length}`);
console.log(`console errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 8).forEach((e) => console.log('  ', e.slice(0, 160)));
console.log(`dashboard html: ${(dom.dashboardHtml.length / 1024).toFixed(0)} KB`);

await browser.close();
await server.close();
