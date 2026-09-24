// Fill the generated regions of donor-signals/index.html.
//
//   node scripts/build-landing.mjs
//
// The page is hand-written, but three regions come from source files so the
// copy has one home: the metric cards (annotations.json), the transcript
// (video/script/vo-script.json), and the video's structured data (the rendered
// timeline, once it exists). Each lives between <!-- AUTO:NAME --> markers.
import fs from 'node:fs';
import path from 'node:path';
import { SITE_DIR, TOOLS_DIR } from './lib/identity.mjs';
import { enabledScenes, parseScene } from '../video/tools/script.mjs';

const PAGE = path.join(SITE_DIR, 'index.html');
const annotations = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'annotations.json'), 'utf8'));
const script = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, 'video', 'script', 'vo-script.json'), 'utf8'));
const timelineFile = path.join(TOOLS_DIR, 'video', 'timeline.json');
const timeline = fs.existsSync(timelineFile) ? JSON.parse(fs.readFileSync(timelineFile, 'utf8')) : null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const GROUPS = [
    { title: 'The week in one screen', ids: ['health', 'headline', 'tiles'] },
    { title: 'Who needs you, and why now', ids: ['at-risk-tile', 'row', 'views'] },
    { title: 'What you do about it', ids: ['actions'] },
    { title: 'The month, not the week', ids: ['giving-health'] },
];

function metricCard(stop) {
    const keep = stop.keepInMind && stop.keepInMind.length
        ? `\n          <details class="sra-keep"><summary>Keep in mind</summary><ul>${stop.keepInMind.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></details>`
        : '';
    // The detail sits in an open <details>; analytics.js closes it on small screens
    // so the grid stays scannable on a phone without hiding anything.
    return `        <article class="sra-metric" id="metric-${stop.id}">
          <h4>${esc(stop.title)}</h4>
          <p class="sra-metric-tells">${esc(stop.tells)}</p>
          <details class="sra-more" open>
            <summary>Why it matters and what to do next</summary>
            <p><strong>Why it matters.</strong> ${esc(stop.why)}</p>
            <p><strong>What to do next.</strong> ${esc(stop.next)}</p>${keep}
          </details>
          <div class="sra-metric-actions">
            <button type="button" class="sra-link-btn" data-demo-step="${stop.id}">See it in the demo</button>
${stop.kb ? `\n            <a href="${esc(stop.kb.href)}">${esc(stop.kb.label)}</a>` : ''}
          </div>
        </article>`;
}

const byId = Object.fromEntries(annotations.stops.map((s) => [s.id, s]));
const covered = new Set(GROUPS.flatMap((g) => g.ids));
const missing = annotations.stops.filter((s) => !covered.has(s.id)).map((s) => s.id);
if (missing.length) throw new Error(`annotation stops not placed in a group: ${missing.join(', ')}`);

const metrics = GROUPS.map((group) => `      <div class="sra-metric-group">
        <h3 class="sra-group-title">${esc(group.title)}</h3>
        <div class="sra-metric-grid">
${group.ids.map((id) => metricCard(byId[id])).join('\n')}
        </div>
      </div>`).join('\n');

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
            '@id': 'https://docs.storyraise.com/donor-signals/#page',
            url: 'https://docs.storyraise.com/donor-signals/',
            name: 'Donor Signals',
            isPartOf: { '@id': 'https://docs.storyraise.com/#site' },
            inLanguage: 'en-US',
        },
        {
            '@type': 'VideoObject',
            name: 'Donor Signals: a guided tour',
            description: 'A short tour of Donor Signals: how Storyraise scores every donor you have, groups them by what they need next, and gives you something to make for each group.',
            thumbnailUrl: 'https://docs.storyraise.com/donor-signals/media/donor-signals-tour-poster.jpg',
            contentUrl: 'https://docs.storyraise.com/donor-signals/media/donor-signals-tour.mp4',
            uploadDate: (timeline && timeline.renderedAt) || '2026-09-24',
            ...(iso ? { duration: iso } : {}),
            publisher: { '@id': 'https://storyraise.com/#org' },
        },
    ],
};

function fill(html, name, body, { optional = false } = {}) {
    const re = new RegExp(`(<!-- AUTO:${name} -->)[\\s\\S]*?(<!-- /AUTO:${name} -->)`);
    if (!re.test(html)) {
        if (optional) return html;
        throw new Error(`missing AUTO:${name} markers in ${PAGE}`);
    }
    return html.replace(re, `$1\n${body}\n      $2`);
}

let html = fs.readFileSync(PAGE, 'utf8');
// The metric cards section is off this page too (matching Analytics, Vince 2026-09-10); the tour still
// carries that copy. Restoring the section's AUTO:METRICS markers brings the cards back.
const hasMetrics = html.includes('<!-- AUTO:METRICS -->');
html = fill(html, 'METRICS', metrics, { optional: true });
html = fill(html, 'TRANSCRIPT', transcript);
html = fill(html, 'LD', `  <script type="application/ld+json">\n${JSON.stringify(videoLd, null, 2)}\n  </script>`);
fs.writeFileSync(PAGE, html);
console.log(`${hasMetrics ? `filled metrics (${covered.size} cards)` : 'metrics section not on page'}, transcript (${spoken.length} scenes), structured data${iso ? ` (${iso})` : ''}`);
