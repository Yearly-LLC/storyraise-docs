// Check the interactive demo and the video's chapter chips on the landing page.
//
//   node scripts/verify-tour.mjs
//
// Demo, at several sizes and both themes: every stop's numbered marker shows on load (markers
// are on by default); clicking marker 1 opens its popover; the arrow keys walk all stops with
// the right title, focus, URL, spotlight, and an on-screen popover; Escape closes it and the
// markers stay. Also the ?step= deep link.
//
// Chapter chips run in installed Google Chrome, which plays H.264 (bundled Chromium cannot):
// clicking a chip must seek the video to that chapter rather than restart it.
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, SITE_DIR, readJson } from './lib/identity.mjs';
import { serveStatic } from './lib/static-server.mjs';

const { stops } = readJson(path.join(SITE_DIR, 'annotations.json'));
const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1024, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'phone', width: 390, height: 844 },
];
const SCHEMES = ['light', 'dark'];

const server = await serveStatic(DOCS_ROOT, 5073); // 5070 is left free for a local preview server
const failures = [];
const note = (where, message) => failures.push(`${where}: ${message}`);

async function openDemo(page) {
    await page.goto(`${server.url}/storyraise-analytics/`, { waitUntil: 'load' });
    await page.evaluate(() => document.getElementById('demo').scrollIntoView({ block: 'start' }));
    await page.waitForFunction(() => {
        const f = document.querySelector('#demo-frame iframe');
        return f && f.contentWindow && f.contentWindow.SRReplica;
    }, null, { timeout: 20000 });
    await page.waitForTimeout(1200);
}

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
        const where = `${vp.name}/${scheme}`;
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme, timezoneId: 'America/New_York' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });

        await openDemo(page);
        const markers = await page.evaluate(() => document.querySelectorAll('.sra-hotspot').length);
        if (markers !== stops.length) note(where, `${markers} markers on load, expected ${stops.length}`);

        await page.click(`.sra-hotspot[data-stop="${stops[0].id}"]`);
        for (let i = 0; i < stops.length; i++) {
            await page.waitForTimeout(i === 0 ? 900 : 800);
            const state = await page.evaluate(() => {
                const pop = document.getElementById('sra-popover');
                const r = pop.getBoundingClientRect();
                const spot = document.querySelector('.sra-spotlight');
                const title = pop.querySelector('#sra-pop-title');
                return {
                    open: !pop.hidden,
                    title: title ? title.textContent : '',
                    focused: document.activeElement === title,
                    rect: { left: r.left, right: r.right },
                    docked: getComputedStyle(pop).position === 'static',
                    spotlight: !spot.hidden,
                    step: new URL(location.href).searchParams.get('step'),
                };
            });
            const stop = stops[i];
            if (!state.open) { note(where, `stop ${i + 1} popover not open`); break; }
            if (state.title !== stop.title) note(where, `stop ${i + 1} title "${state.title}" != "${stop.title}"`);
            // A marker click keeps focus on the marker; keyboard steps move it to the popover.
            if (i > 0 && !state.focused) note(where, `stop ${i + 1} title not focused`);
            if (state.step !== stop.id) note(where, `stop ${i + 1} URL step=${state.step}`);
            if (!state.docked && (state.rect.left < -1 || state.rect.right > vp.width + 1)) note(where, `stop ${i + 1} popover off screen horizontally`);
            if (!state.spotlight) note(where, `stop ${i + 1} (${stop.id}) has no spotlight`);
            if (i < stops.length - 1) await page.keyboard.press('ArrowRight');
        }

        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => ({ closed: document.getElementById('sra-popover').hidden, markers: document.querySelectorAll('.sra-hotspot').length }));
        if (!after.closed) note(where, 'Escape did not close the popover');
        if (after.markers !== stops.length) note(where, `${after.markers} markers after closing, expected ${stops.length}`);

        if (errors.length) note(where, `console errors: ${errors.slice(0, 3).join(' | ')}`);
        await context.close();
    }
}

// Deep link.
{
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${server.url}/storyraise-analytics/?step=views`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const title = await page.evaluate(() => (document.querySelector('#sra-pop-title') || {}).textContent);
    if (title !== 'Views') note('deep link', `?step=views opened "${title}"`);
    await page.close();
}
await browser.close();

// Chapter chips, in real Chrome.
{
    const chrome = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await chrome.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${server.url}/storyraise-analytics/`, { waitUntil: 'load' });
    await page.waitForSelector('#tour-chapters button', { timeout: 10000 });
    const chips = await page.$$eval('#tour-chapters button .sra-chapter-time', (els) => els.map((el) => el.textContent));
    const toSeconds = (label) => label.split(':').reduce((total, part) => total * 60 + Number(part), 0);
    for (const index of [3, 7]) {
        if (!chips[index]) { note('chapters', `no chip ${index + 1}`); continue; }
        const target = toSeconds(chips[index]);
        await page.click(`#tour-chapters li:nth-child(${index + 1}) button`);
        const reached = await page.waitForFunction((t) => {
            const v = document.getElementById('tour-video');
            return v.currentTime >= t - 0.5 && v.currentTime < t + 6;
        }, target, { timeout: 10000 }).then(() => true).catch(() => false);
        const now = await page.evaluate(() => document.getElementById('tour-video').currentTime);
        if (!reached) note('chapters', `chip ${index + 1} (${chips[index]}) left the video at ${now.toFixed(1)}s`);
    }
    await chrome.close();
}

await server.close();
if (failures.length) {
    console.log(`${failures.length} problem(s):\n  ${failures.join('\n  ')}`);
    process.exit(1);
}
console.log(`demo OK: ${stops.length} markers and stops x ${VIEWPORTS.length} sizes x ${SCHEMES.length} themes, deep link; chapter chips seek`);
