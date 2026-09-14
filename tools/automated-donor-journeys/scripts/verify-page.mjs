// Check the landing page in a real browser.
//
//   node scripts/verify-page.mjs
//
// Serves the repo root with byte ranges (like GitHub Pages) and checks, in installed
// Chrome (bundled Chromium can't play H.264):
// - every chapter chip renders, and clicking one seeks the video;
// - the transcript has every scene, and the video's media all load;
// - the MP4 answers a byte-range request with 206;
// - on a 390px phone the hero buttons are hidden and nothing scrolls sideways;
// - no page errors, in light or dark.
// Screenshots land in .cache/page/.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, TOOLS_DIR } from './lib/identity.mjs';
import { serveStatic } from './lib/static-server.mjs';
import { enabledScenes } from '../video/tools/script.mjs';

const OUT = path.join(TOOLS_DIR, '.cache', 'page');
fs.mkdirSync(OUT, { recursive: true });
const SCENES = enabledScenes().length;
const server = await serveStatic(DOCS_ROOT, 5072);
const url = `${server.url}/automated-donor-journeys/`;
const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];

function watch(page, label) {
    page.on('pageerror', (e) => problems.push(`[${label}] page error: ${e.message}`));
    page.on('response', (r) => {
        // Chrome cancels in-flight media ranges when a video seeks; those aren't failures.
        if (r.status() >= 400 && !/\.mp4/.test(r.url())) problems.push(`[${label}] ${r.status()} ${r.url()}`);
    });
}

// ---- Desktop, light ----------------------------------------------------------
{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await context.newPage();
    watch(page, 'desktop');
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#tour-chapters:not([hidden]) button', { timeout: 15000 });

    const chips = await page.$$eval('#tour-chapters button', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
    if (chips.length !== SCENES) problems.push(`expected ${SCENES} chapter chips, got ${chips.length}`);
    const paragraphs = await page.$$eval('.sra-transcript-body p', (ps) => ps.length);
    if (paragraphs !== SCENES) problems.push(`expected ${SCENES} transcript paragraphs, got ${paragraphs}`);

    const statuses = await page.evaluate(async () => {
        const files = ['media/automated-donor-journeys-tour-poster.jpg', 'media/automated-donor-journeys-tour.en.vtt', 'media/chapters.en.vtt', 'media/og-automated-donor-journeys.png', 'journeys.css?v=2', 'journeys.js?v=2'];
        const out = {};
        for (const f of files) out[f] = (await fetch(f)).status;
        out.range = (await fetch('media/automated-donor-journeys-tour.mp4', { headers: { Range: 'bytes=0-1023' } })).status;
        return out;
    });
    Object.entries(statuses).forEach(([f, s]) => {
        if (f === 'range') { if (s !== 206) problems.push(`MP4 byte range answered ${s}, not 206`); }
        else if (s !== 200) problems.push(`${f} answered ${s}`);
    });

    // Merge tag tool: paste a link that is already personalized and has other parameters and
    // a section anchor, then check a platform's link, search, the empty state, and a custom tag.
    const tool = await page.evaluate(() => {
        const set = (id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); };
        const rows = Array.from(document.querySelectorAll('#tags-list .sra-tag-row'));
        const first = rows[0];
        const name = first.querySelector('.sra-tag-name').textContent;
        set('tags-link', 'harbor-lights.yearly.report/welcome?for=maria%40harborlights.example&utm_source=email#section-2');
        set('tags-search', name.toLowerCase());
        const visible = rows.filter((r) => !r.hidden);
        const result = {
            total: rows.length,
            name,
            tag: first.getAttribute('data-tag'),
            link: first.querySelector('.sra-tag-link code').textContent,
            button: first.querySelector('.sra-copy').textContent,
            visible: visible.length,
            allMatch: visible.every((r) => r.getAttribute('data-search').includes(name.toLowerCase())),
        };
        set('tags-custom', '{{ custom.email }}');
        result.custom = document.querySelector('#tags-custom-link code').textContent;
        set('tags-search', 'zzzz no such platform');
        result.empty = !document.querySelector('#tags-list .sra-tags-empty').hidden;
        set('tags-search', '');
        set('tags-link', '');
        set('tags-custom', '');
        return result;
    });
    const expected = (tag) => `https://harbor-lights.yearly.report/welcome?utm_source=email&for=${tag}#section-2`;
    if (tool.link !== expected(tool.tag)) problems.push(`merge tag link for ${tool.name} was ${tool.link}`);
    if (tool.button !== 'Copy link') problems.push(`copy button read "${tool.button}" with a link pasted`);
    if (tool.custom !== expected('{{ custom.email }}')) problems.push(`custom merge tag link was ${tool.custom}`);
    if (!tool.visible || !tool.allMatch) problems.push('platform search did not filter to matching rows');
    if (!tool.empty) problems.push('a search with no matches did not show the empty message');
    console.log(`merge tags: ${tool.total} platforms; ${tool.name} -> ${tool.link}`);

    await page.screenshot({ path: path.join(OUT, 'desktop-light.png'), fullPage: true });

    // The fifth chip ("One link for everyone") should move the video to its chapter.
    const chip = page.locator('#tour-chapters button').nth(4);
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    const seeked = await page.waitForFunction(() => {
        const v = document.getElementById('tour-video');
        return v && v.currentTime > 35 ? v.currentTime : false;
    }, null, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => null);
    if (!seeked) problems.push('clicking a chapter chip did not seek the video');
    console.log(`chips: ${chips.length}, transcript: ${paragraphs}, media: ${JSON.stringify(statuses)}, seek -> ${seeked ? seeked.toFixed(1) + 's' : 'none'}`);
    await context.close();
}

// ---- Desktop, dark (top of the page) -----------------------------------------------
{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await context.newPage();
    watch(page, 'dark');
    await page.goto(url, { waitUntil: 'load' });
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (theme !== 'dark') problems.push(`dark system setting gave data-theme="${theme}"`);
    await page.screenshot({ path: path.join(OUT, 'desktop-dark.png'), fullPage: true });
    await context.close();
}

// ---- Phone ---------------------------------------------------------------------
{
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    watch(page, 'phone');
    await page.goto(url, { waitUntil: 'load' });
    const layout = await page.evaluate(() => ({
        heroButtons: getComputedStyle(document.querySelector('.sra-hero-actions')).display,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    if (layout.heroButtons !== 'none') problems.push('hero buttons are visible on a phone');
    if (layout.overflow > 1) problems.push(`page scrolls sideways by ${layout.overflow}px on a 390px phone`);
    await page.screenshot({ path: path.join(OUT, 'phone.png'), fullPage: true });
    console.log(`phone: hero buttons ${layout.heroButtons}, sideways overflow ${layout.overflow}px`);
    await context.close();
}

await browser.close();
await server.close();
if (problems.length) {
    console.log(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    process.exit(1);
}
console.log(`page OK; screenshots in ${OUT}`);
