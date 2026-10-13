// Reduce the steady room tone in the narration takes.
//
//   node video/tools/clean-voice.mjs [--force]
//
// Chosen by Vince in a loudness-matched side-by-side listen (2026-09-10): noise reduction
// on each take, then the voice chain on the voiceover bus (EQ, gentle compression,
// limiter). HyperFrames has no denoise effect, so this runs before the render and writes
// <take>.clean.mp3 next to each original. build-timeline.mjs uses the clean copy when it
// exists; the originals stay untouched. Re-runs only when a take or the filter changes.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';
import { enabledScenes } from './script.mjs';

const VO = path.join(TOOLS_DIR, 'video', 'audio', 'vo');
const FFMPEG = path.join(TOOLS_DIR, '.bin', 'ffmpeg');
/*
    Measured on the takes (2026-09-24): the floor between words sits at -47 dB and the
    body of the speech at -27, so only 20 dB apart. The old `afftdn=nr=10:nf=-44` moved
    that floor by half a decibel, which is nothing. The bus compressor then closes the
    gap further and the publish gain adds about 12 dB on top, so what is left between
    the words is audible air with the odd mouth noise in it.

    Three stages, in this order:
      adeclick  short broadband bursts (lip and mouth noise), which a sample-level scan
                finds none of as true impulses but which sit in the gaps all the same.
      afftdn    the steady room tone, at a strength that actually bites and with the
                measured floor rather than a guessed one.
      compand   a downward expander, not a gate. Speech above -36 dB is untouched; the
                floor at -47 is pushed down about 14 dB, on a soft knee with a slow
                release so it never chatters between syllables. The hard gate Vince
                rejected in 2026-09 closed on 18% of speech; this does not close at all.
*/
const DENOISE = [
    'adeclick',
    'afftdn=nr=24:nf=-47:tn=1',
    'compand=attacks=0.003:decays=0.25:points=-90/-104|-47/-61|-36/-36|0/0:soft-knee=8',
].join(',');

/*
    Trim the tail the model leaves on. The takes came back with between 0.36s and 1.22s
    of silence after the last word, and build-timeline adds its own tail and the next
    scene's lead on top, so the gap between one spoken word and the next ran from 1.3s
    to 2.1s and varied by scene. A line that ends and then hangs reads as unfinished.

    Measured and cut rather than filtered: ffmpeg's silenceremove, reversed onto the
    tail, left some takes untouched even where the tail sat well under its threshold.
    Finding the last window above -45 dB and cutting a tenth of a second past it is
    predictable, and it is the same measurement used to check the result.
*/
const TAIL_KEEP = 0.12;
const TAIL_FLOOR_DB = -45;

function speechEndsAt(wav) {
    const buf = fs.readFileSync(wav);
    let off = 12;
    let rate = 16000;
    let dataAt = -1;
    let dataLen = 0;
    while (off + 8 <= buf.length) {
        const id = buf.toString('latin1', off, off + 4);
        const size = buf.readUInt32LE(off + 4);
        if (id === 'fmt ') rate = buf.readUInt32LE(off + 12);
        if (id === 'data') { dataAt = off + 8; dataLen = size; break; }
        off += 8 + size + (size % 2);
    }
    if (dataAt < 0) throw new Error(`no data chunk in ${wav}`);
    const n = Math.min(dataLen, buf.length - dataAt) >> 1;
    const win = Math.round(0.02 * rate);
    const limit = 10 ** (TAIL_FLOOR_DB / 20) * 32768;
    let last = 0;
    for (let i = 0; i + win <= n; i += win) {
        let sum = 0;
        for (let k = 0; k < win; k += 1) { const v = buf.readInt16LE(dataAt + (i + k) * 2); sum += v * v; }
        if (Math.sqrt(sum / win) > limit) last = i + win;
    }
    return { end: last / rate, duration: n / rate };
}

const force = process.argv.includes('--force');
const manifest = JSON.parse(fs.readFileSync(path.join(VO, 'manifest.json'), 'utf8'));
const settingsFile = path.join(VO, 'clean.json');
const previous = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')).filter : null;
const filterChanged = previous !== DENOISE;

const wanted = new Set();
for (const scene of enabledScenes()) {
    const take = manifest[scene.id];
    if (!take) continue;
    const source = path.join(VO, take.mp3);
    const out = source.replace(/\.mp3$/, '.clean.mp3');
    wanted.add(path.basename(out));
    if (!force && !filterChanged && fs.existsSync(out)) {
        console.log(`  ${scene.id}: cached`);
        continue;
    }
    const probe = `${out}.probe.wav`;
    execFileSync(FFMPEG, ['-hide_banner', '-v', 'error', '-y', '-i', source, '-af', DENOISE, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', probe]);
    const { end, duration } = speechEndsAt(probe);
    fs.unlinkSync(probe);
    const keep = Math.min(duration, end + TAIL_KEEP);
    execFileSync(FFMPEG, ['-hide_banner', '-v', 'error', '-y', '-i', source, '-af', DENOISE, '-t', keep.toFixed(3), '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
    console.log(`  ${scene.id}: ${path.basename(out)}  ${duration.toFixed(2)}s -> ${keep.toFixed(2)}s`);
}

// Clean copies of takes that were replaced or cut.
for (const file of fs.readdirSync(VO)) {
    if (file.endsWith('.clean.mp3') && !wanted.has(file)) {
        fs.unlinkSync(path.join(VO, file));
        console.log(`  removed stale ${file}`);
    }
}

fs.writeFileSync(settingsFile, JSON.stringify({
    filter: `${DENOISE} | tail cut to ${TAIL_KEEP}s past the last window above ${TAIL_FLOOR_DB} dB`,
    note: 'Noise reduction applied to each take before the voice chain; chosen by Vince in an A/B listen, 2026-09-10.',
}, null, 2) + '\n');
