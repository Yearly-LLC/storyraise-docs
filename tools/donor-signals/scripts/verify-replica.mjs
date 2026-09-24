// Parity check: does the demo show what the live Donor Signals page showed?
//
//   node scripts/verify-replica.mjs
//
// The Analytics demo compared against a separate accessibility snapshot of the
// production page. Donor Signals has no single page to snapshot: what is on the
// screen changes with the group and the view, so the capture itself holds the
// twelve tile/view fragments and the four dialogs straight off the live app.
// This walks the built demo through all sixteen of those states through
// window.SRReplica and checks that every piece of text the live app rendered is
// still rendered here. It also asserts the demo reaches nothing off the page.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, TOOLS_DIR, config } from './lib/identity.mjs';
import { serveStatic } from './lib/static-server.mjs';

const capture = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, '.cache', 'replica', 'capture.json'), 'utf8'));

// The captured fragment is compared as it RENDERS, not as it reads in the source.
// Plenty of the markup never reaches the screen (the group tiles carry a sub-label
// that `.sig-kpis-filter .sig-kpi-sub` hides), so a source comparison would flag
// text the live app does not show either. Rendering both sides under the same
// stylesheet is also the check that matters: it is what catches the build, whose
// job is to localize the cover images and trim the CSS, changing what is visible.
// The probe's <img> sources are stripped so the check itself stays offline.
const offline = (html) => html
    .replace(/\ssrc="[^"]*"/g, ' src=""')
    .replace(/url\((?:&quot;|["'])?https?:\/\/[^)]*\)/g, 'none');
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const server = await serveStatic(DOCS_ROOT, 5072); // 5070 is left free for a local preview server
const browser = await chromium.launch();
// Same viewport the capture used, or every responsive rule lands somewhere else
// and the geometry comparison below is meaningless.
const page = await browser.newPage({ viewport: config.capture.viewport, deviceScaleFactor: 1, timezoneId: config.capture.timezone });

const external = [];
const consoleErrors = [];
page.on('request', (r) => { if (!r.url().startsWith(server.url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(`${server.url}/donor-signals/demo/`, { waitUntil: 'networkidle' });

const problems = [];
let checked = 0;

/*
    The live app's own screenshots of the card and each dialog are in the capture.
    Their pixel size is the shape the product rendered, so comparing the demo's box
    against them catches what a text comparison cannot: a dialog that lost its modal
    styling and reflowed into the page, a card that collapsed, a rule PurgeCSS cut.
*/
const shotsDir = path.join(TOOLS_DIR, '.cache', 'replica', 'app-shots');
function shotSize(name) {
    const file = path.join(shotsDir, `${name}.png`);
    if (!fs.existsSync(file)) return null;
    const head = Buffer.alloc(24);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, head, 0, 24, 0);
    fs.closeSync(fd);
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}
async function boxOf(selector) {
    return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height), position: getComputedStyle(el).position };
    }, selector);
}
function compareBox(label, box, shot, tolerance = 2) {
    if (!shot) return;
    if (!box) { problems.push(`[shape] ${label}: nothing matched on the page`); return; }
    if (Math.abs(box.width - shot.width) > tolerance || Math.abs(box.height - shot.height) > tolerance) {
        problems.push(`[shape] ${label}: the demo renders ${box.width}x${box.height}, the live app rendered ${shot.width}x${shot.height}`);
    }
}

async function read(selector) {
    return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText : null;
    }, selector);
}

/*
    Render a captured fragment off to the side of the real card, inside the same
    [data-signals] ancestor and at the same width, so every scoped and responsive
    rule applies exactly as it does to the live one.
*/
async function renderCaptured(html, hostSelector) {
    return page.evaluate(([markup, sel]) => {
        const ref = document.querySelector(sel);
        if (!ref) return null;
        const probe = document.createElement('div');
        probe.id = 'parity-probe';
        probe.style.cssText = `position:absolute;left:-99999px;top:0;width:${ref.offsetWidth}px;`;
        probe.innerHTML = markup;
        (ref.parentElement || document.body).appendChild(probe);
        const text = probe.innerText;
        probe.remove();
        return text;
    }, [html, hostSelector]);
}

// ---- The twelve group/view states ----
for (const key of Object.keys(capture.states)) {
    const [tile, view] = key.split('|');
    await page.evaluate(([t, v]) => { window.SRReplica.setTile(t); window.SRReplica.setView(v); }, [tile, view]);
    await page.waitForTimeout(80);
    const live = await read('[data-signals] .sig-block');
    if (live == null) { problems.push(`[state] ${key}: no .sig-block on the page`); continue; }
    if (view === 'feed') compareBox(`tile-${tile}`, await boxOf('[data-signals] .sig-block'), shotSize(`tile-${tile}`));
    const want = await renderCaptured(offline(capture.states[key]), '[data-signals] .sig-block');
    checked += 1;
    if (norm(live) !== norm(want)) {
        const a = norm(want).split(' ');
        const b = norm(live).split(' ');
        const at = a.findIndex((w, i) => b[i] !== w);
        problems.push(`[state] ${key}: renders differently from the capture, from word ${at}: captured "${a.slice(at, at + 12).join(' ')}" / demo "${b.slice(at, at + 12).join(' ')}"`);
    }
}

// ---- The four follow-up dialogs ----
await page.evaluate(() => { window.SRReplica.setTile('new_gifts'); window.SRReplica.setView('feed'); });
for (const key of Object.keys(capture.dialogs)) {
    if (!capture.dialogs[key]) continue;
    await page.evaluate((k) => window.SRReplica.openDialog(k), key);
    await page.waitForTimeout(80);
    const live = await read('#replica-dialog');
    if (live == null) { problems.push(`[dialog] ${key}: did not open`); continue; }
    compareBox(`dialog-${key}`, await boxOf('#replica-dialog .sig-modal'), shotSize(`dialog-${key}`));
    const backdrop = await boxOf('#replica-dialog .sig-modal-backdrop');
    if (!backdrop || backdrop.position !== 'fixed') problems.push(`[shape] dialog-${key}: the backdrop is ${backdrop ? backdrop.position : 'missing'}, not fixed`);
    const want = await renderCaptured(offline(capture.dialogs[key]), '#replica-dialog');
    checked += 1;
    if (norm(live) !== norm(want)) {
        const a = norm(want).split(' ');
        const b = norm(live).split(' ');
        const at = a.findIndex((w, i) => b[i] !== w);
        problems.push(`[dialog] ${key}: renders differently from the capture, from word ${at}: captured "${a.slice(at, at + 12).join(' ')}" / demo "${b.slice(at, at + 12).join(' ')}"`);
    }
    await page.evaluate(() => window.SRReplica.closeDialog());
}

await browser.close();
await server.close();

// ---- The demo is a closed box ----
for (const url of [...new Set(external)]) problems.push(`[network] the demo requested ${url}`);
for (const err of consoleErrors) problems.push(`[console] ${err}`);

console.log(`compared ${checked} rendered states across ${Object.keys(capture.states).length} states and ${Object.keys(capture.dialogs).length} dialogs`);
if (problems.length) {
    console.log(`${problems.length} problem(s):\n  ${problems.slice(0, 60).join('\n  ')}`);
    process.exit(1);
}
console.log('parity OK: every state renders exactly as the live app rendered it, and the demo asks the network for nothing');
