// Measure where things sit on the replica page, for the video's camera.
//
//   node video/tools/measure-targets.mjs
//
// The UI scenes place the same replica markup, at the same 1200px width, inside
// the video. HyperFrames forbids measuring the DOM while seeking, so every rect
// the camera needs is measured once here (page coordinates, CSS px) and written
// to video/targets.json for build-compositions.mjs to bake in as constants.
//
// The page has two states the video shows: as it opens, and with the Raiser's Edge
// ⋯ menu open. The dialogs ride above the camera and need no measuring.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';

const OUT = path.join(TOOLS_DIR, 'video', 'targets.json');
const WIDTH = 1200;

/*
    Targets are found by the replica's tour anchors where it has them, and by the
    product's own text otherwise. `row` scopes a text search to one connection row.
*/
const TARGETS = {
    title: { sel: '[data-dashboard-header] h1' },
    rows: { sel: '[data-tour="rows"]' },
    rowRE: { sel: '[data-tour="row-re"]' },
    rowSF: { sel: '[data-tour="row-sf"]' },
    liveRE: { row: 'blackbaud', text: /^Live$/ },
    liveSF: { row: 'salesforce', text: /^Live$/ },
    scopeRE: { sel: '[data-tour="scope"]' },
    scopeSF: { row: 'salesforce', text: /^group\s*Constituents/ },
    syncedRE: { sel: '[data-tour="synced"]' },
    syncedSF: { row: 'salesforce', text: /^·?\s*synced / },
    cadenceRE: { sel: '[data-tour="cadence"]' },
    cadenceSF: { row: 'salesforce', text: /^schedule\s+weekly/ },
    sentRE: { sel: '[data-tour="sent"]' },
    sentSF: { row: 'salesforce', text: /^ios_share\s+\d+ sent/ },
    giftsRE: { row: 'blackbaud', text: /^Gifts\s*[\d,]+$/ },
    oppsSF: { row: 'salesforce', text: /^Opportunities\s*[\d,]+$/ },
    syncNowRE: { sel: '[data-tour="sync-now"]' },
    addDataRE: { sel: '[data-tour="add-data"]' },
    sendRE: { sel: '[data-tour="send-re"]' },
    sendSF: { sel: '[data-tour="send-sf"]' },
    menuRE: { sel: '[data-tour="menu"]' },
    catalog: { sel: '[data-tour="catalog"]' },
};
const MENU_TARGETS = {
    menuList: { sel: '[data-sr-menu="blackbaud"] .dropdown-content' },
    autoSync: { sel: '[data-sr-menu="blackbaud"] .dropdown-content label:nth-of-type(1)' },
    frequency: { sel: '[data-sr-menu="blackbaud"] .dropdown-content label:nth-of-type(2)' },
};

const server = await serveStatic(DOCS_ROOT, 5074); // 5070 is left free for a local preview server
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 }, timezoneId: 'America/New_York' });
await page.goto(`${server.url}/connections-and-sync/demo/`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const rects = (targets) => page.evaluate((t) => {
    const out = {};
    const box = (el) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
    };
    for (const [name, spec] of Object.entries(t)) {
        let el = null;
        if (spec.sel) el = document.querySelector(spec.sel);
        else {
            const row = document.querySelector(`[data-sr-vendor="${spec.row}"]`);
            const re = new RegExp(spec.text.source, spec.text.flags);
            // The innermost span whose whole text matches.
            el = Array.from(row.querySelectorAll('span, b')).filter((s) => re.test(s.textContent.replace(/\s+/g, ' ').trim()))
                .sort((a, b) => a.textContent.length - b.textContent.length)[0] || null;
        }
        if (!el) continue;
        const b = box(el);
        if (b.w && b.h) out[name] = b;
    }
    return out;
}, Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, v.text ? { ...v, text: { source: v.text.source, flags: v.text.flags } } : v])));

const base = await rects(TARGETS);
await page.evaluate(() => window.SRReplica.openMenu('blackbaud'));
await page.waitForTimeout(500);
const menu = await rects(MENU_TARGETS);
await page.evaluate(() => window.SRReplica.closeMenu());

const missing = Object.keys(TARGETS).filter((k) => !base[k]);
if (missing.length) throw new Error(`targets not found: ${missing.join(', ')}`);
const missingMenu = Object.keys(MENU_TARGETS).filter((k) => !menu[k]);
if (missingMenu.length) throw new Error(`menu targets not found: ${missingMenu.join(', ')}`);

// The dashboard's html/body are height:100%, so scrollHeight reports the window;
// the page really ends below the catalog.
const pageHeight = base.catalog.y + base.catalog.h + 70;

fs.writeFileSync(OUT, JSON.stringify({ width: WIDTH, base, menu, pageHeight }, null, 2) + '\n');
console.log(`measured ${Object.keys(base).length} page targets, ${Object.keys(menu).length} menu targets; page ${pageHeight}px`);
await browser.close();
await server.close();
