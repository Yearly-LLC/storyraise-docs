/*
    Rebuild the music bed as a bar-aligned loop.

      node video/tools/build-music-loop.mjs [--source audio/music.source.mp3] [--seconds 132]

    The bed Vince supplied repeats every 29.920s, but the track runs at 125 BPM, so a bar
    is 1.920s and 29.920s is 15.583 bars. Every repeat therefore lands over half a bar off
    the beat grid, and the rhythm stumbles: what you hear as the music skipping. The same
    file is under the Analytics and Automated donor journeys videos.

    The fix is to loop on the grid instead. Searching whole-bar lengths against the
    waveform, the strongest match is 8 bars (15.360s) starting at 6.250s, the track's
    own eight-bar pattern. This writes a bed built from that segment, each copy advancing
    exactly 15.360s with a one-beat equal-power crossfade over the join. The segment read
    is one beat longer than the loop so the crossfade overlaps real material rather than
    shortening the advance, which would put the grid back out.
*/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const BIN = path.join(TOOLS_DIR, '.bin');
const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
};

const BPM = 125;
const BAR = (60 / BPM) * 4;      // 1.920s
const BEAT = 60 / BPM;           // 0.480s
const LOOP_BARS = 8;
const LOOP = LOOP_BARS * BAR;    // 15.360s
const START = 6.25;              // the downbeat the pattern starts on
const XFADE = BEAT;              // one beat of equal-power crossfade over each join
const SR = 48000;
const CH = 2;

const source = path.resolve(VIDEO, option('source', 'audio/music.source.mp3'));
const outMp3 = path.join(VIDEO, 'audio', 'music.mp3');
const seconds = Number(option('seconds', 132));
if (!fs.existsSync(source)) throw new Error(`no source track at ${source}`);

const ffmpeg = path.join(BIN, 'ffmpeg');
const raw = execFileSync(ffmpeg, [
    '-v', 'error', '-i', source, '-ss', String(START), '-t', String(LOOP + XFADE),
    '-ac', String(CH), '-ar', String(SR), '-f', 's16le', '-',
], { maxBuffer: 1 << 28 });
const seg = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const segFrames = seg.length / CH;
const loopFrames = Math.round(LOOP * SR);
const fadeFrames = Math.round(XFADE * SR);
if (segFrames < loopFrames + fadeFrames) throw new Error('source is too short for one loop plus the crossfade');

const totalFrames = Math.ceil(seconds * SR);
const out = new Float32Array(totalFrames * CH);
const copies = Math.ceil((totalFrames - fadeFrames) / loopFrames);
for (let c = 0; c < copies; c += 1) {
    const at = c * loopFrames;
    for (let f = 0; f < segFrames; f += 1) {
        const dst = at + f;
        if (dst >= totalFrames) break;
        // Equal power over the join: the copy fades in while the one before fades out.
        const w = c > 0 && f < fadeFrames ? Math.sin((f / fadeFrames) * (Math.PI / 2)) : 1;
        const fade = c > 0 && f < fadeFrames ? Math.cos((f / fadeFrames) * (Math.PI / 2)) : 0;
        for (let ch = 0; ch < CH; ch += 1) {
            const i = dst * CH + ch;
            out[i] = out[i] * fade + seg[f * CH + ch] * w;
        }
    }
}

const pcm = Buffer.alloc(totalFrames * CH * 2);
for (let i = 0; i < out.length; i += 1) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out[i]))), i * 2);
execFileSync(ffmpeg, [
    '-y', '-v', 'error', '-f', 's16le', '-ar', String(SR), '-ac', String(CH), '-i', 'pipe:0',
    '-c:a', 'libmp3lame', '-b:a', '192k', outMp3,
], { input: pcm, maxBuffer: 1 << 28 });

console.log(`bed: ${copies} copies of ${LOOP_BARS} bars (${LOOP.toFixed(3)}s at ${BPM} BPM) from ${START}s, ${XFADE.toFixed(3)}s equal-power joins -> ${(totalFrames / SR).toFixed(1)}s`);
