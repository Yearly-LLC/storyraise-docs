// Capture the real product screens the video's UI scenes are built from.
//
//   node video/capture/capture-screens.mjs
//
// Renders the builder locally (config.builder.path, the merged main that shipped
// auto-sync for every CRM) against stubbed data, and saves 2x screenshots plus the
// rects the camera frames. Nothing here writes to production: report pageviews,
// beacons and the constituent lookup are stubbed, and the dashboard has no signed-in
// user to write with.
//
// Output: .cache/screens/*.png and .cache/screens/screens.json (gitignored).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, DOCS_ROOT, TOOLS_DIR, writeJson } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';

const OUT = path.join(TOOLS_DIR, '.cache', 'screens');
fs.mkdirSync(OUT, { recursive: true });
const { identity, source, donor, capture } = config;
const VIEWPORT = { width: 1440, height: 900 };
// 3x so the camera can push in to about 2.5x on the 1920px stage and text stays sharp.
const SCALE = 3;
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const TRACKERS = /hs-scripts\.com|hubspot|googletagmanager|google-analytics|facebook\.net|platform\.twitter|instagram\.com\/embed|tableau|thumbmark|abstractapi|ipapi|update_analytic_table|tracking-init\.js|idle-timeout\.js/;

const builder = await serveStatic(path.join(config.builder.path, 'public'), capture.port);
const docs = await serveStatic(DOCS_ROOT, 5073);
const browser = await chromium.launch();
const screens = { capturedAt: new Date().toISOString(), builderSha: config.builder.sha, viewport: VIEWPORT, scale: SCALE };
const problems = [];

async function newPage(viewport = VIEWPORT) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: SCALE, timezoneId: capture.timezone, locale: capture.locale, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(TRACKERS, (r) => r.abort());
    return { context, page, errors };
}

// Rects in CSS px relative to the viewport (the screenshots are of the viewport).
const rectOf = (page, selectorOrFn, arg) => page.evaluate(({ s, a }) => {
    const find = s.startsWith('text:')
        ? () => {
            const needle = s.slice(5);
            let best = null;
            document.querySelectorAll('body *').forEach((el) => {
                if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
                if (!(el.innerText || '').includes(needle)) return;
                if (!best || el.contains(best) === false && best.contains(el)) best = el;
                else if (best && best.contains(el)) best = el;
            });
            return best;
        }
        : () => document.querySelector(s);
    const el = find(a);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
}, { s: selectorOrFn, a: arg });

// Text in the demo org's data is renamed to the fictional identity before a shot.
async function renameText(page, pairs) {
    await page.evaluate((pairs) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((n) => { pairs.forEach(([from, to]) => { if (from && n.nodeValue.includes(from)) n.nodeValue = n.nodeValue.split(from).join(to); }); });
        pairs.forEach(([from, to]) => { if (from) document.title = document.title.split(from).join(to); });
    }, pairs);
}

