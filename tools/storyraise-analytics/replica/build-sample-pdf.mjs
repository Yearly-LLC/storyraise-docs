// Render the "Download this summary" PDF for the demo.
//
//   node replica/build-sample-pdf.mjs      (after build-replica.mjs)
//
// Uses the product's own print layout (export_narrative_pdf in the builder's
// app-dashboard.js) and the narrative HTML already in the built demo page, then
// prints it with headless Chromium instead of the browser's print dialog.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { config, SITE_DIR } from '../scripts/lib/identity.mjs';

const DEMO = path.join(SITE_DIR, 'demo');
const OUT = path.join(DEMO, 'sample-summary.pdf');

// Verbatim from export_narrative_pdf, except the PPFragment face, which the
// docs site hosts itself.
const PRINT_STYLES = `
    @font-face {
        font-family: "PPFragment TextRegular";
        font-weight: 100 400;
        src: url("file://${path.join(SITE_DIR, '..', 'assets', 'fonts', 'PPFragment-TextRegular.woff2')}") format("woff2");
    }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1b1d21; line-height: 1.55; margin: 0; padding: 2.5rem; }
    .doc { max-width: 46rem; margin: 0 auto; }
    .doc-logo { height: 2rem; display: block; margin-bottom: 1.25rem; }
    .doc-meta { color: #6b7280; font-size: 0.8rem; letter-spacing: 0.02em;
        border-bottom: 1px solid #e5e7eb; padding-bottom: 0.75rem; margin-bottom: 1.5rem; }
    h1, h2, h3 { font-family: "PPFragment TextRegular", Georgia, serif; font-weight: 100; }
    h1 { font-size: 1.6rem; margin: 0 0 1rem; line-height: 1.25; }
    h2 { font-size: 1.15rem; margin: 1.75rem 0 0.5rem; }
    h3 { font-size: 1rem; margin: 1.25rem 0 0.4rem; }
    p, li { font-size: 0.95rem; }
    ul, ol { padding-left: 1.25rem; }
    li { margin: 0.2rem 0; }
    strong { color: #111; }
    @page { margin: 1in; }
`;

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${path.join(DEMO, 'index.html')}`);
const { narrativeHtml, updated } = await page.evaluate(() => ({
    narrativeHtml: document.querySelector('[data-insights-narrative] [data-insights] > div').innerHTML,
    updated: (document.querySelector('[data-narrative-meta] span') || {}).textContent || '',
}));
const generated = updated.replace(/^\s*Last updated\s*/, '').trim();
const logo = `file://${path.join(SITE_DIR, '..', 'assets', 'logo-light.svg')}`;

await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8">'
    + `<title>${esc(config.identity.report_title)} — Engagement Summary</title>`
    + `<style>${PRINT_STYLES}</style></head><body><div class="doc">`
    + `<img class="doc-logo" src="${logo}" alt="Storyraise">`
    + `<div class="doc-meta">${esc(config.identity.org_name + (generated ? ' · Generated ' + generated : ''))}</div>`
    + narrativeHtml
    + '</div></body></html>',
    { waitUntil: 'load' },
);
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: OUT, format: 'Letter', printBackground: true, margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' } });
await browser.close();
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
