// Check the page's copy against the product and the house style.
//
//   node scripts/verify-copy.mjs
//
// 1. Every UI label an annotation quotes exists, word for word, in the replica.
// 2. Every knowledge base link resolves to a built article.
// 3. Our own prose (annotations, landing page, narration, captions) has no em
//    dashes, no British spellings, and never calls report views "email opens".
//    Replicated product UI is exempt: it stays exactly as the product shows it.
import fs from 'node:fs';
import path from 'node:path';
import { DOCS_ROOT, SITE_DIR, TOOLS_DIR, readJson } from './lib/identity.mjs';
import { enabledScenes, parseScene } from '../video/tools/script.mjs';

const problems = [];
const text = (html) => html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/\s+/g, ' ');

const annotations = readJson(path.join(SITE_DIR, 'annotations.json'));
const replicaText = text(fs.readFileSync(path.join(SITE_DIR, 'demo', 'index.html'), 'utf8'));

// 1. UI labels
for (const stop of annotations.stops) {
    for (const label of stop.uiLabel || []) {
        if (!replicaText.includes(label)) problems.push(`[label] ${stop.id}: "${label}" is not on the replica page`);
    }
}

// 2. Knowledge base links (annotations + landing page)
const landingHtml = fs.readFileSync(path.join(SITE_DIR, 'index.html'), 'utf8');
const hrefs = new Set([
    ...annotations.stops.map((s) => s.kb && s.kb.href).filter(Boolean),
    ...[...landingHtml.matchAll(/href="(\/docs\/[^"#?]+)/g)].map((m) => m[1]),
]);
for (const href of hrefs) {
    const file = path.join(DOCS_ROOT, href.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(file)) problems.push(`[link] ${href} does not exist`);
}

// 3. House style on our prose
const BRITISH = /\b(organisation|organise|colour|behaviour|analyse|centre|favourite|personalised|recognised|programme|licence|catalogue|travelling|cancelled)s?\b/i;
const prose = [];
for (const stop of annotations.stops) {
    for (const field of ['title', 'tells', 'why', 'next']) prose.push([`annotations ${stop.id}.${field}`, stop[field]]);
    (stop.keepInMind || []).forEach((k, i) => prose.push([`annotations ${stop.id}.keepInMind[${i}]`, k]));
}
prose.push(['landing page', text(landingHtml)]);
enabledScenes().forEach((s) => prose.push([`narration ${s.id}`, parseScene(s.text).captionText]));
const vtt = path.join(SITE_DIR, 'media', 'storyraise-analytics-tour.en.vtt');
if (fs.existsSync(vtt)) prose.push(['captions', fs.readFileSync(vtt, 'utf8')]);

for (const [where, value] of prose) {
    if (!value) continue;
    if (value.includes('—')) problems.push(`[style] ${where}: em dash`);
    const british = value.match(BRITISH);
    if (british) problems.push(`[style] ${where}: British spelling "${british[0]}"`);
    if (/email open/i.test(value)) {
        // Allowed only when saying views are NOT email opens.
        const sentences = value.split(/(?<=[.!?])\s+/).filter((s) => /email open/i.test(s));
        if (sentences.some((s) => !/\bnot\b/i.test(s))) problems.push(`[accuracy] ${where}: calls something an email open`);
    }
}

if (problems.length) {
    console.log(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    process.exit(1);
}
console.log(`copy OK: ${annotations.stops.length} stops, ${hrefs.size} knowledge base links, ${prose.length} prose blocks`);