/* ------------------------------------------------------------------ reader */
// The report as a donor sees it: first a plain link (merge tags unfilled), then the
// same report opened with ?for=, which looks the donor up when it loads.
async function captureReader(personal) {
    const { context, page, errors } = await newPage();
    let writes = 0;
    page.on('websocket', (ws) => ws.on('framesent', (f) => { if (/"a":"(p|m)"/.test(String(f.payload))) writes++; }));
    await context.addInitScript(() => {
        navigator.sendBeacon = () => true;
        const patch = () => {
            const R = window.firebase && window.firebase.database && window.firebase.database.Reference;
            if (!R) { setTimeout(patch, 5); return; }
            const noop = function () { return Object.assign(Promise.resolve(), { key: 'capture-stub', then: Promise.prototype.then.bind(Promise.resolve()) }); };
            ['push', 'set', 'update', 'remove', 'transaction', 'setWithPriority'].forEach((m) => { R.prototype[m] = noop; });
            window.__srWritesStubbed = true;
        };
        patch();
    });
    await page.route(/report_constituent/, (r) => json(r, { constituent: { ...donor, full_name: `${donor.first_name} ${donor.last_name}` } }));
    const query = personal ? `?for=${encodeURIComponent(donor.email)}` : '';
    await page.goto(`${builder.url}/preview/index.html${query}#/${source.org_slug}/${source.report_id}/${source.page_id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__srWritesStubbed === true, null, { timeout: 30000 });
    await page.waitForFunction((needle) => (document.body.innerText || '').includes(needle), personal ? donor.first_name : '@@first_name@@', { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(5000);
    const orgName = await page.evaluate(() => {
        const host = Array.from(document.querySelectorAll('*')).find((el) => el.__vue__ && el.__vue__.org);
        return host ? (host.__vue__.org.name || host.__vue__.org.title || '') : '';
    });
    await renameText(page, [[source.report_title, identity.report_title], [orgName, identity.org_name]]);
    // What a donor sees: no preview toolbar (PDF preview, Send to phone, comments),
    // and Harbor Lights' name where the demo org's logo sits.
    const logo = await page.evaluate(async (orgName) => {
        const host = Array.from(document.querySelectorAll('*')).find((el) => el.__vue__ && el.__vue__.env && 'is_preview_ui_visible' in el.__vue__.env);
        if (host) { host.__vue__.env.is_preview_ui_visible = false; await host.__vue__.$nextTick(); }
        const img = document.elementFromPoint(110, 78);
        if (!img || img.tagName !== 'IMG') return { replaced: false, found: img ? img.tagName : null };
        const r = img.getBoundingClientRect();
        const mark = document.createElement('span');
        mark.textContent = orgName;
        mark.setAttribute('style', `display:inline-block;height:${Math.round(r.height)}px;line-height:${Math.round(r.height)}px;font:600 ${Math.round(r.height * 0.5)}px/${Math.round(r.height)}px Poppins, system-ui, sans-serif;color:#fff;white-space:nowrap;text-shadow:0 1px 8px rgba(0,0,0,.35);`);
        img.replaceWith(mark);
        return { replaced: true, w: Math.round(r.width), h: Math.round(r.height) };
    }, 'Harbor Lights');
    await page.waitForTimeout(300);
    const name = personal ? 'reader-personal' : 'reader-raw';
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    // The smallest visible element whose rendered text holds the phrase. The report's
    // Splitting.js headlines wrap every character in its own span, so no single text
    // node contains a whole phrase.
    const textRect = (needle) => page.evaluate((needle) => {
        let best = null;
        let bestArea = Infinity;
        document.querySelectorAll('body *').forEach((el) => {
            const text = (el.innerText || '').replace(/\s+/g, ' ');
            if (!text.includes(needle)) return;
            const r = el.getBoundingClientRect();
            const area = r.width * r.height;
            if (!area || area >= bestArea) return;
            best = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
            bestArea = area;
        });
        return best;
    }, needle);
    // The headline isn't reachable as text (its words render through Splitting.js /
    // text-fit markup), so take the element under its center and climb to the block
    // that holds the whole greeting.
    const greeting = await page.evaluate(() => {
        let el = document.elementFromPoint(720, 610);
        let fallback = null;
        while (el && el !== document.body) {
            const r = el.getBoundingClientRect();
            const rect = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName.toLowerCase() };
            if (/special thanks/i.test((el.textContent || '').replace(/\s+/g, ' ')) && r.width > 300 && r.height > 80 && r.height < 500) return rect;
            if (!fallback && r.width > 400 && r.height > 100 && r.height < 400) fallback = rect;
            el = el.parentElement;
        }
        return fallback;
    });
    const gift = await textRect('your gift of');
    console.log(`  ${name}: logo ${JSON.stringify(logo)}`);
    if (writes) problems.push(`reader ${name}: ${writes} database write frames left the page`);
    if (errors.length) console.log(`  ${name} page errors: ${errors.length} (first: ${errors[0].slice(0, 120)})`);
    await context.close();
    return { image: `${name}.png`, orgName, rects: { greeting, gift }, writes };
}

