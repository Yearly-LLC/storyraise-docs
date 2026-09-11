// Loop a supplied music bed to cover the whole video and encode it for the mix.
//
//   node video/tools/prepare-music.mjs [path/to/source.wav]
//
// The source is a short loop, so this repeats it past the video's length (the
// mix trims and fades the end). If the loop's end already meets its start (same
// level, no sample jump) the repeats are joined directly; otherwise each join gets
// an 80 ms crossfade so there is no click. Writes video/audio/music.mp3 plus
// music.source.json recording where it came from.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const BIN = path.join(TOOLS_DIR, '.bin');
const ffmpeg = path.join(BIN, 'ffmpeg');
const ffprobe = path.join(BIN, 'ffprobe');
const source = path.resolve(process.argv[2] || path.join(os.homedir(), 'Desktop', 'Seamy_Demo_Loop.wav'));
const out = path.join(VIDEO, 'audio', 'music.mp3');

const timeline = JSON.parse(fs.readFileSync(path.join(VIDEO, 'timeline.json'), 'utf8'));
const target = Math.ceil(timeline.duration + 0.8 + 3); // video length, its tail, and a margin

const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=sample_rate,channels', '-of', 'json', source]).toString());
const loopSeconds = Number(probe.format.duration);
const rate = Number(probe.streams[0].sample_rate);
const channels = Number(probe.streams[0].channels);

// ---- Seam: does the end of the loop flow straight into its start? ----
const pcm = execFileSync(ffmpeg, ['-v', 'error', '-i', source, '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', String(channels), '-ar', String(rate), '-'], { maxBuffer: 1 << 30 });
const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
const frames = samples.length / channels;
const win = Math.round(rate * 0.01);
const rms = (from) => {
    let sum = 0;
    for (let i = from; i < from + win; i++) {
        for (let c = 0; c < channels; c++) {
            const v = samples[i * channels + c] / 32768;
            sum += v * v;
        }
    }
    return Math.sqrt(sum / (win * channels));
};
const seamJump = Math.max(...Array.from({ length: channels }, (_, c) => Math.abs(samples[(frames - 1) * channels + c] - samples[c]) / 32768));
const seamLevelDb = 20 * Math.log10((rms(frames - win) + 1e-9) / (rms(0) + 1e-9));
const seamless = seamJump < 0.05 && Math.abs(seamLevelDb) < 3;
const loops = Math.ceil(target / loopSeconds) + (seamless ? 0 : 1);

fs.mkdirSync(path.dirname(out), { recursive: true });
if (seamless) {
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-stream_loop', String(loops - 1), '-i', source, '-t', String(target), '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
} else {
    const inputs = [];
    for (let i = 0; i < loops; i++) inputs.push('-i', source);
    let filter = '';
    let last = '[0:a]';
    for (let i = 1; i < loops; i++) {
        filter += `${last}[${i}:a]acrossfade=d=0.08:c1=tri:c2=tri[x${i}];`;
        last = `[x${i}]`;
    }
    filter += `${last}atrim=0:${target}[out]`;
    execFileSync(ffmpeg, ['-y', '-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
}

const record = {
    source: path.basename(source),
    suppliedBy: 'Vince, downloaded from ElevenLabs Music (2026-09-10)',
    licenseNote: 'Confirm the ElevenLabs plan covers commercial use of generated music.',
    loopSeconds,
    loops,
    joined: seamless ? 'direct (seamless loop)' : '80 ms crossfades',
    seamJump: Math.round(seamJump * 10000) / 10000,
    seamLevelDb: Math.round(seamLevelDb * 10) / 10,
    seconds: target,
};
fs.writeFileSync(path.join(VIDEO, 'audio', 'music.source.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`music: ${loopSeconds}s loop x ${loops}, ${record.joined} -> ${target}s ${path.relative(TOOLS_DIR, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
