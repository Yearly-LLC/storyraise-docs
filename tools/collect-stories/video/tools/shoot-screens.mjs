// Photograph each demo screen state at 3x for the video, and measure every tour anchor.
//
//   node video/tools/shoot-screens.mjs [--only builder]
//
// The Collect stories demo spans seven product screens, each with its own product CSS,
// so they cannot share one HyperFrames document the way the single-screen kits did.
// Instead each state of each built screen (collect-stories/demo/<screen>.html) is shot
// as a full-page still at 3x, which stays sharp up to the camera's 2.6x zoom, and every
// data-tour anchor plus a few named extras is measured in page pixels at the same time.
// The stills are the product's own rendering; only the camera moves.
//
// Writes video/assets/shots/<screen>-<state>.png and video/targets.json.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SITE_DIR, TOOLS_DIR, readJson } from '../../scripts/lib/identity.mjs';
import { serveStatic } from '../../scripts/lib/static-server.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const OUT = path.join(VIDEO, 'assets', 'shots');
const TARGETS = path.join(VIDEO, 'targets.json');
export const PAGE_W = 1440;
const PAGE_H = 900;
const DPR = 3;
const PORT = 5085;

/*
    Extras are things the narration names that carry no data-tour anchor: an element by
    selector, or the smallest element whose text matches.
*/
const SHOTS = [
    { screen: 'collect-new', state: 'list', extra: {} },
    { screen: 'collect-new', state: 'types', extra: {} },
    { screen: 'collect-editor', state: 'form', extra: {} },
    { screen: 'collect-editor', state: 'field', extra: {} },
    { screen: 'collect-editor', state: 'upload', extra: {} },
    { screen: 'collect-editor', state: 'fund', extra: {} },
    { screen: 'collect-link', state: 'link', extra: { modal: { sel: '.modal-box' } } },
    { screen: 'collect-form', state: 'filled', extra: {} },
    { screen: 'collect-form', state: 'photo', extra: {} },
    { screen: 'collect-grid', state: 'grid', extra: {} },
    { screen: 'collect-grid', state: 'drawer', extra: {} },
    { screen: 'builder', state: 'insert', vh: 1080, extra: {} },
    { screen: 'builder', state: 'repeater', vh: 1080, extra: {} },
    { screen: 'builder', state: 'photo', vh: 1080, extra: {} },
    { screen: 'profile', state: 'profile', extra: {} },
    { screen: 'builder', state: 'card', vh: 1080, extra: {} },
    { screen: 'preview', state: 'emily', extra: {} },
    { screen: 'preview', state: 'james', extra: {} },
];

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
fs.mkdirSync(OUT, { recursive: true });
const targets = fs.existsSync(TARGETS) ? readJson(TARGETS) : {};
targets.width = PAGE_W;
targets.dpr = DPR;
targets.shots = targets.shots || {};

const server = await serveStatic(SITE_DIR, PORT);
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
const context = await browser.newContext({ viewport: { width: PAGE_W, height: PAGE_H }, deviceScaleFactor: DPR, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

for (const shot of SHOTS) {
    if (only && shot.screen !== only) continue;
    const key = `${shot.screen}-${shot.state}`;
    const file = path.join(SITE_DIR, 'demo', `${shot.screen}.html`);
    if (!fs.existsSync(file)) { if (shot.optional) continue; throw new Error(`no ${file}`); }
    // App-shell screens (builder, share) fill the window, so a taller one shows more of
    // the sidebar the narration walks through.
    await page.setViewportSize({ width: PAGE_W, height: shot.vh || PAGE_H });
    await page.goto(`${server.url}/demo/${shot.screen}.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SRScreen);
    const has = await page.evaluate((s) => window.SRScreen.states.includes(s), shot.state);
    if (!has) { if (shot.optional) continue; throw new Error(`${shot.screen} has no state ${shot.state}`); }
    await page.evaluate(async (s) => { await window.SRScreen.setState(s); if (window.SRScreen.ready) await window.SRScreen.ready(); }, shot.state);
    await page.addStyleTag({ content: '#replica-toast{display:none!important} ::-webkit-scrollbar{display:none}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    const measured = await page.evaluate(({ extra }) => {
        const box = (el) => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
        };
        const out = {};
        // Builder canvas anchors sit in a nested iframe; getTargetRect corrects for it.
        for (const id of window.SRScreen.getTargets()) {
            const el = window.SRScreen.getTarget(id);
            const r = window.SRScreen.getTargetRect ? window.SRScreen.getTargetRect(id) : el && el.getBoundingClientRect();
            if (r && r.width && r.height) out[id] = { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
        }
        for (const [name, f] of Object.entries(extra)) {
            let el = null;
            if (f.all) {
                // The union of every match, e.g. a run of table headers.
                const rs = Array.from(document.querySelectorAll(f.all)).map((n) => n.getBoundingClientRect()).filter((r) => r.width > 0);
                if (!rs.length) throw new Error(`extra ${name} not found`);
                const x = Math.min(...rs.map((r) => r.left)); const y = Math.min(...rs.map((r) => r.top));
                out[name] = { x: Math.round(x + scrollX), y: Math.round(y + scrollY), w: Math.round(Math.max(...rs.map((r) => r.right)) - x), h: Math.round(Math.max(...rs.map((r) => r.bottom)) - y) };
                continue;
            }
            if (f.sel) el = Array.from(document.querySelectorAll(f.sel)).find((n) => n.getBoundingClientRect().width > 0);
            else if (f.text) {
                const re = new RegExp(f.text);
                el = Array.from(document.querySelectorAll('body *')).filter((n) => re.test(n.textContent) && n.getBoundingClientRect().width > 0)
                    .sort((a, b) => a.textContent.length - b.textContent.length)[0];
            }
            if (!el) throw new Error(`extra ${name} not found`);
            out[name] = box(el);
        }
        return { rects: out, height: Math.max(document.documentElement.scrollHeight, innerHeight) };
    }, { extra: Object.fromEntries(Object.entries(shot.extra).map(([k, v]) => [k, v.text ? { text: v.text.source } : v])) });

    await page.screenshot({ path: path.join(OUT, `${key}.png`), fullPage: true });
    targets.shots[key] = { src: `assets/shots/${key}.png`, height: measured.height, rects: measured.rects };
    console.log(`${key}: ${PAGE_W}x${measured.height}, ${Object.keys(measured.rects).length} rects`);
}

fs.writeFileSync(TARGETS, JSON.stringify(targets, null, 1) + '\n');
await browser.close();
await server.close();
if (errors.length) { console.error(errors); process.exit(1); }
