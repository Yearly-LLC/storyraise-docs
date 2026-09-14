// Fill the generated regions of automated-donor-journeys/index.html.
//
//   node scripts/build-landing.mjs
//
// The page is hand-written, but two regions come from source files so the copy has one
// home: the transcript (video/script/vo-script.json) and the video's structured data
// (the timeline). Each lives between <!-- AUTO:NAME --> markers.
import fs from 'node:fs';
import path from 'node:path';
import { SITE_DIR, TOOLS_DIR } from './lib/identity.mjs';
import { enabledScenes, parseScene } from '../video/tools/script.mjs';

const PAGE = path.join(SITE_DIR, 'index.html');
const URL = 'https://docs.storyraise.com/automated-donor-journeys/';
const script = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, 'video', 'script', 'vo-script.json'), 'utf8'));
const timelineFile = path.join(TOOLS_DIR, 'video', 'timeline.json');
const timeline = fs.existsSync(timelineFile) ? JSON.parse(fs.readFileSync(timelineFile, 'utf8')) : null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const spoken = enabledScenes(script);
const transcript = spoken
    .map((scene) => `        <p>${esc(parseScene(scene.text).captionText)}</p>`)
    .join('\n');

const duration = timeline ? timeline.duration : null;
const iso = duration ? `PT${Math.floor(duration / 60)}M${Math.round(duration % 60)}S` : null;
const videoLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebPage',
            '@id': `${URL}#page`,
            url: URL,
            name: 'Automated donor journeys',
            isPartOf: { '@id': 'https://docs.storyraise.com/#site' },
            inLanguage: 'en-US',
        },
        {
            '@type': 'VideoObject',
            name: 'Automated donor journeys with Storyraise',
            description: 'How a personalized Storyraise report, a CRM that syncs daily, and an email platform\'s automations send the right report at the right moment, to every donor, by name.',
            thumbnailUrl: `${URL}media/automated-donor-journeys-tour-poster.jpg`,
            contentUrl: `${URL}media/automated-donor-journeys-tour.mp4`,
            uploadDate: '2026-09-14',
            ...(iso ? { duration: iso } : {}),
            publisher: { '@id': 'https://storyraise.com/#org' },
        },
    ],
};

function fill(html, name, body) {
    const re = new RegExp(`(<!-- AUTO:${name} -->)[\\s\\S]*?(<!-- /AUTO:${name} -->)`);
    if (!re.test(html)) throw new Error(`missing AUTO:${name} markers in ${PAGE}`);
    return html.replace(re, `$1\n${body}\n      $2`);
}

// The merge tag tool's list. Every entry needs an official source, so an unverified tag
// can't reach the page; journeys.js adds search and the per-platform links on top.
const tagData = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, 'data', 'merge-tags.json'), 'utf8'));
const platforms = tagData.platforms.slice().sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
for (const p of platforms) {
    if (!p.name || !p.tag || !p.category || !/^https:\/\//.test(p.source || '')) {
        throw new Error(`merge-tags.json: "${p.name}" needs a name, category, tag, and an https source`);
    }
}
const tagRows = platforms.map((p) => {
    const search = [p.name, p.category, p.tag, ...(p.aliases || [])].join(' ').toLowerCase();
    const note = p.note ? `\n            <p class="sra-tag-note">${esc(p.note)}</p>` : '';
    return `          <li class="sra-tag-row" data-tag="${esc(p.tag)}" data-search="${esc(search)}">
            <div class="sra-tag-main"><span class="sra-tag-name">${esc(p.name)}</span><span class="sra-tag-cat">${esc(p.category)}</span></div>
            <code class="sra-tag-code">${esc(p.tag)}</code>
            <button type="button" class="sra-copy">Copy tag</button>
            <div class="sra-tag-link" hidden><code></code></div>${note}
          </li>`;
}).join('\n');

let html = fs.readFileSync(PAGE, 'utf8');
html = fill(html, 'TRANSCRIPT', transcript);
html = fill(html, 'MERGETAGS', tagRows);
html = fill(html, 'LD', `  <script type="application/ld+json">\n${JSON.stringify(videoLd, null, 2)}\n  </script>`);
fs.writeFileSync(PAGE, html);
console.log(`filled transcript (${spoken.length} scenes), merge tags (${platforms.length} platforms), and structured data${iso ? ` (${iso})` : ''}`);
