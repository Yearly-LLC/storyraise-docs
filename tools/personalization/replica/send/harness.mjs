// Browser harness for the Send screens: serves the deployed Send app (a read-only
// worktree of deploy-send's stepper branch), swaps the Firebase SDK for fake-firebase.js
// seeded from seed.mjs, answers every Cloud Function from the fixtures, and aborts
// trackers and sign-in redirects. Nothing a captured page does can reach production.
import { chromium } from 'playwright';
import { config } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';
import { buildSeed, FROM, SHIM } from './seed.mjs';

export const SEND_ROOT = '/Applications/MAMP/htdocs/yearly-v3/deploy-send-demo/public';

export async function openHarness({ port = 5077, viewport = config.capture.viewport } = {}) {
    const seed = buildSeed();
    const server = await serveStatic(SEND_ROOT, port);
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
        let s = 20261028;
        Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
        // A fixed clock day, so the schedule step reads the same on every capture.
        try { localStorage.clear(); } catch (e) { /* ignore */ }
    }, { db: seed.db });

    const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: JSON.stringify(body) });

    await context.route(/www\.gstatic\.com\/firebasejs\//, (route) => {
        const isApp = /firebase-app\.js/.test(route.request().url());
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: isApp ? SHIM : '/* fake-firebase: merged into firebase-app.js */' });
    });
    await context.route(/cloudfunctions\.net|localhost:5001|\.run\.app\//, (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return json(route, {});
        const url = new URL(req.url());
        const name = url.pathname.split('/').filter(Boolean).pop();
        log.functions.push(name);
        if (name === 'get_constituents') return json(route, { constituents: seed.constituents });
        if (name === 'get_org_email_config') {
            return json(route, { ok: true, fromEmail: FROM.email, hasDomain: true, domainName: FROM.domain, verified: true, dmarc: 'found', displayName: FROM.name });
        }
        // No server-rendered preview: the product's own client renderer (EmailRenderer) draws it.
        if (name === 'preview_email_html') return json(route, { error: 'demo' }, 503);
        if (name === 'loadStorygramHistory') return json(route, { success: false, error: 'not found' }, 404);
        return json(route, { success: true });
    });
    await context.route(/hs-scripts\.com|hubspot|hsforms|googletagmanager|google-analytics|tracking-init\.js|idle-timeout\.js|thumbmark|abstractapi|auth\.storyraise\.com|app\.storyraise\.com|tidio|clarity\.ms|sentry|sendgrid|api\.lob\.com/,
        (route) => { log.aborted.push(route.request().url().slice(0, 120)); return route.abort(); });

    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => log.console.push(`pageerror: ${e.message.slice(0, 300)}`));

    return {
        seed, server, browser, context, page, log,
        async close() { await browser.close(); await server.close(); },
    };
}
