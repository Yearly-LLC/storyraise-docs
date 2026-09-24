// Measure where things sit on the replica page, for the video's camera.
//
//   node video/tools/measure-targets.mjs
//
// The UI scenes place the same replica markup, at the same 1200px width, inside
// the video. HyperFrames forbids measuring the DOM while seeking, so every rect
// the camera needs is measured once here (page coordinates, CSS px) and written
// to video/targets.json for build-compositions.mjs to bake in as constants.
//
// Donor Signals changes what is on the page when you pick a group, so the rects
// are measured per state: new_gifts and at_risk in Overview, plus at_risk in
// Table, plus the follow-up dialog.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';

const OUT = path.join(TOOLS_DIR, 'video', 'targets.json');
const WIDTH = 1200;

const TARGETS = {
    title: '[data-dashboard-header] h1',
    strip: '.sig-strip',
    stripRetention: '.sig-strip-card:nth-child(1)',
    stripFytd: '.sig-strip-card:nth-child(2)',
    stripFirstYear: '.sig-strip-card:nth-child(3)',
    card: 'section[data-signals] .sig-block',
    headline: '.sig-do-intro',
    tiles: '.sig-kpis-filter',
    tileNew: '[data-tile="new_gifts"]',
    tileUpgrade: '[data-tile="upgrade"]',
    tileAtRisk: '[data-tile="at_risk"]',
    tileMoney: '[data-tile="at_risk"] .sig-kpi-money',
    tilesNote: '.sig-tiles-note',
    bar: '.sig-group-actions',
    views: '.sig-view',
    list: '.sig-feed, .sig-table',
    firstRow: '.sig-feed-row, .sig-tr:not(.sig-th)',
    firstRowWhy: '.sig-feed-why',
    firstRowSub: '.sig-feed-sub',
    actions: '.sig-do',
    actionsHeading: '.sig-do .sig-eyebrow',
    actionLead: '.sig-do-card.lead',
    actionOther: '.sig-do-card:not(.lead)',
    health: '#signals-health',
    healthBands: '.sig-bands, #signals-health table, #signals-health .sig-band-row',
};

const DIALOG_TARGETS = {
    modal: '.sig-modal',
    hero: '.sig-modal-hero',
    pills: '.sig-modal-pills',
    routes: '.sig-routes',
    routeDraft: '.sig-route:nth-child(1)',
    routeTemplate: '.sig-route:nth-child(2)',
    routeReports: '.sig-route:nth-child(3)',
};

const server = await serveStatic(DOCS_ROOT, 5074); // 5070 is left free for a local preview server
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 }, timezoneId: 'America/New_York' });
await page.goto(`${server.url}/donor-signals/demo/`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const rects = (targets) => page.evaluate((t) => {
    const out = {};
    for (const [name, selector] of Object.entries(t)) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        out[name] = { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
    }
    return out;
}, targets);

async function measure(tile, view) {
    await page.evaluate(({ tile, view }) => {
        window.SRReplica.closeDialog();
        window.SRReplica.setTile(tile);
        window.SRReplica.setView(view);
    }, { tile, view });
    await page.waitForTimeout(250);
    return rects(TARGETS);
}

const states = {
    new_gifts: await measure('new_gifts', 'feed'),
    at_risk: await measure('at_risk', 'feed'),
    at_risk_table: await measure('at_risk', 'table'),
};

await page.evaluate(() => { window.SRReplica.setTile('new_gifts'); window.SRReplica.setView('feed'); });
await page.waitForTimeout(200);
await page.evaluate(() => window.SRReplica.openDialog('report-ai'));
await page.waitForTimeout(400);
const dialog = await rects(DIALOG_TARGETS);
await page.evaluate(() => window.SRReplica.closeDialog());

// The dashboard's html/body are height:100%, so scrollHeight reports the window;
// the page really ends below the last card.
const base = states.new_gifts;
const pageHeight = base.health.y + base.health.h + 70;

const missing = Object.keys(TARGETS).filter((k) => !base[k] && !states.at_risk[k] && !states.at_risk_table[k]);
if (missing.length) throw new Error(`targets not found: ${missing.join(', ')}`);
const missingDialog = Object.keys(DIALOG_TARGETS).filter((k) => !dialog[k]);
if (missingDialog.length) throw new Error(`dialog targets not found: ${missingDialog.join(', ')}`);

fs.writeFileSync(OUT, JSON.stringify({ width: WIDTH, states, dialog, pageHeight }, null, 2) + '\n');
console.log(`measured ${Object.keys(base).length} targets across ${Object.keys(states).length} states, ${Object.keys(dialog).length} dialog; page ${pageHeight}px`);
await browser.close();
await server.close();
