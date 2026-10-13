// Render the real Connections page locally against the fabricated fixture and save
// everything the static replica is built from.
//
//   node replica/capture-replica.mjs
//
// Serves the builder's public/ folder, opens the dashboard with its auth redirect
// disabled, stubs the screen's Firestore reads, injects a signed-in Harbor Lights
// state, and lets the product's own Vue code render the page. Output goes to
// .cache/replica/; build-replica.mjs turns it into the demo page.
//
// No live tenant is read: there is no demo org with both Salesforce and Raiser's Edge
// connected, and a real one would put customer list names on a public page.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, FIXTURES_DIR, TOOLS_DIR, readJson, writeJson } from '../scripts/lib/identity.mjs';
import { serveStatic } from '../scripts/lib/static-server.mjs';

const OUT = path.join(TOOLS_DIR, '.cache', 'replica');
const SHOTS = path.join(OUT, 'app-shots');
const { identity, capture } = config;

fs.mkdirSync(SHOTS, { recursive: true });
const fixture = readJson(path.join(FIXTURES_DIR, 'connections.json'));

// Hours-ago in the fixture become timestamps, so "synced 3 hours ago" is what renders.
const capturedAt = Date.now();
const iso = (hours) => new Date(capturedAt - hours * 3600e3).toISOString();
const connections = Object.fromEntries(Object.entries(fixture.connections).map(([vendor, c]) => {
    const { last_auto_sync_hours_ago, last_writeback_hours_ago, ...rest } = c;
    return [vendor, {
        vendor,
        ...rest,
        connected_at: iso(24 * 90),
        last_sync_at: iso(24 * 30),
        last_auto_sync_at: iso(last_auto_sync_hours_ago),
        last_writeback_at: iso(last_writeback_hours_ago),
    }];
}));

