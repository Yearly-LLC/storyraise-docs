// Parity check: does the demo show what the live Connections page showed?
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
const browser = await chromium.launch({ executablePath: process.env.SR_CHROMIUM || undefined });
// Same viewport the capture used, or every responsive rule lands somewhere else
// and the geometry comparison below is meaningless.
const page = await browser.newPage({ viewport: config.capture.viewport, deviceScaleFactor: 1, timezoneId: config.capture.timezone });

const external = [];
const consoleErrors = [];
page.on('request', (r) => { if (!r.url().startsWith(server.url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(`${server.url}/connections-and-sync/demo/`, { waitUntil: 'networkidle' });

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

// ---- The page itself: the section box, and its text against the capture ----
{
    compareBox('connections', await boxOf('section[data-connections]'), shotSize('connections'));
    const live = await read('section[data-connections]');
    const wantHtml = await page.evaluate((html) => {
        const d = document.createElement('div');
        d.innerHTML = html;
        return d.querySelector('section[data-connections]').outerHTML;
    }, offline(capture.dashboardHtml));
    const want = await renderCaptured(wantHtml, 'section[data-connections]');
    checked += 1;
    if (norm(live) !== norm(want)) {
        const a = norm(want).split(' ');
        const b = norm(live).split(' ');
        const at = a.findIndex((w, i) => b[i] !== w);
        problems.push(`[page] renders differently from the capture, from word ${at}: captured "${a.slice(at, at + 12).join(' ')}" / demo "${b.slice(at, at + 12).join(' ')}"`);
    }
}

// ---- The ⋯ menus ----
for (const vendor of ['blackbaud', 'salesforce']) {
    await page.evaluate((v) => window.SRReplica.openMenu(v), vendor);
    // daisyUI scales the menu in from 95%; measure after the transition.
    await page.waitForTimeout(500);
    compareBox(`menu-${vendor}`, await boxOf(`[data-sr-menu="${vendor}"] .dropdown-content`), shotSize(`menu-${vendor}`));
    const vis = await page.evaluate((v) => getComputedStyle(document.querySelector(`[data-sr-menu="${v}"] .dropdown-content`)).visibility, vendor);
    if (vis !== 'visible') problems.push(`[menu] ${vendor}: the menu is ${vis} when open`);
    await page.evaluate(() => window.SRReplica.closeMenu());
}

// ---- The dialogs ----
for (const key of Object.keys(capture.dialogs)) {
    if (!capture.dialogs[key]) continue;
    await page.evaluate((k) => window.SRReplica.openDialog(k), key);
    await page.waitForTimeout(80);
    const live = await read('#replica-dialog .modal-box');
    if (live == null) { problems.push(`[dialog] ${key}: did not open`); continue; }
    compareBox(`dialog-${key}`, await boxOf('#replica-dialog .modal-box'), shotSize(`dialog-${key}`));
    const modal = await boxOf('#replica-dialog .modal');
    if (!modal || modal.position !== 'fixed') problems.push(`[shape] dialog-${key}: the modal is ${modal ? modal.position : 'missing'}, not fixed`);
    const want = await renderCaptured(offline(capture.dialogs[key]).replace('class="modal"', 'class="modal" style="position:static;opacity:1;visibility:visible;pointer-events:auto"'), '#replica-dialog');
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

console.log(`compared ${checked} rendered states: the page and ${Object.keys(capture.dialogs).length} dialogs`);
if (problems.length) {
    console.log(`${problems.length} problem(s):\n  ${problems.slice(0, 60).join('\n  ')}`);
    process.exit(1);
}
console.log('parity OK: every state renders exactly as the live app rendered it, and the demo asks the network for nothing');
