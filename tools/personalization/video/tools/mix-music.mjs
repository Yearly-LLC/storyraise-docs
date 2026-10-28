// Mix the music bed under the narration.
//
//   node video/tools/mix-music.mjs [--under 10] [--carve [--strength 0.25]]
//
// Run after build-compositions.mjs (which regenerates index.html). Needs
// video/audio/music.mp3 and ffmpeg/ffprobe on PATH (tools/storyraise-analytics/.bin).
//
// 1. Measures integrated loudness (EBU R128) of the music, and of the narration as it will
//    sound: through an ffmpeg equivalent of the voice chain (voice-chain.mjs), since the
//    chain changes the voice's level.
// 2. Sets the bed at a constant level --under LU below that voice, with a gentle fade in
//    and a fade out that lands on the final frame.
// 3. Makes room for the voice with a fixed EQ on the bed (small dips where speech lives),
//    so the music never moves in volume. Vince preferred that over the voiceover carve,
//    which ducks the bed while the voice speaks; --carve still runs the carve
//    (hyperframes-audio skill, scripts/carve.mjs) for comparison.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { voiceChainFfmpeg } from './voice-chain.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const INDEX = path.join(VIDEO, 'index.html');
const MUSIC = path.join(VIDEO, 'audio', 'music.mp3');
const BIN = path.join(TOOLS_DIR, '.bin');
const CARVE_SCRIPT = path.join(os.homedir(), '.claude', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs');

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : Number(args[i + 1]);
};
// A constant 10 LU under the processed voice. The carved mixes ran 19, 13, then 7 LU (Vince
// asked for louder twice) but ducked about 6 dB under speech; with no ducking, 10 sits
// between that mix's ducked and open levels.
const UNDER = option('under', 10);
const USE_CARVE = args.includes('--carve');
const STRENGTH = option('strength', 0.25);

if (!fs.existsSync(MUSIC)) throw new Error(`No music file at ${MUSIC}`);
if (USE_CARVE && !fs.existsSync(CARVE_SCRIPT)) throw new Error(`carve.mjs not found at ${CARVE_SCRIPT} (install the hyperframes-audio skill)`);

const ffmpeg = path.join(BIN, 'ffmpeg');
const ffprobe = path.join(BIN, 'ffprobe');

/** Integrated loudness in LUFS, optionally after a filter chain, from ffmpeg's ebur128 summary. */
function integrated(inputArgs, prefilter = '') {
    const filter = prefilter ? `${prefilter},ebur128` : 'ebur128';
    const result = execFileSync('/bin/sh', ['-c', `"${ffmpeg}" -hide_banner -nostats ${inputArgs} -af "${filter}" -f null - 2>&1 | tail -n 12`]).toString();
    const match = result.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
    if (!match) throw new Error(`could not read loudness:\n${result}`);
    return Number(match[1]);
}

// ---- 1. Loudness ----
const timeline = JSON.parse(fs.readFileSync(path.join(VIDEO, 'timeline.json'), 'utf8'));
const voFiles = timeline.scenes.filter((s) => s.audio).map((s) => path.join(VIDEO, s.audio));
const listFile = path.join(TOOLS_DIR, '.cache', 'vo-concat.txt');
fs.mkdirSync(path.dirname(listFile), { recursive: true });
fs.writeFileSync(listFile, voFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n');

const rawVoiceLufs = integrated(`-f concat -safe 0 -i "${listFile}"`);
const voiceLufs = integrated(`-f concat -safe 0 -i "${listFile}"`, voiceChainFfmpeg());
const musicLufs = integrated(`-i "${MUSIC}"`);
const musicSeconds = Number(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MUSIC]).toString());

const html = fs.readFileSync(INDEX, 'utf8');
const durationMatch = html.match(/data-composition-id="root"[^>]*data-duration="([\d.]+)"/);
if (!durationMatch) throw new Error('root data-duration not found in index.html');
const D = Number(durationMatch[1]);
if (musicSeconds < D) console.warn(`warning: music is ${musicSeconds.toFixed(1)}s but the video is ${D.toFixed(1)}s; the bed will end early`);

const gainDb = Math.max(-60, Math.min(12, Math.round((voiceLufs - UNDER - musicLufs) * 10) / 10));

// ---- 2. The bed element ----
const attr = (value) => JSON.stringify(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const round = (n) => Math.round(n * 1000) / 1000;

// Fixed dips in the bands speech needs most (weight, the body of a voice, presence).
// Static, so the bed's level never moves; the carve would ride these with the speech.
const voiceRoom = [
    { type: 'peaking', id: 'n2', label: 'Voice room (weight)', params: { frequency: 300, gain: -2, q: 1 } },
    { type: 'peaking', id: 'n3', label: 'Voice room (body)', params: { frequency: 1500, gain: -4, q: 1.2 } },
    { type: 'peaking', id: 'n4', label: 'Voice room (presence)', params: { frequency: 3000, gain: -3, q: 1.2 } },
];
const chain = { version: 1, nodes: [...(USE_CARVE ? [] : voiceRoom), { type: 'gain', id: 'n1', label: 'Bed level', params: { gain: gainDb } }] };
const automation = {
    version: 1,
    lanes: [{
        target: 'volume',
        points: [
            { t: 0, v: 0 },
            { t: 1.6, v: 1 },
            { t: round(D - 3.5), v: 1 },
            { t: round(D - 0.05), v: 0 },
        ],
    }],
};
const carveAttr = USE_CARVE ? ` data-fx-carve="${attr({ enabled: true, sources: ['voiceover'], strength: STRENGTH })}"` : '';

const bed = `<audio id="music-bed" src="audio/music.mp3" data-start="0" data-duration="${D}" data-track-index="21" data-audio-group="music" data-volume="1" data-fx-chain="${attr(chain)}" data-automation="${attr(automation)}"${carveAttr}></audio>`;
const existing = html.match(/<audio id="music-bed"[^>]*><\/audio>/);
const next = existing
    ? html.replace(existing[0], bed)
    : html.replace(/(\n\s*<script>\s*\n\s*window\.__timelines\["root"\])/, `\n  ${bed}$1`);
if (next === html) throw new Error('could not place the music bed in index.html');
fs.writeFileSync(INDEX, next);

console.log(`voice ${rawVoiceLufs} LUFS raw, ${voiceLufs} LUFS through the voice chain; music ${musicLufs} LUFS (${musicSeconds.toFixed(1)}s) -> bed gain ${gainDb} dB, constant, ${UNDER} LU under the voice`);

// ---- 3. Voiceover carve (optional) ----
if (USE_CARVE) {
    const out = execFileSync(process.execPath, [CARVE_SCRIPT, '--comp', INDEX, '--bed', 'music-bed', '--strength', String(STRENGTH), '--core', TOOLS_DIR], {
        env: { ...process.env, PATH: `${BIN}:${process.env.PATH}` },
    }).toString();
    console.log(out.trim());
} else {
    console.log('carve: off (static voice-room EQ instead, so the bed holds a steady level)');
}