screens.readerRaw = await captureReader(false);
screens.readerPersonal = await captureReader(true);

/* --------------------------------------------------------------- dashboard */
const { context: dashContext, page: dash, errors: dashErrors } = await newPage();
const REDIRECT = "window.location.href = 'https://auth.storyraise.com?return_to=' + returnTo;";
await dash.route(/\/js\/app-dashboard\.js/, async (route) => {
    const resp = await route.fetch();
    const body = await resp.text();
    if (!body.includes(REDIRECT)) throw new Error('Auth redirect line changed in app-dashboard.js; update REDIRECT.');
    await route.fulfill({ response: resp, body: body.replace(REDIRECT, '/* screen capture: auth redirect disabled */') });
});
await dash.goto(`${builder.url}/index.html`, { waitUntil: 'domcontentloaded' });
await dash.waitForFunction(() => {
    const el = document.querySelector('#dashboard');
    return el && el.__vue__ && el.__vue__.user === 'anonymous';
}, null, { timeout: 60000 });

const report = { id: source.report_id, slug: identity.report_slug, title: identity.report_title, name: identity.report_title, published: true };
const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
await dash.evaluate(async ({ identity, report, threeHoursAgo }) => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.user = { id: 'demo-admin', name: 'Demo Admin', email: 'demo@harborlights.example', orgs: { [identity.org_slug]: { role: 'admin' } }, default_org: identity.org_slug };
    vm.org = { slug: identity.org_slug, name: identity.org_name, subscription: { type: 'precision' }, has_product: { video: true, collect: true, signals: false }, reports: [report.id] };
    vm.reports = { [report.id]: report };
    vm.connections = {
        salesforce: { vendor: 'salesforce', status: 'connected', auto_sync: true, cadence: 'daily', last_auto_sync_at: threeHoursAgo, connected_at: '2026-06-02T15:00:00.000Z' },
    };
    vm.current_route = 'connections';
    await vm.$nextTick();
}, { identity, report, threeHoursAgo });
await dash.waitForSelector('label[title="More"]', { timeout: 30000 });
await dash.evaluate(() => document.fonts.ready);
await dash.waitForTimeout(2500);

const connectedRow = await dash.evaluate(() => {
    const label = document.querySelector('label[title="More"]');
    let row = label;
    while (row && !(row.style && row.style.padding === '0.9rem 1rem')) row = row.parentElement;
    const r = (row || label).getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
});
await dash.screenshot({ path: path.join(OUT, 'connections.png') });
const syncedText = await rectOf(dash, 'text:synced');
await dash.evaluate(() => document.querySelector('label[title="More"]').focus());
await dash.waitForTimeout(400);
await dash.screenshot({ path: path.join(OUT, 'connections-menu.png') });
screens.connections = {
    image: 'connections.png',
    menuImage: 'connections-menu.png',
    rects: {
        connectedRow,
        syncedText,
        menu: await rectOf(dash, 'label[title="More"] + .dropdown-content'),
        autoSync: await dash.evaluate(() => {
            const el = Array.from(document.querySelectorAll('.dropdown-content label')).find((l) => /Auto-sync/.test(l.innerText));
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
        }),
        frequency: await dash.evaluate(() => {
            const el = Array.from(document.querySelectorAll('.dropdown-content label')).find((l) => /Frequency/.test(l.innerText));
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
        }),
    },
};
await dash.evaluate(() => document.activeElement && document.activeElement.blur());

