// Parity check: does the demo show what the live Analytics page showed?
//
//   node scripts/verify-replica.mjs [path/to/live-snapshot.yml]
//
// Reads the accessibility snapshot captured from the production page
// (#/ramsey/insights/engagement-demo), keeps the analytics content (between the
// page title and the contact card), applies the demo's identity rename, and checks
// that every label, value, name, tooltip, and chart title appears in the demo page's
// text or accessible attributes.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { DOCS_ROOT, config, renameString } from './lib/identity.mjs';
import { serveStatic } from './lib/static-server.mjs';

const SNAPSHOT = process.argv[2] || path.join(config.builder.path, '.playwright-mcp', 'page-2026-09-10T17-12-09-787Z.yml');
const lines = fs.readFileSync(SNAPSHOT, 'utf8').split('\n');

const start = lines.findIndex((l) => /heading "Analytics:/.test(l));
const stop = lines.findIndex((l, i) => i > start && /always improving Insights/.test(l));
const region = lines.slice(start, stop === -1 ? lines.length : stop);

// Pull quoted accessible names and trailing text values out of the YAML lines.
// Lines look like `- generic "Accessible name" [ref=f8e1]: trailing text`. A quoted
// name can itself contain ": " (e.g. ribbon titles), so take the name from the quotes
// and the trailing text only from after the closing `]:`.
const expected = new Set();
for (const line of region) {
    const quoted = line.match(/^\s*-?\s*'?[a-z]+ "(.+)"(?: \[[^\]]*\])*'?:?\s*(.*)$/i);
    if (quoted) {
        expected.add(quoted[1]);
        const trailing = quoted[2].replace(/^['"]|['"]$/g, '').trim();
        if (trailing) expected.add(trailing);
        continue;
    }
    const text = line.match(/^\s*-\s*(?:text|paragraph|generic|strong|heading)(?: \[[^\]]*\])*:\s*(.+)$/);
    if (text) expected.add(text[1].replace(/^['"]|['"]$/g, '').trim());
}

const IGNORE = [
    /^\/url/,                                   // link targets
    /^(arrow_back|Back)$/,                      // removed Back button
    /^Analytics: Engagement Demo$/,             // renamed title, checked separately below
    /^[a-z_]+$/,                                // bare icon ligature names
    /account page|excluding collaborators|See how your published reports|edit setting in the/i, // removed intro paragraph
    /^Zoom (in|out)$/,                          // map controls: aria-labels checked via attributes
];
const checks = [...expected]
    .map((s) => renameString(s.replace(/\s+/g, ' ').trim()))
    .filter((s) => s.length > 1 && !IGNORE.some((re) => re.test(s)));
checks.push(`Analytics: ${config.identity.report_title}`);

const server = await serveStatic(DOCS_ROOT, 5072); // 5070 is left free for a local preview server
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, timezoneId: config.capture.timezone });
await page.goto(`${server.url}/storyraise-analytics/demo/`, { waitUntil: 'load' });
const haystack = await page.evaluate(() => {
    const parts = [document.body.innerText];
    document.querySelectorAll('[title], [aria-label], [data-tip], [data-tooltip]').forEach((el) => {
        ['title', 'aria-label', 'data-tip', 'data-tooltip'].forEach((a) => el.hasAttribute(a) && parts.push(el.getAttribute(a)));
    });
    document.querySelectorAll('svg title, svg text').forEach((el) => parts.push(el.textContent));
    return parts.join('\n').replace(/\s+/g, ' ');
});
await browser.close();
await server.close();

// innerText applies CSS text-transform (the donut's "clicked a link" renders uppercase),
// so compare without case or whitespace as the fallback.
const compact = (s) => s.replace(/\s+/g, '').toLowerCase();
const flat = compact(haystack);
const missing = checks.filter((s) => !haystack.includes(s) && !flat.includes(compact(s)));
console.log(`checked ${checks.length} strings from the live page`);
if (missing.length) {
    console.log(`${missing.length} missing from the demo:\n  ${missing.slice(0, 60).join('\n  ')}`);
    process.exit(1);
}
console.log('parity OK: every label, value, and name from the live page is in the demo');
