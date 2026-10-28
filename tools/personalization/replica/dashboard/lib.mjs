// Shared setup for the dashboard screens: serve builder/public, open the dashboard with
// its auth redirect disabled and every network write blocked, and inject a signed-in
// Harbor Lights state backed by fixtures/constituents.json. Nothing reads production.
import path from 'node:path';
import { chromium } from 'playwright';
import { config, FIXTURES_DIR, readJson } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';

export const CHROMIUM = process.env.SR_CHROMIUM
    || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

// The product stores each CSV row under C + hash(lower(email)); any stable id works here.
export function fixtureConstituents() {
    const { constituents } = readJson(path.join(FIXTURES_DIR, 'constituents.json'));
    return constituents.map((c, i) => ({
        id: `C${String(410275 + i * 7919).padStart(9, '1')}`,
        ...c,
        _SR_email: c.email,
        _SR_first_name: c.first_name.toLowerCase(),
        _SR_last_name: c.last_name.toLowerCase(),
        _SR_full_name: `${c.first_name} ${c.last_name}`.toLowerCase(),
        _SR_is_from_csv_file: true,
        _SR_sources: ['all', 'from_csv'],
    }));
}

// 5050 is the kit's capture port; the builder/preview capture uses it, so the dashboard
// screens take 5051 and can run alongside.
export const PORT = Number(process.env.SR_DASH_PORT || 5051);

const REDIRECT = "window.location.href = 'https://auth.storyraise.com?return_to=' + returnTo;";

export async function openDashboard() {
    const { identity, capture } = config;
    const server = await serveStatic(path.join(config.builder.path, 'public'), PORT);
    const browser = await chromium.launch({ executablePath: CHROMIUM });
    const context = await browser.newContext({
        viewport: capture.viewport,
        timezoneId: capture.timezone,
        locale: capture.locale,
        reducedMotion: 'reduce',
        deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const blocked = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

    await page.route(/\/js\/app-dashboard\.js/, async (route) => {
        const resp = await route.fetch();
        const body = await resp.text();
        if (!body.includes(REDIRECT)) throw new Error('Auth redirect line changed in app-dashboard.js; update REDIRECT.');
        await route.fulfill({ response: resp, body: body.replace(REDIRECT, '/* replica capture: auth redirect disabled */') });
    });
    // Nothing leaves for Firebase or a function: reads are injected, writes never happen.
    await page.route(/firestore\.googleapis\.com|firebaseio\.com|cloudfunctions\.net|identitytoolkit|securetoken|run\.app/, (r) => { blocked.push(r.request().url()); return r.abort(); });
    await page.route(/hs-scripts\.com|hubspot|googletagmanager|google-analytics|tracking-init\.js|idle-timeout\.js/, (r) => r.abort());

    await page.goto(`${server.url}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
        const el = document.querySelector('#dashboard');
        return el && el.__vue__ && el.__vue__.user === 'anonymous';
    }, null, { timeout: 60000 });

    await page.evaluate(async ({ identity, constituents }) => {
        const vm = document.querySelector('#dashboard').__vue__;
        const none = () => Promise.resolve();
        // The route watcher re-reads Firestore; for a fictional org that would blank the list.
        ['fetch_constituents', 'fetch_constituents_meta', 'fetch_constituents_page', 'fetch_signals',
            'fetch_donor_signal', 'fetch_connections', 'fetch_constituent_lists'].forEach((k) => { if (typeof vm[k] === 'function') vm[k] = none; });
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
            has_product: {},
            reports: [],
        };
        vm.reports = {};
        vm.constituents_meta = null;
        vm.constituents = constituents.map((c) => Object.freeze(c));
        vm.current_route = 'constituents';
        vm.current_sub_route = '';
        await vm.$nextTick();
    }, { identity, constituents: fixtureConstituents() });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    return { server, browser, page, consoleErrors, blocked };
}