// "Send this in an email", as it opens from a published report, then with a merge
// tag pasted in. {{email}} stands in for whatever tag the customer's platform uses.
async function sendState(token, copied) {
    await dash.evaluate(async ({ identity, report, token, copied }) => {
        const vm = document.querySelector('#dashboard').__vue__;
        vm.current_route = 'home';
        vm.env.send_email_modal = {
            visible: true, kind: 'report', ref: { orgSlug: identity.org_slug, reportSlug: report.slug }, title: report.title,
            esp: 'custom', custom_token: token,
            audiences: [], list_id: '', loading_audiences: false,
            subject: report.title, preview_text: '', from_name: identity.org_name, reply_to: '',
            intro: 'Your personalized report is ready.', button_label: 'View your report',
            creating: false, result: copied ? { copied: true } : null, error: '',
        };
        await vm.$nextTick();
    }, { identity, report, token, copied });
    await dash.waitForTimeout(700);
}
await sendState('', false);
await dash.screenshot({ path: path.join(OUT, 'send-empty.png') });
const sendRects = {
    modal: await rectOf(dash, '#send-email-modal + .modal .modal-box'),
};
await sendState('{{email}}', false);
await dash.screenshot({ path: path.join(OUT, 'send-filled.png') });
Object.assign(sendRects, await dash.evaluate(() => {
    const box = document.querySelector('#send-email-modal + .modal .modal-box');
    const pick = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
    const inputs = box.querySelectorAll('input');
    return {
        espSelect: pick(box.querySelector('select')),
        tokenInput: pick(inputs[0]),
        linkInput: pick(inputs[1]),
        copyButton: pick(Array.from(box.querySelectorAll('button')).find((b) => /Copy link/.test(b.innerText))),
    };
}));
sendRects.link = await dash.evaluate(() => document.querySelectorAll('#send-email-modal + .modal .modal-box input')[1].value);
await sendState('{{email}}', true);
await dash.screenshot({ path: path.join(OUT, 'send-copied.png') });
screens.send = { images: { empty: 'send-empty.png', filled: 'send-filled.png', copied: 'send-copied.png' }, rects: sendRects };
if (dashErrors.length) console.log(`  dashboard page errors: ${dashErrors.length} (first: ${dashErrors[0].slice(0, 120)})`);
await dashContext.close();

/* --------------------------------------------------------------- analytics */
// The existing Harbor Lights Analytics demo: Most Engaged Constituents, by name.
{
    const { context, page } = await newPage({ width: 1200, height: 1000 });
    await page.goto(`${docs.url}/storyraise-analytics/demo/`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const card = page.locator('[data-tour="engaged"]');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.screenshot({ path: path.join(OUT, 'analytics-engaged.png') });
    const rects = await page.evaluate(() => {
        const cardEl = document.querySelector('[data-tour="engaged"]');
        const c = cardEl.getBoundingClientRect();
        const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left - c.left), y: Math.round(r.top - c.top), w: Math.round(r.width), h: Math.round(r.height) }; };
        return {
            card: { x: 0, y: 0, w: Math.round(c.width), h: Math.round(c.height) },
            firstRow: rel(cardEl.querySelector('[data-insights-constituents] li:first-child')),
            firstName: rel(cardEl.querySelector('[data-insights-constituents] li:first-child')),
        };
    });
    screens.analytics = { image: 'analytics-engaged.png', rects };
    await context.close();
}

writeJson(path.join(OUT, 'screens.json'), { ...screens, problems });
await browser.close();
await builder.close();
await docs.close();

for (const [k, v] of Object.entries(screens)) {
    if (v && typeof v === 'object' && v.rects) console.log(`${k}: ${Object.entries(v.rects).map(([n, r]) => `${n}=${r ? `${r.w}x${r.h}@${r.x},${r.y}` : 'MISSING'}`).join(' ')}`);
}
console.log(`reader orgName: "${screens.readerRaw.orgName}" -> "${identity.org_name}"`);
console.log(`send link: ${screens.send.rects.link}`);
console.log(problems.length ? `PROBLEMS:\n  ${problems.join('\n  ')}` : 'no database writes left the reader');
