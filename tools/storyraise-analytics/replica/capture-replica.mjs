// Render the real Insights page locally against the frozen fixture and save
// everything the static replica is built from.
//
//   node replica/capture-replica.mjs
//
// Serves the builder's public/ folder, opens the dashboard with its auth redirect
// disabled and every analytics endpoint stubbed, injects a signed-in state, and
// lets the product's own Vue code render the page. Output goes to
// .cache/replica/ (gitignored); build-replica.mjs turns it into the demo page.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, FIXTURES_DIR, TOOLS_DIR, readJson, writeJson } from '../scripts/lib/identity.mjs';
import { serveStatic } from '../scripts/lib/static-server.mjs';

const OUT = path.join(TOOLS_DIR, '.cache', 'replica');
const SHOTS = path.join(OUT, 'app-shots');
const RANGES = [7, 30, 90, 180, 365];
const { identity, capture } = config;

fs.mkdirSync(SHOTS, { recursive: true });
const summary = readJson(path.join(FIXTURES_DIR, 'insights-summary.json'));
const narrative = readJson(path.join(FIXTURES_DIR, 'narrative.json'));

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

// The dashboard sends signed-out visitors to auth.storyraise.com. Swap that one
// line for a no-op so the page stays put; everything else runs unmodified.
const REDIRECT = "window.location.href = 'https://auth.storyraise.com?return_to=' + returnTo;";
await page.route(/\/js\/app-dashboard\.js/, async (route) => {
    const resp = await route.fetch();
    const body = await resp.text();
    if (!body.includes(REDIRECT)) throw new Error('Auth redirect line changed in app-dashboard.js; update REDIRECT.');
    await route.fulfill({ response: resp, body: body.replace(REDIRECT, '/* replica capture: auth redirect disabled */') });
});
await page.route(/get_report_insights_summary/, (r) => json(r, summary));
await page.route(/gpt_report_insights/, (r) => json(r, {}));
await page.route(/generate_report_analytics_summary/, (r) => json(r, { report: narrative.insights_narrative_md }));
await page.route(/poll_results/, (r) => json(r, { ok: true, polls: [] }));
await page.route(/feedback_results/, (r) => json(r, { ok: true, cards: [] }));
await page.route(/hs-scripts\.com|hubspot|googletagmanager|google-analytics|tracking-init\.js|idle-timeout\.js/, (r) => r.abort());

