// Captions and chapters for the landing page's <video>.
//
//   node video/tools/build-captions.mjs
//
// Reads the word timings in timeline.json and writes WebVTT captions (at most
// two lines of 42 characters, six seconds, breaking at sentence ends) plus a
// chapters track built from the scene titles.
import fs from 'node:fs';
import path from 'node:path';
import { SITE_DIR, TOOLS_DIR } from '../../scripts/lib/identity.mjs';

const timeline = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, 'video', 'timeline.json'), 'utf8'));
const MEDIA = path.join(SITE_DIR, 'media');
const MAX_LINE = 42;
const MAX_LINES = 2;
const MAX_SECONDS = 6;

function stamp(seconds) {
    const ms = Math.round(seconds * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

/** Wrap words into at most MAX_LINES lines of MAX_LINE characters, or return null if they don't fit. */
function wrap(words) {
    const lines = [''];
    for (const w of words) {
        const line = lines[lines.length - 1];
        if (!line) lines[lines.length - 1] = w.text;
        else if (line.length + 1 + w.text.length <= MAX_LINE) lines[lines.length - 1] = `${line} ${w.text}`;
        else if (lines.length < MAX_LINES) lines.push(w.text);
        else return null;
    }
    return lines;
}

const cues = [];
for (const scene of timeline.scenes) {
    let group = [];
    const flush = () => {
        if (!group.length) return;
        cues.push({ start: group[0].start, end: group[group.length - 1].end, lines: wrap(group) });
        group = [];
    };
    for (const word of scene.words) {
        const candidate = [...group, word];
        if (group.length && (!wrap(candidate) || word.end - group[0].start > MAX_SECONDS)) flush();
        group.push(word);
        if (/[.?!:]$/.test(word.text)) flush();
    }
    flush();
}

// Hold each caption until the next begins (or 0.6s), so text doesn't flicker between phrases.
cues.forEach((cue, i) => {
    const next = cues[i + 1];
    cue.end = next ? Math.min(Math.max(cue.end + 0.6, cue.end), next.start - 0.01) : cue.end + 0.6;
});

fs.mkdirSync(MEDIA, { recursive: true });
fs.writeFileSync(path.join(MEDIA, 'storyraise-analytics-tour.en.vtt'),
    'WEBVTT\n\n' + cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.lines.join('\n')}\n`).join('\n'));

const chapters = timeline.scenes.map((s, i) => {
    const next = timeline.scenes[i + 1];
    const start = i === 0 ? 0 : s.start + timeline.transition / 2;
    const end = next ? next.start + timeline.transition / 2 : timeline.duration;
    return `${s.id}\n${stamp(start)} --> ${stamp(end)}\n${s.title}\n`;
});
fs.writeFileSync(path.join(MEDIA, 'chapters.en.vtt'), 'WEBVTT\n\n' + chapters.join('\n'));

console.log(`${cues.length} captions, ${chapters.length} chapters${timeline.estimated ? ' (from ESTIMATED timing)' : ''}`);
