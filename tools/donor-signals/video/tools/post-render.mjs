// Check a finished render and publish it to the landing page's media folder.
//
//   node video/tools/post-render.mjs [renders/storyraise-analytics-tour.mp4] [--poster-at 36]
//
// 1. Probes the file (ffprobe): H.264 + yuv420p video, AAC audio, 1920x1080, and a
//    duration within 0.15s of the timeline.
// 2. Makes sure the moov atom comes before mdat (so browsers can start playing and
//    seeking before the whole file downloads); remuxes with +faststart if not.
// 3. Writes the poster (1920x1080 JPEG) and the Open Graph card (1200x630 PNG) from a
//    frame, then copies the MP4 to storyraise-analytics/media/.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { SITE_DIR, TOOLS_DIR } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const BIN = path.join(TOOLS_DIR, '.bin');
const MEDIA = path.join(SITE_DIR, 'media');
const args = process.argv.slice(2);
const input = path.resolve(VIDEO, args.find((a) => !a.startsWith('--') && !/^\d/.test(a)) || 'renders/storyraise-analytics-tour.mp4');
const timeline = JSON.parse(fs.readFileSync(path.join(VIDEO, 'timeline.json'), 'utf8'));
// Default poster: the frame at 7 seconds, the "Storyraise Analytics" title card (Vince's pick).
const posterFlag = args.indexOf('--poster-at');
const posterAt = posterFlag !== -1 ? Number(args[posterFlag + 1]) : 7;

const ffprobe = (file) => JSON.parse(execFileSync(path.join(BIN, 'ffprobe'), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };

// ---- 1. Streams ----
const probe = ffprobe(input);
const video = probe.streams.find((s) => s.codec_type === 'video');
const audio = probe.streams.find((s) => s.codec_type === 'audio');
const duration = Number(probe.format.duration);
const expected = timeline.duration + 0.8; // build-compositions adds a 0.8s tail
if (!video || video.codec_name !== 'h264') fail(`video codec is ${video && video.codec_name}, expected h264`);
if (video && video.pix_fmt !== 'yuv420p') fail(`pixel format is ${video.pix_fmt}, expected yuv420p`);
if (video && (video.width !== 1920 || video.height !== 1080)) fail(`size is ${video.width}x${video.height}`);
if (!audio) fail('no audio stream');
else if (audio.codec_name !== 'aac') fail(`audio codec is ${audio.codec_name}, expected aac`);
if (Math.abs(duration - expected) > 0.15) fail(`duration ${duration.toFixed(2)}s, timeline says ${expected.toFixed(2)}s`);
console.log(`streams: ${video && video.codec_name} ${video && video.pix_fmt} ${video && `${video.width}x${video.height}`}, ${audio && audio.codec_name}, ${duration.toFixed(2)}s, ${(fs.statSync(input).size / 1048576).toFixed(1)} MB`);

// ---- 2. Loudness: web video plays around -16 LUFS ----
// The narration arrives quiet (about -28 LUFS) and the mix keeps it that way, so the
// published file is normalized with a two-pass loudnorm. The picture is copied, not
// re-encoded; the relationship between voice and music is untouched.
const TARGET = { I: -16, TP: -1.5, LRA: 11 };
const measureArgs = ['-hide_banner', '-nostats', '-i', input, '-vn', '-af', `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`, '-f', 'null', '-'];
const measureLog = execFileSync('/bin/sh', ['-c', `"${path.join(BIN, 'ffmpeg')}" ${measureArgs.map((a) => `'${a}'`).join(' ')} 2>&1`]).toString();
const measured = JSON.parse(measureLog.slice(measureLog.lastIndexOf('{'), measureLog.lastIndexOf('}') + 1));
const normalized = input.replace(/\.mp4$/, '.normalized.mp4');
execFileSync(path.join(BIN, 'ffmpeg'), [
    '-y', '-v', 'error', '-i', input, '-c:v', 'copy',
    '-af', `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`,
    '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', normalized,
]);
console.log(`loudness: ${measured.input_i} LUFS -> ${TARGET.I} LUFS (true peak ${measured.input_tp} -> <= ${TARGET.TP} dBTP)`);

// ---- 3. Faststart ----
function atomOrder(file) {
    const fd = fs.openSync(file, 'r');
    const header = Buffer.alloc(16);
    const order = [];
    let offset = 0;
    const size = fs.statSync(file).size;
    while (offset < size && order.length < 20) {
        fs.readSync(fd, header, 0, 16, offset);
        let atomSize = header.readUInt32BE(0);
        const type = header.toString('latin1', 4, 8);
        if (atomSize === 1) atomSize = Number(header.readBigUInt64BE(8));
        if (atomSize < 8) break;
        order.push(type);
        offset += atomSize;
    }
    fs.closeSync(fd);
    return order;
}
let output = normalized;
const order = atomOrder(normalized);
if (order.indexOf('moov') > order.indexOf('mdat')) {
    output = normalized.replace(/\.mp4$/, '.faststart.mp4');
    execFileSync(path.join(BIN, 'ffmpeg'), ['-y', '-v', 'error', '-i', normalized, '-c', 'copy', '-movflags', '+faststart', output]);
    console.log('remuxed with +faststart');
} else {
    console.log('faststart: moov already precedes mdat');
}
const finalLog = execFileSync('/bin/sh', ['-c', `"${path.join(BIN, 'ffmpeg')}" -hide_banner -nostats -i "${output}" -vn -af ebur128=peak=true -f null - 2>&1 | tail -n 14`]).toString();
console.log(`published loudness: ${(finalLog.match(/I:\s*(-?[\d.]+) LUFS/) || [])[1]} LUFS, true peak ${(finalLog.match(/Peak:\s*(-?[\d.]+) dBFS/) || [])[1]} dBFS`);

// ---- 4. Poster, OG card, copy ----
fs.mkdirSync(MEDIA, { recursive: true });
const frame = path.join(TOOLS_DIR, '.cache', 'poster-frame.png');
execFileSync(path.join(BIN, 'ffmpeg'), ['-y', '-v', 'error', '-ss', String(posterAt), '-i', output, '-frames:v', '1', frame]);
await sharp(frame).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(MEDIA, 'storyraise-analytics-tour-poster.jpg'));
await sharp(frame).resize(1200, 630, { fit: 'cover', position: 'centre' }).png({ compressionLevel: 9 }).toFile(path.join(MEDIA, 'og-analytics.png'));
fs.copyFileSync(output, path.join(MEDIA, 'storyraise-analytics-tour.mp4'));

for (const f of ['storyraise-analytics-tour.mp4', 'storyraise-analytics-tour-poster.jpg', 'og-analytics.png', 'storyraise-analytics-tour.en.vtt', 'chapters.en.vtt']) {
    const file = path.join(MEDIA, f);
    console.log(`  media/${f}: ${fs.existsSync(file) ? `${(fs.statSync(file).size / 1024).toFixed(0)} KB` : 'MISSING'}`);
}
if (process.exitCode) console.error('Render has problems; fix them before committing the media.');