const server = await serveStatic(path.join(config.builder.path, 'public'), capture.port);
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const context = await browser.newContext({
    viewport: capture.viewport,
    timezoneId: capture.timezone,
    locale: capture.locale,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
});
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); if (m.text().startsWith('wb ')) console.log(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const REDIRECT = "window.location.href = 'https://auth.storyraise.com?return_to=' + returnTo;";
await page.route(/\/js\/app-dashboard\.js/, async (route) => {
    const resp = await route.fetch();
    const body = await resp.text();
    if (!body.includes(REDIRECT)) throw new Error('Auth redirect line changed in app-dashboard.js; update REDIRECT.');
    await route.fulfill({ response: resp, body: body.replace(REDIRECT, '/* replica capture: auth redirect disabled */') });
});
// Never let a capture reach a connector: every one of these would read or write a CRM.
await page.route(/begin_integration_connect|salesforce_listviews|describe_fields_from_salesforce|fetch_contacts_from_salesforce|fetch_constituents_from_blackbaud|push_engagement_to_|sync_to_collection|disconnect_integration|salesforce_prune_constituents/,
    (r) => r.abort());
await page.route(/get_org_email_config|get_send_sender/, (r) => json(r, { ok: true }));
await page.route(/hs-scripts\.com|hubspot|googletagmanager|google-analytics|tracking-init\.js|idle-timeout\.js/, (r) => r.abort());

await page.goto(`${server.url}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
    const el = document.querySelector('#dashboard');
    return el && el.__vue__ && el.__vue__.user === 'anonymous';
}, null, { timeout: 60000 });

await page.evaluate(async ({ identity, connections }) => {
    const vm = document.querySelector('#dashboard').__vue__;
    // The route watcher re-reads Firestore, which for a fictional org returns nothing
    // and would blank the rows. Replace the readers on the instance.
    vm.fetch_connections = () => Promise.resolve();
    vm.fetch_constituents_meta = () => Promise.resolve();
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
    vm.connections = connections;
    vm.current_route = 'connections';
    await vm.$nextTick();
}, { identity, connections });

await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const rows = await page.evaluate(() => document.querySelector('#dashboard').__vue__.connection_groups.connected.map((c) => c.vendor));
if (rows.join() !== 'blackbaud,salesforce') throw new Error(`connected rows: ${rows.join()}`);

// ---- Screenshots for the parity check ----
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('section[data-connections]').screenshot({ path: path.join(SHOTS, 'connections.png') });

// The ⋯ menu is a daisyUI focus dropdown; the markup is always in the DOM, so the
// replica only needs a shot of each open to compare against.
for (const [i, vendor] of rows.entries()) {
    const menu = page.locator('section[data-connections] .dropdown').nth(i);
    await menu.locator('label').first().focus();
    await page.waitForTimeout(200);
    await menu.locator('.dropdown-content').screenshot({ path: path.join(SHOTS, `menu-${vendor}.png`) });
}
await page.evaluate(() => document.activeElement && document.activeElement.blur());

// ---- Dialogs: each is a daisyUI checkbox + .modal pair ----
const DIALOGS = {
    'bb-list': {
        toggle: 'bb-list-modal',
        open: (vm, f) => {
            vm.$set(vm.org, 'blackbaud_lists', f.blackbaud_lists);
            vm.$set(vm.org, 'blackbaud_selected_list', f.blackbaud_lists[0].id);
            vm.env.is_bb_list_modal_visible = true;
        },
        close: (vm) => { vm.env.is_bb_list_modal_visible = false; },
    },
    'sf-scope': {
        toggle: 'sf-listview-modal',
        open: (vm, f) => {
            vm.env.salesforce_listviews = f.salesforce_listviews;
            vm.env.salesforce_selected_listviews = f.salesforce_selected_listviews.slice();
            vm.env.salesforce_fields = f.salesforce_fields;
            vm.env.salesforce_selected_fields = f.salesforce_selected_fields.slice();
            vm.env.salesforce_field_search = '';
            vm.env.is_sf_listview_modal_visible = true;
        },
        close: (vm) => { vm.env.is_sf_listview_modal_visible = false; },
    },
    'wb-blackbaud': {
        toggle: 'writeback-modal',
        open: (vm) => vm.open_writeback_modal('blackbaud'),
        close: (vm) => { vm.env.writeback_modal.visible = false; },
    },
    'wb-blackbaud-sent': {
        toggle: 'writeback-modal',
        open: (vm) => {
            vm.open_writeback_modal('blackbaud');
            vm.env.writeback_modal.result = { written: 214, skipped_no_record: 6, unchanged: 31 };
        },
        close: (vm) => { vm.env.writeback_modal.visible = false; },
    },
    'wb-salesforce': {
        toggle: 'writeback-modal',
        open: (vm) => vm.open_writeback_modal('salesforce'),
        close: (vm) => { vm.env.writeback_modal.visible = false; },
    },
    'wb-salesforce-sent': {
        toggle: 'writeback-modal',
        open: (vm) => {
            vm.open_writeback_modal('salesforce');
            vm.env.writeback_modal.result = { written: 87, skipped_no_contact: 3, unchanged: 12 };
        },
        close: (vm) => { vm.env.writeback_modal.visible = false; },
    },
};

// outerHTML carries attributes, not live state: a ticked toggle or a chosen <option>
// serializes as unticked / the first option. Mirror the properties first.
const FREEZE_FORM_STATE = () => {
    document.querySelectorAll('#dashboard input[type=checkbox], #dashboard input[type=radio]').forEach((el) => {
        if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked');
    });
    document.querySelectorAll('#dashboard select').forEach((sel) => {
        Array.from(sel.options).forEach((o) => { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
    });
    document.querySelectorAll('#dashboard input[type=text], #dashboard textarea').forEach((el) => {
        if (el.tagName === 'TEXTAREA') el.textContent = el.value; else el.setAttribute('value', el.value);
    });
};

const dialogs = {};
for (const [key, d] of Object.entries(DIALOGS)) {
    await page.evaluate(async ({ open, fixture }) => {
        const vm = document.querySelector('#dashboard').__vue__;
        // eslint-disable-next-line no-new-func
        new Function('vm', 'f', `(${open})(vm, f)`)(vm, fixture);
        await vm.$nextTick();
    }, { open: d.open.toString(), fixture });
    await page.waitForTimeout(400);
    dialogs[key] = await page.evaluate(({ id, freeze }) => {
        new Function(`(${freeze})()`)();
        const m = document.querySelector('#dashboard').__vue__.env.writeback_modal;
        if (id === 'writeback-modal') console.log(`wb ${m.vendor} fundraiser=${m.assign_to_fundraiser} owner=${m.assign_to_account_owner}`);
        const toggle = document.getElementById(id);
        const modal = toggle && toggle.nextElementSibling;
        if (!toggle || !toggle.checked || !modal) return null;
        return toggle.outerHTML + modal.outerHTML;
    }, { id: d.toggle, freeze: FREEZE_FORM_STATE.toString() });
    if (!dialogs[key]) throw new Error(`dialog ${key} did not open`);
    await page.locator(`#${d.toggle} + .modal .modal-box`).screenshot({ path: path.join(SHOTS, `dialog-${key}.png`) });
    await page.evaluate(async ({ close }) => {
        const vm = document.querySelector('#dashboard').__vue__;
        new Function('vm', `(${close})(vm)`)(vm);
        await vm.$nextTick();
    }, { close: d.close.toString() });
    await page.waitForTimeout(250);
}

// ---- The DOM, pruned to the Connections core ----
await page.evaluate((freeze) => new Function(`(${freeze})()`)(), FREEZE_FORM_STATE.toString());
const dom = await page.evaluate(() => {
    const live = document.querySelector('#dashboard');
    const clone = live.cloneNode(true);

    const section = clone.querySelector('section[data-connections]');
    const intro = section && section.previousElementSibling;
    const keep = [
        clone.querySelector('[data-dashboard-header] h1'),
        intro,
        section,
    ];
    if (keep.some((n) => !n)) throw new Error('A kept node was not found');
    if (!/Connect your CRM/.test(intro.textContent)) throw new Error('Intro paragraph moved');
    const isKept = (el) => keep.some((k) => k === el || k.contains(el) || el.contains(k));
    for (const el of Array.from(clone.querySelectorAll('*'))) {
        if (clone.contains(el) && !isKept(el)) el.remove();
    }

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    clone.querySelectorAll('script').forEach((s) => s.remove());

    const attrs = (el) => Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]));
    const glyphs = new Set();
    clone.querySelectorAll('.material-symbols-outlined, .material-icons').forEach((el) => glyphs.add(el.textContent.trim()));
    const fonts = new Set();
    for (const el of [live.querySelector('[data-dashboard-header] h1'), ...live.querySelectorAll('section[data-connections] *')]) {
        if (!el) continue;
        const cs = getComputedStyle(el);
        fonts.add(`${cs.fontFamily} | ${cs.fontWeight}`);
    }
    const logos = new Set();
    live.querySelectorAll('section[data-connections] img').forEach((img) => logos.add(img.getAttribute('src')));

    return {
        htmlAttrs: attrs(document.documentElement),
        bodyAttrs: attrs(document.body),
        dashboardHtml: clone.outerHTML,
        glyphs: Array.from(glyphs).filter(Boolean).sort(),
        fonts: Array.from(fonts).sort(),
        logos: Array.from(logos),
        stylesheets: Array.from(document.styleSheets).map((s) => ({
            href: s.href,
            inline: s.href ? null : (s.ownerNode && s.ownerNode.textContent) || '',
        })),
    };
});

writeJson(path.join(OUT, 'capture.json'), {
    capturedAt: new Date(capturedAt).toISOString(),
    builderSha: config.builder.sha,
    timezone: capture.timezone,
    viewport: capture.viewport,
    consoleErrors,
    dialogs,
    ...dom,
});

console.log(`dialogs: ${Object.keys(dialogs).length}`);
console.log(`glyphs (${dom.glyphs.length}): ${dom.glyphs.join(' ')}`);
console.log(`logos: ${dom.logos.length}`);
console.log(`console errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 8).forEach((e) => console.log('  ', e.slice(0, 160)));
console.log(`dashboard html: ${(dom.dashboardHtml.length / 1024).toFixed(0)} KB`);

await browser.close();
await server.close();
