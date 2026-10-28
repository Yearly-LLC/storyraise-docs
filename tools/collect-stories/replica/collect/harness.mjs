// Shared browser harness for the Collect app screens.
//
// Serves the storyraise-collect worktree's public/ untouched. As main.js is served, the
// webpack registry entries for firebase/{app,auth,database,firestore,storage} are
// replaced with fake-modular.js (over fake-firebase.js, seeded from seed.mjs); the public
// form's Firebase 7 script tags get the same fake. Cloud Functions are stubbed from the
// fixtures, files.harborlights.example serves the demo's own media, and trackers, Storage and every Google
// endpoint are aborted. Nothing a captured page does can reach production.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, DOCS_ROOT, TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';
import { buildSeed, constituentId, LOGO, MODULAR, SHIM } from './seed.mjs';

export const WORKTREE = '/Applications/MAMP/htdocs/yearly-v3/builder-collect-demo/public';
export const CACHE = path.join(TOOLS_DIR, '.cache', 'replica', 'collect');
const IMG = path.join(CACHE, 'img');

const MODULES = { app: 'app', auth: 'auth', database: 'database', firestore: 'firestore', storage: 'storage' };
const REGISTRY_END = '\n/******/ });\n';
const patchBundle = (body) => {
    const at = body.indexOf(REGISTRY_END);
    if (at === -1) throw new Error('main.js layout changed: webpack module registry end not found');
    for (const m of Object.keys(MODULES)) {
        if (!body.includes(`"./node_modules/firebase/${m}/dist/esm/index.esm.js"`)) throw new Error(`main.js has no firebase/${m} module`);
    }
    const patch = `
/* replica capture: Firebase replaced by the in-memory fake (fake-modular.js) */
for (const m of ${JSON.stringify(Object.keys(MODULES))}) {
    __webpack_modules__["./node_modules/firebase/" + m + "/dist/esm/index.esm.js"] = (module, exports, req) => {
        req.r(exports);
        const impl = window.__SR_FAKE_MODULAR[m];
        req.d(exports, Object.fromEntries(Object.keys(impl).map((k) => [k, () => impl[k]])));
    };
}
`;
    const end = at + REGISTRY_END.length;
    return body.slice(0, end) + patch + body.slice(end);
};

export async function openHarness({ port = 5067, viewport = config.capture.viewport, stubs = {} } = {}) {
    const seed = buildSeed();
    const server = await serveStatic(WORKTREE, port);
    const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
    const context = await browser.newContext({
        viewport, timezoneId: config.capture.timezone, locale: config.capture.locale,
        reducedMotion: 'reduce', deviceScaleFactor: 1,
    });
    const log = { console: [], functions: [], aborted: [] };

    await context.addInitScript(({ db, shim, modular }) => {
        window.__SR_FAKE_DB = db;
        let s = 20261028;
        Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
        // eslint-disable-next-line no-new-func
        new Function(shim)();
        new Function(modular)();
    }, { db: seed.db, shim: SHIM, modular: MODULAR });

    const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });

    await context.route(/\/main\.js(\?|$)/, async (route) => {
        const body = fs.readFileSync(path.join(WORKTREE, 'main.js'), 'utf8');
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: patchBundle(body) });
    });
    await context.route(/www\.gstatic\.com\/firebasejs\//, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* fake-firebase: installed by the harness init script */' }));
    await context.route(/files\.harborlights\.example\//, (route) => {
        const p = new URL(route.request().url()).pathname;
        if (p === '/brand/harbor-lights-logo.svg') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: LOGO });
        const file = path.join(IMG, `col-${path.basename(p)}`);
        if (fs.existsSync(file)) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(file) });
        return route.fulfill({ status: 404, body: '' });
    });
    await context.route(/cloudfunctions\.net|localhost:5001|\.run\.app\//, (route) => {
        const url = new URL(route.request().url());
        const name = url.pathname.split('/').filter(Boolean).pop();
        log.functions.push(name);
        if (stubs[name]) return stubs[name](route, url, json, seed);
        if (name === 'collect_load') {
            const id = url.searchParams.get('collection_id');
            const msg = JSON.parse(JSON.stringify(seed.db.rtdb.collections[id] || {}));
            msg.responses = {};
            return json(route, { message: msg });
        }
        return json(route, {});
    });
    await context.route(/firebaseio\.com|firestore\.googleapis|identitytoolkit|securetoken|firebasestorage|firebaseinstallations|googleapis\.com\/(?!css)|hs-scripts\.com|hubspot|hsforms|googletagmanager|google-analytics|tracking-init\.js|idle-timeout\.js|clarity\.ms|sentry|auth\.storyraise\.com|app\.storyraise\.com|collect\.storyraise\.com/,
        (route) => { log.aborted.push(route.request().url().slice(0, 120)); return route.abort(); });

    // Brand fonts and the Storyraise mark the app's CSS loads from Storage, served from
    // local copies (registered last, so this wins over the abort above).
    const LOCAL_ASSETS = [
        [/PPFragment-TextRegular\.woff2/, path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-TextRegular.woff2'), 'font/woff2'],
        [/PPFragment-GlareExtraBold\.woff2/, path.join(DOCS_ROOT, 'assets', 'fonts', 'PPFragment-GlareExtraBold.woff2'), 'font/woff2'],
        [/Heavy%20Icon\.svg/, path.join(config.builder.path, 'public', 'assets', 'logos', 'Storyraise — Logos_Storyraise Logo — Heavy Icon.svg'), 'image/svg+xml'],
    ];
    await context.route(/firebasestorage\.googleapis\.com/, (route) => {
        const url = route.request().url();
        const hit = LOCAL_ASSETS.find(([re]) => re.test(url));
        if (!hit) { log.aborted.push(url.slice(0, 120)); return route.abort(); }
        return route.fulfill({ status: 200, contentType: hit[2], headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(hit[1]) });
    });

    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => log.console.push(`pageerror: ${e.message.slice(0, 300)}`));
    return {
        seed, server, browser, context, page, log, constituentId,
        async close() { await browser.close(); await server.close(); },
    };
}
