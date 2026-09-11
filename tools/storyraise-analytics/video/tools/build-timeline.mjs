// Turn the narration into the video's clock.
//
//   node video/tools/build-timeline.mjs
//
// "The voice is the clock": each scene lasts as long as its narration (plus a
// short lead-in and tail), and every [[cue:name]] becomes an absolute time the
// visuals land on. Without generated audio yet, timings are estimated from the
// text so compositions can be built and previewed; rerun after `tts.mjs generate`.
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { enabledScenes, parseScene, readScript } from './script.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const MANIFEST = path.join(VIDEO, 'audio', 'vo', 'manifest.json');
const OUT = path.join(VIDEO, 'timeline.json');

const LEAD = 0.35;        // silence at the top of a scene before the voice starts
const TAIL = 0.55;        // breath after the last word
const TRANSITION = 0.4;   // scenes overlap by this much
const CHARS_PER_SECOND = 14.5; // estimate used until real audio exists

const script = readScript();
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

/** Group per-character timing into words (split on whitespace). */
function wordsFrom(alignment) {
    const words = [];
    let current = null;
    alignment.characters.forEach((ch, i) => {
        if (/\s/.test(ch)) { current = null; return; }
        if (!current) {
            current = { text: '', start: alignment.character_start_times_seconds[i], end: 0 };
            words.push(current);
        }
        current.text += ch;
        current.end = alignment.character_end_times_seconds[i];
    });
    return words;
}

function estimate(ttsText) {
    const alignment = { characters: [], character_start_times_seconds: [], character_end_times_seconds: [] };
    Array.from(ttsText).forEach((ch, i) => {
        alignment.characters.push(ch);
        alignment.character_start_times_seconds.push(i / CHARS_PER_SECOND);
        alignment.character_end_times_seconds.push((i + 1) / CHARS_PER_SECOND);
    });
    return alignment;
}

let clock = 0;
let estimated = false;
const scenes = enabledScenes(script).map((scene, index) => {
    const { captionText, ttsText, cues } = parseScene(scene.text, script.respell);
    const take = manifest[scene.id];
    let alignment;
    let audio = null;
    if (take && fs.existsSync(path.join(VIDEO, 'audio', 'vo', take.alignment))) {
        const data = JSON.parse(fs.readFileSync(path.join(VIDEO, 'audio', 'vo', take.alignment), 'utf8'));
        if (data.ttsText !== ttsText) {
            throw new Error(`${scene.id}: the script changed since its audio was generated. Run tts.mjs generate --only ${scene.id}.`);
        }
        alignment = data.alignment;
        if (alignment.characters.join('') !== ttsText) {
            throw new Error(`${scene.id}: alignment characters do not match the spoken text.`);
        }
        // Prefer the noise-reduced copy from clean-voice.mjs. It is the same take at the same
        // length, so the alignment still holds.
        const clean = take.mp3.replace(/\.mp3$/, '.clean.mp3');
        audio = fs.existsSync(path.join(VIDEO, 'audio', 'vo', clean)) ? `audio/vo/${clean}` : `audio/vo/${take.mp3}`;
    } else {
        alignment = estimate(ttsText);
        estimated = true;
    }

    const ends = alignment.character_end_times_seconds;
    const voiceLength = ends[ends.length - 1];
    const duration = Math.max(scene.minDuration || 0, LEAD + voiceLength + TAIL);
    const start = index === 0 ? 0 : clock - TRANSITION;
    clock = start + duration;
    const voStart = start + LEAD;

    const at = (char) => {
        const starts = alignment.character_start_times_seconds;
        return voStart + (char < starts.length ? starts[char] : voiceLength);
    };

    const captionWords = captionText.split(/\s+/);
    const spokenWords = wordsFrom(alignment);
    if (captionWords.length !== spokenWords.length) {
        throw new Error(`${scene.id}: ${captionWords.length} caption words but ${spokenWords.length} spoken words (respellings must keep the word count).`);
    }

    return {
        id: scene.id,
        title: scene.title,
        start: round(start),
        duration: round(duration),
        voStart: round(voStart),
        voLength: round(voiceLength),
        audio,
        cues: Object.fromEntries(cues.map((c) => [c.name, round(at(c.char))])),
        words: spokenWords.map((w, i) => ({ text: captionWords[i], start: round(voStart + w.start), end: round(voStart + w.end) })),
    };
});

function round(n) { return Math.round(n * 1000) / 1000; }

const timeline = {
    estimated,
    fps: 30,
    width: 1920,
    height: 1080,
    transition: TRANSITION,
    duration: round(clock),
    scenes,
};
fs.writeFileSync(OUT, JSON.stringify(timeline, null, 2) + '\n');
console.log(`${estimated ? 'ESTIMATED ' : ''}timeline: ${timeline.duration.toFixed(1)}s across ${scenes.length} scenes`);
scenes.forEach((s) => console.log(`  ${s.id} ${s.start.toFixed(2)}s +${s.duration.toFixed(2)}s  ${s.title}`));
