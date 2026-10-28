// Shared browser harness for the report screens: serves builder/public, swaps the
// Firebase SDK for fake-firebase.js seeded from seed.mjs, stubs Cloud Functions, and
// aborts trackers. Nothing a captured page does can reach production.
// Port 5181: Chrome refuses 5060 and 5061 (SIP), and 5067-5068 are used by other local tools.
import path from 'node:path';
import { chromium } from 'playwright';
import { config } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';
import { buildSeed, constituentId, SHIM } from './seed.mjs';

export async function openHarness({ port = 5181, viewport = config.capture.viewport, stubs = {} } = {}) {
    const seed = buildSeed();
    const server = await serveStatic(path.join(config.builder.path, 'public'), port);
    const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
    const context = await browser.newContext({
        viewport,
        timezoneId: config.capture.timezone,
        locale: config.capture.locale,
        reducedMotion: 'reduce',
        deviceScaleFactor: 1,
    });
    const log = { console: [], functions: [], aborted: [] };

    await context.addInitScript(({ db }) => {
        window.__SR_FAKE_DB = db;
        // Deterministic random (constituent colors, unique keys).
        let s = 20261028;
        Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
        try { localStorage.setItem('sr_tour_seen', '1'); } catch (e) { /* ignore */ }
    }, { db: seed.db });

    const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });

    await context.route(/www\.gstatic\.com\/firebasejs\//, (route) => {
        const isApp = /firebase-app\.js/.test(route.request().url());
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: isApp ? SHIM : '/* fake-firebase: merged into firebase-app.js */' });
    });
    await context.route(/cloudfunctions\.net|localhost:5001|\.run\.app\//, (route) => {
        const url = new URL(route.request().url());
        const name = url.pathname.split('/').filter(Boolean).pop();
        log.functions.push(name);
        if (stubs[name]) return stubs[name](route, url, json, seed);
        if (name === 'report_constituent') {
            const token = url.searchParams.get('for') || '';
            const id = token.includes('@') ? constituentId(token) : token;
            const doc = seed.db.fs[`o/${seed.org}/constituents/${id}`];
            return json(route, doc ? { constituent: doc } : { constituent: null }, doc ? 200 : 404);
        }
        if (name === 'report_collection') {
            const c = seed.db.rtdb.collections[url.searchParams.get('collection_id')];
            return json(route, { responses: (c && c.responses) || {} });
        }
        return json(route, {});
    });
    await context.route(/hs-scripts\.com|hubspot|hsforms|googletagmanager|google-analytics|tracking-init\.js|idle-timeout\.js|hubspot-chat\.js|givebutter\.com|thumbmark|abstractapi|facebook\.net|platform\.twitter|instagram\.com|calendly|tableau|auth\.storyraise\.com|app\.storyraise\.com|tidio|clarity\.ms|sentry/,
        (route) => { log.aborted.push(route.request().url().slice(0, 120)); return route.abort(); });

    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => log.console.push(`pageerror: ${e.message.slice(0, 300)}`));

    return {
        seed, server, browser, context, page, log,
        async close() { await browser.close(); await server.close(); },
    };
}