await page.goto(`${server.url}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
    const el = document.querySelector('#dashboard');
    return el && el.__vue__ && el.__vue__.user === 'anonymous';
}, null, { timeout: 60000 });

const report = {
    id: config.source.report_id,
    slug: identity.report_slug,
    title: identity.report_title,
    name: identity.report_title,
    published: true,
    published_at: '2026-05-22T17:00:00.000Z',
    insights_narrative_md: narrative.insights_narrative_md,
    insights_narrative_at: narrative.generated_at,
};

await page.evaluate(async ({ report, identity }) => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.user = {
        id: 'demo-admin',
        name: 'Demo Admin',
        email: 'demo@harborlights.example',
        orgs: { [identity.org_slug]: { role: 'admin' } },
        default_org: identity.org_slug,
    };
    vm.org = {
        slug: identity.org_slug,
        name: identity.org_name,
        subscription: { type: 'precision' },
        has_product: { video: true, collect: true, signals: true },
        reports: [report.id],
    };
    vm.reports = { [report.id]: report };
    vm.current_route = 'insights';
    vm.current_sub_route = identity.report_slug;
    vm.insights_subject = identity.report_title;
    await vm.generate_insight_summary(identity.org_slug, report.id);
    // Polls and feedback need a real ID token; with none they surface an error
    // tab. The demo report has neither, so settle both to "nothing here".
    vm.insights_polls = [];
    vm.insights_polls_error = '';
    vm.insights_feedback = [];
    vm.insights_feedback_error = '';
}, { report, identity });

await page.waitForSelector('[data-insights-overview="1"] figure', { timeout: 30000 });
await page.waitForSelector('[data-worldmap-canvas] canvas', { timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2000);

const chips = await page.$$eval('[data-insights-highlights] .insight-chip', (els) =>
    els.map((e) => e.querySelector('span:last-child').textContent.replace(/\s+/g, ' ').trim()));
console.log('highlight chips:', chips);

// ---- App screenshots for the parity check (default range, The Numbers) ----
await page.locator('form[data-insights-bot]').screenshot({ path: path.join(SHOTS, 'numbers.png') });

// ---- Heatmap + trend fragments for every range chip ----
const rangeFragments = {};
for (const days of RANGES) {
    await page.evaluate(async (d) => {
        const vm = document.querySelector('#dashboard').__vue__;
        vm.heatmap_set_range(d);
        await vm.$nextTick();
    }, days);
    await page.waitForTimeout(150);
    rangeFragments[days] = await page.evaluate(() => ({
        heatmap: document.querySelector('[data-engagement-heatmap-wrap]').outerHTML,
        trend: document.querySelector('[data-visits-trend-wrap]').outerHTML,
    }));
    await page.locator('[data-engagement-heatmap-wrap]').screenshot({ path: path.join(SHOTS, `heatmap-${days}.png`) });
}
await page.evaluate(async () => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.heatmap_set_range(30);
    await vm.$nextTick();
});

// ---- Map image (2x) for the fallback and the video ----
const mapDataUrl = await page.evaluate(() =>
    echarts.getInstanceByDom(document.querySelector('[data-worldmap-canvas]'))
        .getDataURL({ pixelRatio: 2, backgroundColor: 'transparent' }));
fs.writeFileSync(path.join(OUT, 'map@2x.png'), Buffer.from(mapDataUrl.split(',')[1], 'base64'));

// ---- The Story screenshot ----
await page.evaluate(async () => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.insights_set_view('summary');
    await vm.$nextTick();
});
await page.waitForTimeout(300);
await page.locator('form[data-insights-bot]').screenshot({ path: path.join(SHOTS, 'story.png') });
await page.evaluate(async () => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.insights_set_view('overview');
    await vm.$nextTick();
});

// ---- Modal screenshots (viewport; daisyUI overlays the page) ----
for (const [flag, name] of [
    ['is_locations_modal_visible', 'locations'],
    ['is_engagement_score_modal_visible', 'engagement-score'],
    ['is_constituents_modal_visible', 'constituents'],
]) {
    await page.evaluate(async (f) => {
        const vm = document.querySelector('#dashboard').__vue__;
        vm.env[f] = true;
        await vm.$nextTick();
    }, flag);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, `modal-${name}.png`) });
    await page.evaluate(async (f) => {
        const vm = document.querySelector('#dashboard').__vue__;
        vm.env[f] = false;
        await vm.$nextTick();
    }, flag);
}

// ---- The DOM, pruned to the analytics core ----
// Expand every region first so each city panel exists in the markup; the build
// collapses them again and replica.js toggles them.
await page.evaluate(async (regions) => {
    const vm = document.querySelector('#dashboard').__vue__;
    vm.env.locations_modal_expanded_regions = regions;
    await vm.$nextTick();
}, summary.all_regions.map((r) => r.region));
await page.waitForTimeout(200);

const dom = await page.evaluate(() => {
    const live = document.querySelector('#dashboard');
    const clone = live.cloneNode(true);

    // Keep: the page title, the analytics form, and the three analytics modals
    // (each is a checkbox toggle followed by its .modal sibling).
    const keep = [];
    keep.push(clone.querySelector('[data-dashboard-header] h1'));
    keep.push(clone.querySelector('form[data-insights-bot]'));
    for (const id of ['locations-modal', 'engagement-score-modal', 'constituents-modal']) {
        const toggle = clone.querySelector(`#${id}`);
        keep.push(toggle, toggle.nextElementSibling);
    }
    if (keep.some((n) => !n)) throw new Error('A kept node was not found');

    // The clone is detached, so isConnected is always false here; "still inside
    // the clone" is the test for an element an earlier removal already took.
    const isKept = (el) => keep.some((k) => k === el || k.contains(el) || el.contains(k));
    for (const el of Array.from(clone.querySelectorAll('*'))) {
        if (clone.contains(el) && !isKept(el)) el.remove();
    }

    const form = clone.querySelector('form[data-insights-bot]');
    form.querySelector(':scope > header')?.remove();
    form.querySelector('[data-insights-loading]')?.remove();
    // The "We're always improving Insights" contact card.
    for (const el of Array.from(form.querySelectorAll('*'))) {
        if (clone.contains(el) && /We.re always improving Insights/.test(el.textContent) && el.children.length
            && !el.querySelector('[data-insights-pane], [data-insights-narrative]')) {
            let card = el;
            while (card.parentElement && card.parentElement !== form
                && !card.parentElement.querySelector('[data-insights-pane], [data-insights-narrative]')) {
                card = card.parentElement;
            }
            card.remove();
            break;
        }
    }
    // ECharts mounts a live canvas; replica.js re-creates it.
    const mapEl = clone.querySelector('[data-worldmap-canvas]');
    mapEl.replaceChildren();
    mapEl.removeAttribute('_echarts_instance_');
    mapEl.removeAttribute('style');

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    clone.querySelectorAll('script').forEach((s) => s.remove());

    const attrs = (el) => Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]));
    const glyphs = new Set();
    clone.querySelectorAll('.material-symbols-outlined, .material-icons').forEach((el) => glyphs.add(el.textContent.trim()));

    const fonts = new Set();
    for (const el of [live.querySelector('[data-dashboard-header] h1'), ...live.querySelectorAll('form[data-insights-bot] *'), ...live.querySelectorAll('.insights-modal *')]) {
        if (!el) continue;
        const cs = getComputedStyle(el);
        fonts.add(`${cs.fontFamily} | ${cs.fontWeight}`);
    }

    return {
        htmlAttrs: attrs(document.documentElement),
        bodyAttrs: attrs(document.body),
        dashboardHtml: clone.outerHTML,
        glyphs: Array.from(glyphs).filter(Boolean).sort(),
        fonts: Array.from(fonts).sort(),
        loadedFontFaces: Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
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
    chips,
    consoleErrors,
    rangeFragments,
    ...dom,
});

console.log(`glyphs (${dom.glyphs.length}):`, dom.glyphs.join(' '));
console.log('fonts:', dom.fonts.join('\n  '));
console.log(`console errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 15).forEach((e) => console.log('  ', e.slice(0, 200)));
console.log(`dashboard html: ${(dom.dashboardHtml.length / 1024).toFixed(0)} KB`);

await browser.close();
await server.close();
