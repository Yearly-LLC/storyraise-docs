// Measure where things sit on the replica page, for the video's camera.
//
//   node video/tools/measure-targets.mjs
//
// The UI scenes place the same replica markup, at the same 1200px width, inside
// the video. HyperFrames forbids measuring the DOM while seeking, so every rect
// the camera needs is measured once here (page coordinates, CSS px) and written
// to video/targets.json for build-compositions.mjs to bake in as constants.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';

const OUT = path.join(TOOLS_DIR, 'video', 'targets.json');
const WIDTH = 1200;

// name -> selector (first match) on The Numbers, unless noted.
const TARGETS = {
    title: '[data-dashboard-header] h1',
    tabs: '[data-insights-tabs]',
    tabNumbers: '[data-tab="overview"]',
    tabStory: '[data-tab="summary"]',
    pane: '[data-insights-pane="overview"]',
    form: 'form[data-insights-bot]',
    donateRow: '.link-clicks__group:first-child',
    endcap: '.reader-flow__endcap',
    highlights: '[data-insights-highlights]',
    chipPeak: '[data-insights-highlights] .insight-chip:nth-child(1)',
    kpis: '[data-insights-overview="1"]',
    kpiOpened: '[data-insights-overview="1"] > div:nth-child(1)',
    kpiReturns: '[data-insights-overview="1"] > div:nth-child(2)',
    kpiViews: '[data-insights-overview="1"] > div:nth-child(3)',
    kpiTime: '[data-insights-overview="1"] > div:nth-child(4)',
    whosReading: '[data-insights-overview="2"]',
    map: '[data-tour="map"]',
    mapCanvas: '[data-worldmap-canvas]',
    engaged: '[data-tour="engaged"]',
    engagedFirstRow: '[data-insights-constituents] li:first-child',
    engagedStars: '[data-insights-constituents] li:first-child [data-stars]',
    badge: '[data-tour="badges"]',
    clicks: '[data-tour="clicks"]',
    donut: '.link-clicks__ring',
    howTheyRead: '[data-tour="how-they-read"]',
    retention: '[data-tour="retention"]',
    retentionFirstNode: '.reader-flow__node',
    heatmap: '[data-tour="heatmap"]',
    heatmapGrid: '.heatmap',
    trend: '[data-tour="trend"]',
    narrative: '[data-insights-narrative]',
    download: '[data-narrative-download]',
    followUp: '[data-insights-narrative] [data-insights] h2:nth-of-type(2)',
};

const server = await serveStatic(DOCS_ROOT, 5074); // 5070 is left free for a local preview server
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 }, timezoneId: 'America/New_York' });
await page.goto(`${server.url}/storyraise-analytics/demo/`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

async function measure(tab) {
    await page.evaluate((t) => window.SRReplica.setTab(t), tab);
    await page.waitForTimeout(150);
    return page.evaluate((targets) => {
        const out = {};
        for (const [name, selector] of Object.entries(targets)) {
            const el = document.querySelector(selector);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            out[name] = { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
        }
        return out;
    }, TARGETS);
}

const numbers = await measure('overview');
const story = await measure('summary');
// The dashboard's html/body are height:100%, so scrollHeight reports the window;
// the page really ends below the last card.
const pageHeight = numbers.trend.y + numbers.trend.h + 70;
const storyHeight = story.narrative.y + story.narrative.h + 70;

const missing = Object.keys(TARGETS).filter((k) => !numbers[k] && !story[k]);
if (missing.length) throw new Error(`targets not found: ${missing.join(', ')}`);

fs.writeFileSync(OUT, JSON.stringify({ width: WIDTH, numbers, story: { narrative: story.narrative, download: story.download, followUp: story.followUp }, pageHeight, storyHeight }, null, 2) + '\n');
console.log(`measured ${Object.keys(numbers).length} numbers targets and story targets; page ${pageHeight}px`);
await browser.close();
await server.close();
