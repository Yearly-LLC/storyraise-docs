// ElevenLabs Music bed for the walkthrough video.
//
//   node --env-file=<.env with ELEVENLABS_API_KEY> video/tools/music.mjs test
//   node --env-file=<...> video/tools/music.mjs generate [--seconds 156]
//
// test      10 seconds into .cache/music-test.mp3, to confirm the key may use Music
//           and to hear the direction before paying for the full length.
// generate  The full bed into video/audio/music.mp3 (length defaults to the timeline
//           plus a short tail). build-compositions.mjs mixes it in quietly under the voice.
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS_DIR } from '../../scripts/lib/identity.mjs';

const VIDEO = path.join(TOOLS_DIR, 'video');
const PROMPT = [
    'Warm, hopeful underscore for a nonprofit software walkthrough video.',
    'Soft felt piano and gentle plucked guitar over light airy pads, a subtle pulse, minimal percussion, around 92 BPM.',
    'Optimistic and calm, never dramatic. Instrumental only, no vocals.',
    'Leaves room for a narrator: sparse midrange, no melodic lead competing with speech.',
    'A soft opening swell and a clean, resolved ending.',
].join(' ');

const [command, ...rest] = process.argv.slice(2);
const option = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? null : rest[i + 1];
};

async function compose(seconds, out) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error('ELEVENLABS_API_KEY is not set (pass --env-file).');
    const resp = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
            prompt: PROMPT,
            music_length_ms: Math.round(seconds * 1000),
            model_id: 'music_v1',
            force_instrumental: true,
        }),
    });
    if (!resp.ok) throw new Error(`ElevenLabs Music ${resp.status}: ${(await resp.text()).slice(0, 400)}`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
    console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${seconds}s requested)`);
}

if (command === 'test') {
    await compose(10, path.join(TOOLS_DIR, '.cache', 'music-test.mp3'));
} else if (command === 'generate') {
    const timeline = JSON.parse(fs.readFileSync(path.join(VIDEO, 'timeline.json'), 'utf8'));
    if (timeline.estimated) throw new Error('Generate the narration first so the music matches the real length.');
    const seconds = Number(option('seconds')) || Math.ceil(timeline.duration + 1.5);
    await compose(seconds, path.join(VIDEO, 'audio', 'music.mp3'));
} else {
    throw new Error('Use: music.mjs test | generate [--seconds N]');
}
