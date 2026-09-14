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

let html = fs.readFileSync(PAGE, 'utf8');
html = fill(html, 'TRANSCRIPT', transcript);
html = fill(html, 'LD', `  <script type="application/ld+json">\n${JSON.stringify(videoLd, null, 2)}\n  </script>`);
fs.writeFileSync(PAGE, html);
console.log(`filled transcript (${spoken.length} scenes) and structured data${iso ? ` (${iso})` : ''}`);
