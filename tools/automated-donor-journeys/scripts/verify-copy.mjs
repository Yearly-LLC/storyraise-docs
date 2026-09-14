// Check the page's copy against the knowledge base and the house style.
//
//   node scripts/verify-copy.mjs
//
// 1. Every knowledge base link on the page resolves to a built article.
// 2. Our own prose (landing page, narration, captions) has no em dashes and no British
//    spellings, and never calls report views "email opens".
// 3. The product labels the page quotes still exist in the builder the video was
//    captured from (config.builder.path).
import fs from 'node:fs';
import path from 'node:path';
import { DOCS_ROOT, SITE_DIR, config } from './lib/identity.mjs';
import { enabledScenes, parseScene } from '../video/tools/script.mjs';

const problems = [];
const text = (html) => html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/\s+/g, ' ');

const landingHtml = fs.readFileSync(path.join(SITE_DIR, 'index.html'), 'utf8');

// 1. Knowledge base links
const hrefs = new Set([...landingHtml.matchAll(/href="(\/docs\/[^"#?]+)/g)].map((m) => m[1]));
for (const href of hrefs) {
    const file = path.join(DOCS_ROOT, href.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(file)) problems.push(`[link] ${href} does not exist`);
}

// 2. House style on our prose
const BRITISH = /\b(organisation|organise|colour|behaviour|analyse|centre|favourite|personalised|recognised|programme|licence|catalogue|travelling|cancelled)s?\b/i;
const prose = [['landing page', text(landingHtml)]];
enabledScenes().forEach((s) => prose.push([`narration ${s.id}`, parseScene(s.text).captionText]));
const vtt = path.join(SITE_DIR, 'media', 'automated-donor-journeys-tour.en.vtt');
if (fs.existsSync(vtt)) prose.push(['captions', fs.readFileSync(vtt, 'utf8')]);
for (const [where, value] of prose) {
    if (!value) continue;
    if (value.includes('—')) problems.push(`[style] ${where}: em dash`);
    const british = value.match(BRITISH);
    if (british) problems.push(`[style] ${where}: British spelling "${british[0]}"`);
    if (/email open/i.test(value)) {
        const sentences = value.split(/(?<=[.!?])\s+/).filter((s) => /email open/i.test(s));
        if (sentences.some((s) => !/\bnot\b/i.test(s))) problems.push(`[accuracy] ${where}: calls something an email open`);
    }
}

// 3. Product labels quoted on the page and in the narration
const LABELS = ['Connections', 'Add a connection', 'Connect', 'Auto-sync', 'Frequency', 'Daily', 'Weekly', 'Sync now', 'Send this in an email', 'Email tool', 'Copy link', 'Send in an email'];
const builderText = ['public/index.html', 'public/js/app-dashboard.js']
    .map((f) => fs.readFileSync(path.join(config.builder.path, f), 'utf8'))
    .join('\n');
for (const label of LABELS) {
    if (!builderText.includes(label)) problems.push(`[label] "${label}" is not in the builder at ${config.builder.path}`);
}

if (problems.length) {
    console.log(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    process.exit(1);
}
console.log(`copy OK: ${hrefs.size} knowledge base links, ${prose.length} prose blocks, ${LABELS.length} product labels`);
