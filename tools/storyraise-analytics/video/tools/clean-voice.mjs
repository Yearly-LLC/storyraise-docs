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
// The takes' noise floor measured about -43 to -44 dB, strongest near 100 Hz.
const DENOISE = 'afftdn=nr=10:nf=-44:tn=1';

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
    execFileSync(FFMPEG, ['-hide_banner', '-v', 'error', '-y', '-i', source, '-af', DENOISE, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
    console.log(`  ${scene.id}: ${path.basename(out)}`);
}

// Clean copies of takes that were replaced or cut.
for (const file of fs.readdirSync(VO)) {
    if (file.endsWith('.clean.mp3') && !wanted.has(file)) {
        fs.unlinkSync(path.join(VO, file));
        console.log(`  removed stale ${file}`);
    }
}

fs.writeFileSync(settingsFile, JSON.stringify({
    filter: DENOISE,
    note: 'Noise reduction applied to each take before the voice chain; chosen by Vince in an A/B listen, 2026-09-10.',
}, null, 2) + '\n');
